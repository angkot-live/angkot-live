package httpapi

import (
	"angkot-live/api/internal/platform"
	"encoding/json"
	"github.com/gorilla/websocket"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func fixtureServer(t *testing.T) *Server {
	t.Helper()
	auth := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/auth/v1/user" {
			if r.Header.Get("Authorization") != "Bearer driver-token" {
				w.WriteHeader(401)
				_, _ = w.Write([]byte(`{"message":"invalid"}`))
				return
			}
			_, _ = w.Write([]byte(`{"id":"driver"}`))
			return
		}
		var cmd struct {
			Action string `json:"p_action"`
		}
		_ = json.NewDecoder(r.Body).Decode(&cmd)
		switch cmd.Action {
		case "me":
			_, _ = w.Write([]byte(`{"id":"driver","name":"Test Driver","role":"pengemudi","driverVerification":"disetujui"}`))
		case "assignment":
			_, _ = w.Write([]byte(`{"vehicleId":"vehicle","routeId":"out","vehicle":{"plate":"D TEST"}}`))
		case "requests":
			_, _ = w.Write([]byte(`[]`))
		default:
			_, _ = w.Write([]byte(`{"ok":true}`))
		}
	}))
	t.Cleanup(auth.Close)
	path := filepath.Join(t.TempDir(), "routes.json")
	_ = os.WriteFile(path, []byte(`{"routes":[{"id":"out","code":"T","name":"Test","polyline":[[0,0],[0,0.02]]}]}`), 0600)
	s, err := New(platform.New(auth.URL, "service-secret", "anon-key"), path, "http://localhost:5173")
	if err != nil {
		t.Fatal(err)
	}
	return s
}
func TestPublicAndProtectedHTTP(t *testing.T) {
	s := fixtureServer(t)
	h := s.Handler()
	for _, path := range []string{"/api/health", "/api/routes", "/api/vehicles"} {
		r := httptest.NewRequest("GET", path, nil)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != 200 {
			t.Fatalf("%s: %d %s", path, w.Code, w.Body.String())
		}
		if w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("API response cacheable")
		}
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/api/me", nil))
	if w.Code != 401 {
		t.Fatalf("Guest profile allowed: %d", w.Code)
	}
	w = httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/api/auth/register", strings.NewReader(`{"role":"admin","name":"Attacker"}`))
	r.Header.Set("Content-Type", "application/json")
	h.ServeHTTP(w, r)
	if w.Code == 200 {
		t.Fatal("Public admin registration accepted")
	}
	w = httptest.NewRecorder()
	r = httptest.NewRequest("GET", "/api/routes", nil)
	r.Header.Set("Origin", "https://attacker.example")
	h.ServeHTTP(w, r)
	if w.Code != 403 {
		t.Fatal("Cross origin allowed")
	}
}

func TestLocalDemoAndExplicitOrigins(t *testing.T) {
	s := fixtureServer(t)
	check := func(want int, origin string) {
		t.Helper()
		req := httptest.NewRequest("GET", "/api/demo/config", nil)
		if origin != "" {
			req.Header.Set("Origin", origin)
		}
		out := httptest.NewRecorder()
		s.Handler().ServeHTTP(out, req)
		if out.Code != want {
			t.Fatalf("wanted %d got %d: %s", want, out.Code, out.Body.String())
		}
		if strings.Contains(out.Body.String(), "service-secret") {
			t.Fatal("Service role exposed")
		}
	}
	check(404, "")
	s.DemoLogin = true
	s.Origins = []string{"https://192.168.1.7:5180"}
	check(200, "https://192.168.1.7:5180")
	check(403, "https://other.example")
	s.DB.URL = "https://project.supabase.co"
	check(404, "")
}
func TestWebSocketAuthGPSAndPublicSnapshot(t *testing.T) {
	s := fixtureServer(t)
	server := httptest.NewServer(s.Handler())
	defer server.Close()
	dial := func(token string) *websocket.Conn {
		t.Helper()
		conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/api/ws", http.Header{"Origin": []string{"http://localhost:5173"}})
		if err != nil {
			t.Fatal(err)
		}
		_ = conn.WriteJSON(Row{"type": "auth", "token": token})
		return conn
	}
	driver := dial("driver-token")
	defer driver.Close()
	var message Row
	if err := driver.ReadJSON(&message); err != nil || message["type"] != "snapshot" {
		t.Fatalf("Driver snapshot: %v %v", message, err)
	}
	if _, err := s.duty(platform.User{ID: "driver", Name: "Test", Role: "pengemudi", Verification: "disetujui"}, Row{"mode": "narik", "session": "driver-session"}); err != nil {
		t.Fatal(err)
	}
	_ = driver.WriteJSON(Row{"type": "driver:position", "id": "fix-one", "session": "driver-session", "position": []float64{0, 0.001}, "accuracy": 10, "sampledAt": time.Now().UnixMilli(), "sequence": 1})
	for {
		if err := driver.ReadJSON(&message); err != nil {
			t.Fatal(err)
		}
		if message["id"] == "fix-one" {
			if message["type"] != "ack" {
				t.Fatalf("GPS rejected: %v", message)
			}
			break
		}
	}
	guest := dial("")
	defer guest.Close()
	if err := guest.ReadJSON(&message); err != nil {
		t.Fatal(err)
	}
	data := message["data"].(map[string]any)
	vehicles := data["vehicles"].([]any)
	if len(vehicles) != 1 {
		t.Fatalf("Real GPS not published: %+v", data)
	}
	if _, ok := data["nearby"]; ok {
		t.Fatal("Guest received passenger locations")
	}
	v := vehicles[0].(map[string]any)
	if _, ok := v["DriverID"]; ok {
		t.Fatal("Private driver identifier exposed")
	}
	_ = guest.WriteJSON(Row{"type": "driver:position", "id": "attack", "session": "driver-session"})
	for {
		if err := guest.ReadJSON(&message); err != nil {
			t.Fatal(err)
		}
		if message["id"] == "attack" {
			if message["type"] != "error" {
				t.Fatal("Guest published GPS")
			}
			break
		}
	}
}

func TestPrivateObjectPathsRejectEncodedTraversal(t *testing.T) {
	valid := "33333333-3333-4333-8333-333333333333/44444444-4444-4444-8444-444444444444"
	if !validObjectPath(valid) {
		t.Fatal("Generated private path rejected")
	}
	for _, path := range []string{"../private", valid + "?token=bad", strings.Replace(valid, "/", "/%2e%2e/", 1), "https://example.com/object", valid + "/extra"} {
		if validObjectPath(path) {
			t.Fatalf("Unsafe object path accepted: %s", path)
		}
	}
}

func TestSimulatorRequiresExplicitLocalDemo(t *testing.T) {
	s := fixtureServer(t)
	u := platform.User{ID: "driver", Name: "Test Driver", Role: "pengemudi", Verification: "disetujui"}
	in := Row{"mode": "narik", "session": "test-simulator-session", "telemetrySource": "simulation"}
	if _, err := s.duty(u, in); err == nil {
		t.Fatal("simulator enabled without demo flag")
	}
	s.DemoLogin = true
	if _, err := s.duty(u, in); err != nil {
		t.Fatal(err)
	}
	if s.Tracking.Duty(u.ID).Vehicle.TelemetrySource != "simulation" {
		t.Fatal("missing source label")
	}
	s.DB.URL = "https://remote.example.test"
	if s.localDemoEnabled() {
		t.Fatal("remote Supabase permits simulator")
	}
	if _, err := s.duty(u, in); err == nil {
		t.Fatal("simulator allowed on remote backend")
	}
}

type trackingTransport func(*http.Request) (*http.Response, error)

func (f trackingTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestFirstSnapshotOfReplacementDutyIsPersisted(t *testing.T) {
	s := fixtureServer(t)
	s.DemoLogin = true
	posts := 0
	s.DB.HTTP.Transport = trackingTransport(func(r *http.Request) (*http.Response, error) {
		if r.URL.Path == "/rest/v1/vehicle_positions" {
			posts++
		}
		return http.DefaultTransport.RoundTrip(r)
	})
	now := time.Now()
	s.Tracking.Now = func() time.Time { return now }
	u := platform.User{ID: "driver", Role: "pengemudi", Verification: "disetujui"}
	change := func(mode, source string) {
		t.Helper()
		if _, err := s.duty(u, Row{"mode": mode, "session": "snapshot-session", "telemetrySource": source}); err != nil {
			t.Fatal(err)
		}
	}
	publish := func(sequence int, source string) {
		t.Helper()
		if err := s.event(u, Row{"type": "driver:position", "position": []any{0, 0.001}, "accuracy": 10, "sampledAt": now.UnixMilli(), "sequence": sequence, "session": "snapshot-session", "telemetrySource": source}); err != nil {
			t.Fatal(err)
		}
	}
	change("narik", "gps")
	publish(1, "gps")
	if posts != 1 {
		t.Fatal("initial GPS history missing")
	}
	now = now.Add(3 * time.Second)
	publish(2, "gps")
	if posts != 1 {
		t.Fatal("same-shift history was not throttled")
	}
	change("offline", "gps")
	change("narik", "simulation")
	publish(1, "simulation")
	if posts != 2 {
		t.Fatal("first simulation history was suppressed by the previous GPS shift")
	}
}
