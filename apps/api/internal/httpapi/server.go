package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"angkot-live/api/internal/geo"
	"angkot-live/api/internal/platform"
	"angkot-live/api/internal/tracking"
	"github.com/gofiber/adaptor/v2"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gorilla/websocket"
)

type Server struct {
	DatabaseRoutes        bool
	routesMu              sync.Mutex
	routesFetched         time.Time
	cachedRoutes          []geo.Route
	DB                    *platform.Client
	Tracking              *tracking.Engine
	Routes                []geo.Route
	Origin                string
	Origins               []string
	PublicSupabaseURL     string
	DemoLogin             bool
	trackingMu            sync.Mutex
	authorizationsFetched time.Time
	pendingTransitions    []tracking.Transition
	snapshotMu            sync.Mutex
	lastSnapshot          map[string]int64
}
type Row map[string]any

func ID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	h := hex.EncodeToString(b)
	return h[:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:]
}
func New(db *platform.Client, dataPath, origin string) (*Server, error) {
	if dataPath == "" {
		return &Server{DB: db, Tracking: tracking.New(), Origin: origin, lastSnapshot: map[string]int64{}}, nil
	}
	b, err := os.ReadFile(dataPath)
	if err != nil {
		return nil, err
	}
	var data struct {
		Routes []geo.Route `json:"routes"`
	}
	if err = json.Unmarshal(b, &data); err != nil {
		return nil, err
	}
	if len(data.Routes) == 0 {
		return nil, errors.New("Dataset trayek kosong")
	}
	for i := range data.Routes {
		data.Routes[i].IsActive = true
	}
	return &Server{DB: db, Tracking: tracking.New(), Routes: data.Routes, Origin: origin, lastSnapshot: map[string]int64{}}, nil
}
func (s *Server) route(id string) (geo.Route, error) {
	rows, err := s.catalog(true)
	if err != nil {
		return geo.Route{}, err
	}
	for _, r := range rows {
		if r.ID == id {
			return r, nil
		}
	}
	return geo.Route{}, errors.New("Trayek tidak ditemukan")
}
func stringValue(v any) string { x, _ := v.(string); return x }
func number(v any) float64     { x, _ := v.(float64); return x }
func point(v any) geo.Point {
	b, _ := json.Marshal(v)
	var p geo.Point
	_ = json.Unmarshal(b, &p)
	return p
}
func command(s *Server, u platform.User, action string, in any) (any, error) {
	var out any
	err := s.DB.Command(u.ID, action, in, &out)
	return out, err
}
func (s *Server) actor(c *fiber.Ctx) (platform.User, error) {
	return s.DB.User(strings.TrimPrefix(c.Get("Authorization"), "Bearer "))
}
func (s *Server) allowedOrigin(origin string) bool {
	if origin == s.Origin {
		return true
	}
	for _, allowed := range s.Origins {
		if origin == allowed {
			return true
		}
	}
	return false
}
func (s *Server) Handler() http.Handler {
	app := fiber.New(fiber.Config{BodyLimit: 6 << 20, DisableStartupMessage: true, ErrorHandler: func(c *fiber.Ctx, err error) error {
		status := 400
		if strings.Contains(err.Error(), "telah berubah") || strings.Contains(err.Error(), "memiliki referensi") || strings.Contains(err.Error(), "perjalanan aktif sebelum mengubah") {
			status = 409
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}})
	app.Use(recover.New())
	app.Use(limiter.New(limiter.Config{Max: 240, Expiration: time.Minute}))
	app.Use(func(c *fiber.Ctx) error {
		origin := c.Get("Origin")
		if origin != "" && !s.allowedOrigin(origin) {
			return c.Status(403).JSON(fiber.Map{"error": "Origin ditolak"})
		}
		c.Set("Cache-Control", "no-store")
		c.Set("Access-Control-Allow-Origin", s.Origin)
		if origin != "" {
			c.Set("Access-Control-Allow-Origin", origin)
		}
		c.Set("Vary", "Origin")
		c.Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		c.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if c.Method() == "OPTIONS" {
			return c.SendStatus(204)
		}
		return c.Next()
	})
	app.Get("/healthz", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"ok": true})
	})
	app.Get("/api/health", func(c *fiber.Ctx) error {
		rows, err := s.catalog(false)
		if err != nil {
			return err
		}
		return c.JSON(fiber.Map{"ok": true, "routes": len(rows)})
	})
	app.Get("/api/demo/config", func(c *fiber.Ctx) error {
		if !s.localDemoEnabled() {
			return c.SendStatus(404)
		}
		return c.JSON(Row{"accounts": []Row{{"role": "penumpang", "email": "penumpang@demo.angkot.local"}, {"role": "pengemudi", "email": "pengemudi@demo.angkot.local"}, {"role": "admin", "email": "admin@demo.angkot.local"}}, "password": "AngkotDemo123!", "trackingSimulator": true})
	})
	app.Post("/api/auth/:action", limiter.New(limiter.Config{Max: 10, Expiration: time.Minute}), s.auth)
	app.Get("/api/routes", func(c *fiber.Ctx) error {
		rows, err := s.catalog(c.Query("includeInactive") == "true")
		if err != nil {
			return err
		}
		return c.JSON(rows)
	})
	app.Get("/api/routes/:id", func(c *fiber.Ctx) error {
		r, err := s.route(c.Params("id"))
		if err != nil {
			return err
		}
		return c.JSON(r)
	})
	app.Get("/api/tracking/config", func(c *fiber.Ctx) error {
		return c.JSON(Row{"publishMs": 3000, "staleMs": tracking.StaleMS, "removeMs": tracking.RemoveMS, "dutyTimeoutMs": tracking.LeaseMS, "maxAccuracy": tracking.MaxAccuracy, "simulationEnabled": s.localDemoEnabled()})
	})
	app.Get("/api/vehicles", func(c *fiber.Ctx) error {
		if _, err := s.catalog(false); err != nil {
			return err
		}
		if err := s.refreshTracking(); err != nil {
			return err
		}
		return c.JSON(s.Tracking.Vehicles())
	})
	app.Get("/api/search/route", s.search)
	app.Get("/api/stats/public", func(c *fiber.Ctx) error {
		stats, err := s.statistics("")
		if err != nil {
			return err
		}
		return c.JSON(stats)
	})
	for _, path := range []string{"/api/admin/routes", "/api/admin/routes/:id"} {
		app.All(path, func(c *fiber.Ctx) error {
			u, err := s.actor(c)
			if err != nil {
				return c.SendStatus(401)
			}
			return s.manageRoute(c, u)
		})
	}
	app.Get("/api/admin/dashboard", func(c *fiber.Ctx) error {
		u, err := s.actor(c)
		if err != nil {
			return c.SendStatus(401)
		}
		if u.Role != "admin" {
			return c.SendStatus(403)
		}
		stats, err := s.statistics(u.ID)
		if err != nil {
			return err
		}
		return c.JSON(stats)
	})

	app.All("/api/*", func(c *fiber.Ctx) error {
		u, err := s.actor(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": err.Error()})
		}
		if c.Path() == "/api/uploads" && c.Method() == "POST" {
			return s.upload(c, u)
		}
		if c.Path() == "/api/documents/url" && c.Method() == "POST" {
			return s.documentURL(c, u)
		}
		in := Row{}
		if len(c.Body()) > 0 {
			if err := json.Unmarshal(c.Body(), &in); err != nil {
				return errors.New("JSON tidak valid")
			}
		}
		var out any
		switch c.Method() + " " + c.Path() {
		case "GET /api/preferences":
			out, err = command(s, u, "preferences", in)
		case "PATCH /api/preferences":
			out, err = command(s, u, "preferences_update", in)
		case "GET /api/me":
			out, err = command(s, u, "me", Row{})
		case "PATCH /api/me":
			out, err = command(s, u, "profile", in)
		case "GET /api/driver/onboarding", "GET /api/driver/assignment", "GET /api/driver/verification":
			out, err = command(s, u, "onboarding", Row{})
		case "PATCH /api/driver/onboarding":
			out, err = command(s, u, "save_onboarding", in)
		case "POST /api/driver/submissions":
			out, err = command(s, u, "submit", in)
		case "GET /api/admin/drivers":
			out, err = command(s, u, "applicants", Row{})
		case "PATCH /api/admin/drivers/verify":
			out, err = command(s, u, "verify", in)
			if err == nil {
				s.Tracking.Stop(stringValue(in["id"]))
			}
		case "GET /api/driver/duty":
			if u.Role != "pengemudi" {
				return c.SendStatus(403)
			}
			out = s.Tracking.Duty(u.ID)
		case "POST /api/driver/duty", "PATCH /api/driver/duty":
			out, err = s.duty(u, in)
		case "GET /api/passenger/requests/current":
			out, err = command(s, u, "request_current", Row{})
		case "POST /api/passenger/requests":
			out, err = s.request(u, in)
		case "POST /api/passenger/requests/cancel":
			out, err = command(s, u, "cancel", in)
		case "POST /api/driver/requests/respond":
			out, err = s.respond(u, in)
		case "POST /api/passenger/trips":
			out, err = s.board(u, in)
		case "GET /api/passenger/trips/active":
			out, err = command(s, u, "trip_active", Row{})
		case "GET /api/passenger/trips":
			out, err = command(s, u, "trips", Row{})
		case "POST /api/passenger/trips/complete":
			out, err = s.complete(u, in)
		case "GET /api/reports", "GET /api/admin/reports":
			out, err = command(s, u, "reports", Row{})
		case "POST /api/reports":
			out, err = s.report(u, in)
		case "PATCH /api/admin/reports":
			out, err = command(s, u, "report_update", in)
		case "GET /api/messages":
			out, err = command(s, u, "messages", Row{})
		case "POST /api/messages/read":
			out, err = command(s, u, "message_read", in)
		case "GET /api/driver/dashboard":
			out, err = command(s, u, "dashboard", Row{})
		default:
			return c.Status(404).JSON(fiber.Map{"error": "Endpoint tidak ditemukan"})
		}
		if err != nil {
			return err
		}
		return c.JSON(out)
	})
	mux := http.NewServeMux()
	mux.HandleFunc("/api/ws", s.ws)
	mux.Handle("/", adaptor.FiberApp(app))
	return mux
}
func (s *Server) auth(c *fiber.Ctx) error {
	in := Row{}
	if err := c.BodyParser(&in); err != nil {
		return errors.New("Data akun tidak valid")
	}
	var path string
	var body any
	switch c.Params("action") {
	case "register":
		role := stringValue(in["role"])
		if role != "penumpang" && role != "pengemudi" {
			return errors.New("Role pendaftaran tidak valid")
		}
		if len(stringValue(in["password"])) < 8 || len(stringValue(in["name"])) < 3 || len(stringValue(in["phone"])) < 9 {
			return errors.New("Lengkapi nama, telepon dan password minimal 8 karakter")
		}
		path = "/auth/v1/signup"
		body = Row{"email": in["email"], "password": in["password"], "data": Row{"role": role, "name": in["name"], "phone": in["phone"]}}
	case "login":
		path = "/auth/v1/token?grant_type=password"
		body = Row{"email": in["email"], "password": in["password"]}
	case "refresh":
		path = "/auth/v1/token?grant_type=refresh_token"
		body = Row{"refresh_token": in["refresh_token"]}
	case "logout":
		token := strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
		if _, err := s.DB.User(token); err != nil {
			return c.SendStatus(401)
		}
		if err := s.DB.Request("POST", "/auth/v1/logout?scope=global", token, Row{}, nil); err != nil {
			return err
		}
		return c.JSON(Row{"ok": true})
	case "recover":
		path = "/auth/v1/recover?redirect_to=" + platform.Escape(s.Origin+"/reset-password")
		body = Row{"email": in["email"]}
	default:
		return c.SendStatus(404)
	}
	var out any
	if err := s.DB.Request("POST", path, s.DB.Anon, body, &out); err != nil {
		return err
	}
	return c.JSON(out)
}
func (s *Server) duty(u platform.User, in Row) (any, error) {
	s.trackingMu.Lock()
	defer s.trackingMu.Unlock()
	if u.Role != "pengemudi" || u.Verification != "disetujui" {
		return nil, errors.New("Pengemudi belum disetujui")
	}
	session := stringValue(in["session"])
	mode := stringValue(in["mode"])
	source := stringValue(in["telemetrySource"])
	if source == "" {
		source = "gps"
	}
	if source != "gps" && source != "simulation" {
		return nil, errors.New("Sumber posisi tidak valid")
	}
	if source == "simulation" && !s.localDemoEnabled() {
		return nil, errors.New("Simulasi hanya tersedia pada demo Supabase lokal")
	}
	in["telemetrySource"] = source
	if len(session) < 8 || len(session) > 100 {
		return nil, errors.New("Sesi tugas tidak valid")
	}
	var assignment struct {
		VehicleID string `json:"vehicleId"`
		RouteID   string `json:"routeId"`
		Vehicle   struct {
			Plate string `json:"plate"`
		} `json:"vehicle"`
	}
	if err := s.DB.Command(u.ID, "assignment", Row{}, &assignment); err != nil {
		return nil, err
	}
	r, err := s.route(assignment.RouteID)
	if err == nil && !r.IsActive && mode != "offline" {
		return nil, errors.New("Trayek tidak aktif")
	}
	if err != nil {
		return nil, err
	}
	// Validate session ownership before committing a duty transition.
	old := s.Tracking.Duty(u.ID)
	if old.Session != "" && old.Session != session && (old.Mode == "narik" || old.Mode == "ngetem") && mode != "offline" {
		return nil, errors.New("Sesi tugas aktif pada perangkat lain")
	}
	if mode != "narik" && mode != "ngetem" && mode != "istirahat" && mode != "offline" {
		return nil, errors.New("Status tidak valid")
	}
	if old.Vehicle != nil && (old.Mode == "narik" || old.Mode == "ngetem") && (mode == "narik" || mode == "ngetem") && old.Vehicle.TelemetrySource != source {
		return nil, errors.New("Pilih Offline sebelum mengganti sumber posisi")
	}
	in["distanceKm"] = old.DistanceKm
	if _, err = command(s, u, "duty", in); err != nil {
		return nil, err
	}
	s.authorizationsFetched = time.Time{}
	err = s.Tracking.SetMode(u.ID, session, mode, tracking.Vehicle{TelemetrySource: source, ID: assignment.VehicleID, Plate: assignment.Vehicle.Plate, DriverID: u.ID, DriverName: u.Name, RouteID: r.ID, RouteCode: r.Code, RouteName: r.Name, DriverVerified: true}, r)
	if err == nil && (mode == "narik" || mode == "ngetem") && old.Mode != "narik" && old.Mode != "ngetem" {
		// A new shift/source always gets an initial history sample. The 30s
		// throttle applies within a shift, not across GPS/simulation sessions.
		s.snapshotMu.Lock()
		delete(s.lastSnapshot, u.ID)
		s.snapshotMu.Unlock()
	}
	return s.Tracking.Duty(u.ID), err
}
func validateFix(in Row) (tracking.Fix, error) {
	if coords, ok := in["position"].([]any); !ok || len(coords) != 2 || coords[0] == nil || coords[1] == nil {
		return tracking.Fix{}, errors.New("Koordinat GPS wajib diisi")
	}
	b, _ := json.Marshal(in)
	var f tracking.Fix
	if err := json.Unmarshal(b, &f); err != nil {
		return f, errors.New("GPS tidak valid")
	}
	if !f.Position.Valid() || f.Accuracy <= 0 || f.Accuracy > 50 || time.Now().UnixMilli()-f.SampledAt > 15000 || f.SampledAt > time.Now().UnixMilli()+5000 {
		return f, errors.New("Gunakan GPS perangkat yang segar dengan akurasi maksimal 50 meter")
	}
	return f, nil
}
func (s *Server) request(u platform.User, in Row) (any, error) {
	if u.Role != "penumpang" {
		return nil, errors.New("Akses penumpang diperlukan")
	}
	f, err := validateFix(in)
	if err != nil {
		return nil, err
	}
	r, err := s.route(stringValue(in["routeId"]))
	if err == nil && !r.IsActive {
		return nil, errors.New("Trayek tidak aktif")
	}
	if err != nil {
		return nil, err
	}
	p := geo.Project(f.Position, r)
	if target, ok := in["destinationPoint"]; ok && target != nil {
		coords, valid := target.([]any)
		if !valid || len(coords) != 2 || coords[0] == nil || coords[1] == nil {
			return nil, errors.New("Titik turun tidak valid")
		}
		q := point(target)
		end := geo.Project(q, r)
		if !q.Valid() || end.DistanceKm > 0.15 {
			return nil, errors.New("Titik turun tidak berada di trayek pilihan")
		}
		if end.Chain != p.Chain || end.OffsetKm < p.OffsetKm+0.02 {
			return nil, errors.New("Titik turun harus di depan titik naik pada segmen dan arah yang sama")
		}
	}
	in["pickup"] = p.Point
	in["status"] = "searching"
	if p.DistanceKm > 0.1 {
		in["status"] = "walking"
	}
	return command(s, u, "request", in)
}
func (s *Server) respond(u platform.User, in Row) (any, error) {
	var rows []Row
	if err := s.DB.Command(u.ID, "requests", Row{}, &rows); err != nil {
		return nil, err
	}
	d := s.Tracking.Duty(u.ID)
	if d.Vehicle == nil || d.Mode != "narik" && d.Mode != "ngetem" {
		return nil, errors.New("Mulai bertugas terlebih dahulu")
	}
	v := *d.Vehicle
	v.Stale = time.Now().UnixMilli()-v.LastSeen > 15000
	for _, r := range rows {
		if stringValue(r["id"]) == stringValue(in["id"]) {
			route, err := s.route(stringValue(r["route_id"]))
			if err == nil && tracking.Eligible(v, point(r["position"]), route) {
				return command(s, u, "respond", in)
			}
		}
	}
	return nil, errors.New("Penumpang tidak lagi berada dalam area layanan Anda")
}
func (s *Server) board(u platform.User, in Row) (any, error) {
	// Idempotency survives terminal request state and server restarts.
	var active Row
	if err := s.DB.Command(u.ID, "trip_active", Row{}, &active); err != nil {
		return nil, err
	}
	if active != nil && stringValue(active["request_id"]) == stringValue(in["id"]) {
		return active, nil
	}
	var req Row
	if err := s.DB.Command(u.ID, "request_current", Row{}, &req); err != nil {
		return nil, err
	}
	if stringValue(req["id"]) != stringValue(in["id"]) {
		return nil, errors.New("Permintaan tidak sesuai")
	}
	r, err := s.route(stringValue(req["route_id"]))
	if err != nil {
		return nil, err
	}
	if time.Since(parseTime(req["last_seen_at"])) > 30*time.Second {
		return nil, errors.New("Perbarui GPS sebelum konfirmasi naik")
	}
	for _, v := range s.Tracking.Vehicles() {
		if v.ID == stringValue(in["vehicleId"]) && v.RouteID == r.ID && !v.Stale && geo.Distance(v.Position, point(req["position"])) <= 0.1 {
			p := geo.Project(point(req["position"]), r)
			if p.Chain != v.Chain {
				return nil, errors.New("Kendaraan berada pada segmen berbeda")
			}
			in["offsetKm"] = v.OffsetKm
			in["chain"] = v.Chain
			return command(s, u, "board", in)
		}
	}
	return nil, errors.New("Kendaraan belum berada di dekat Anda atau GPS terputus")
}
func parseTime(v any) time.Time { t, _ := time.Parse(time.RFC3339Nano, stringValue(v)); return t }
func (s *Server) complete(u platform.User, in Row) (any, error) {
	var trips []Row
	if err := s.DB.Command(u.ID, "trips", Row{}, &trips); err != nil {
		return nil, err
	}
	for _, t := range trips {
		if stringValue(t["id"]) == stringValue(in["id"]) {
			if stringValue(t["status"]) == "completed" {
				return t, nil
			}
			distance := number(t["distance_km"])
			if time.Since(parseTime(t["last_passenger_at"])) < 30*time.Second {
				if route, err := s.route(stringValue(t["route_id"])); err == nil {
					p := geo.Project(point(t["last_passenger_position"]), route)
					if p.DistanceKm <= 0.15 && p.Chain == int(number(t["chain_index"])) {
						distance = max(distance, p.OffsetKm-number(t["start_offset_km"]))
					}
				}
			}
			for _, v := range s.Tracking.Vehicles() {
				if v.ID == stringValue(t["vehicle_id"]) && v.Chain == int(number(t["chain_index"])) && v.OffsetKm >= number(t["start_offset_km"]) {
					distance = max(distance, v.OffsetKm-number(t["start_offset_km"]))
				}
			}
			in["distanceKm"] = distance
			return command(s, u, "complete", in)
		}
	}
	return nil, errors.New("Perjalanan tidak ditemukan")
}
func (s *Server) report(u platform.User, in Row) (any, error) {
	for _, v := range asStrings(in["evidence"]) {
		if !validObjectPath(v) || !strings.HasPrefix(v, u.ID+"/") {
			return nil, errors.New("Bukti bukan milik akun ini")
		}
	}
	return command(s, u, "report", in)
}
func asStrings(v any) []string {
	b, _ := json.Marshal(v)
	var out []string
	_ = json.Unmarshal(b, &out)
	return out
}
func (s *Server) upload(c *fiber.Ctx, u platform.User) error {
	kind := c.FormValue("type")
	bucket := "driver-documents"
	if kind == "evidence" {
		if u.Role != "penumpang" {
			return c.SendStatus(403)
		}
		bucket = "report-evidence"
	} else {
		if u.Role != "pengemudi" {
			return c.SendStatus(403)
		}
		if kind != "sim" && kind != "stnk" && kind != "kir" && kind != "foto_kendaraan" && kind != "ktp" {
			return errors.New("Jenis dokumen tidak valid")
		}
	}
	file, err := c.FormFile("file")
	if err != nil {
		return errors.New("Pilih berkas")
	}
	if file.Size <= 0 || file.Size > 5<<20 {
		return errors.New("Ukuran berkas maksimal 5 MB")
	}
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	data, err := io.ReadAll(io.LimitReader(src, 5<<20+1))
	if err != nil {
		return err
	}
	mime := http.DetectContentType(data)
	if mime != "image/jpeg" && mime != "image/png" && mime != "application/pdf" {
		return errors.New("Berkas harus JPG, PNG atau PDF")
	}
	if kind == "foto_kendaraan" && mime == "application/pdf" {
		return errors.New("Foto kendaraan harus berupa JPG atau PNG")
	}
	path := u.ID + "/" + ID()
	if err = s.DB.Send("POST", "/storage/v1/object/"+bucket+"/"+path, s.DB.Key, strings.NewReader(string(data)), mime, nil); err != nil {
		return err
	}
	if bucket == "driver-documents" {
		_, err = command(s, u, "document", Row{"type": kind, "path": path, "name": file.Filename, "size": file.Size, "mime": mime, "expiresAt": c.FormValue("expiresAt")})
		if err != nil {
			_ = s.DB.Request("DELETE", "/storage/v1/object/"+bucket, s.DB.Key, Row{"prefixes": []string{path}}, nil)
			return err
		}
	}
	return c.JSON(Row{"path": path, "name": file.Filename})
}
func validObjectPath(path string) bool {
	parts := strings.Split(path, "/")
	if len(parts) != 2 {
		return false
	}
	for _, part := range parts {
		if len(part) != 36 {
			return false
		}
		for i, c := range part {
			if i == 8 || i == 13 || i == 18 || i == 23 {
				if c != '-' {
					return false
				}
			} else if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
				return false
			}
		}
	}
	return true
}
func (s *Server) documentURL(c *fiber.Ctx, u platform.User) error {
	var in struct {
		Path   string `json:"path"`
		Bucket string `json:"bucket"`
	}
	if err := c.BodyParser(&in); err != nil {
		return err
	}
	allowed := false
	if in.Bucket == "driver-documents" && u.Role == "admin" {
		allowed = true
	}
	if in.Bucket == "report-evidence" && (u.Role == "admin" || strings.HasPrefix(in.Path, u.ID+"/")) {
		allowed = true
	}
	if !allowed || !validObjectPath(in.Path) {
		return c.SendStatus(403)
	}
	var out Row
	if err := s.DB.Request("POST", "/storage/v1/object/sign/"+in.Bucket+"/"+in.Path, s.DB.Key, Row{"expiresIn": 120}, &out); err != nil {
		return err
	}
	signed := stringValue(out["signedURL"])
	base := s.PublicSupabaseURL
	if base == "" {
		base = s.DB.URL
	}
	return c.JSON(Row{"url": strings.TrimRight(base, "/") + "/storage/v1" + signed})
}
func (s *Server) search(c *fiber.Ctx) error {
	var from, to geo.Point
	if json.Unmarshal([]byte("["+c.Query("from")+"]"), &from) != nil || json.Unmarshal([]byte("["+c.Query("to")+"]"), &to) != nil || !from.Valid() || !to.Valid() {
		return errors.New("Koordinat asal dan tujuan tidak valid")
	}
	out := []Row{}
	rows, err := s.catalog(false)
	if err != nil {
		return err
	}
	for _, r := range rows {
		if plan, ok := geo.Direct(r, from, to); ok {
			out = append(out, Row{"route": r, "board": plan.Board, "alight": plan.Alight, "rideKm": plan.RideKm, "minutes": plan.Minutes, "chain": plan.Chain, "boardOffsetKm": plan.BoardOffsetKm, "alightOffsetKm": plan.AlightOffsetKm})
		}
	}

	return c.JSON(out)
}
func (s *Server) ImportRoutes() error {
	rows := []Row{}
	for _, r := range s.Routes {
		rows = append(rows, Row{"id": r.ID, "code": r.Code, "name": r.Name, "origin": r.Origin, "destination": r.Destination, "color": r.Color, "polyline": r.Polyline, "segments": r.Segments, "streets": r.Streets, "endstops": r.Endstops, "street_runs": r.StreetRuns})
	}
	// PostgREST upsert needs Prefer; use explicit request here.
	b, _ := json.Marshal(rows)
	req, _ := http.NewRequest("POST", s.DB.URL+"/rest/v1/routes?on_conflict=id", strings.NewReader(string(b)))
	req.Header.Set("apikey", s.DB.Key)
	req.Header.Set("Authorization", "Bearer "+s.DB.Key)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "resolution=merge-duplicates")
	res, err := s.DB.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 400 {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 2048))
		return fmt.Errorf("impor gagal: %s", b)
	}
	for _, r := range s.Routes {
		segments := r.Segments
		if len(segments) == 0 {
			segments = [][]geo.Point{r.Polyline}
		}
		if err := s.DB.Request("POST", "/rest/v1/rpc/sync_route_geometry", s.DB.Key, Row{"p_route": r.ID, "p_segments": segments, "p_stops": r.Endstops}, nil); err != nil {
			return err
		}
	}
	return nil
}
func (s *Server) snapshot(u platform.User) (Row, error) {
	if _, err := s.catalog(false); err != nil {
		return nil, err
	}
	if err := s.refreshTracking(); err != nil {
		return nil, err
	}
	vehicles := s.Tracking.Vehicles()
	out := Row{"vehicles": vehicles, "serverTime": time.Now().UnixMilli()}
	if u.ID == "" {
		return out, nil
	}
	if u.Role == "pengemudi" {
		d := s.Tracking.Duty(u.ID)
		out["duty"] = d
		own := []tracking.Vehicle{}
		for _, v := range vehicles {
			if v.DriverID == u.ID {
				own = append(own, v)
			}
		}
		out["vehicles"] = own
		var rows []Row
		if err := s.DB.Command(u.ID, "requests", Row{}, &rows); err != nil {
			return nil, err
		}
		nearby := []Row{}
		if d.Vehicle != nil && d.Mode != "offline" && d.Mode != "istirahat" {
			v := *d.Vehicle
			v.Stale = time.Now().UnixMilli()-v.LastSeen > 15000
			for _, r := range rows {
				route, err := s.route(stringValue(r["route_id"]))
				if err != nil {
					continue
				}
				if tracking.Eligible(v, point(r["position"]), route) && (stringValue(r["status"]) != "accepted" || stringValue(r["matched_vehicle_id"]) == v.ID) {
					nearby = append(nearby, r)
				}
			}
		}
		out["nearby"] = nearby
	}
	if u.Role == "penumpang" {
		req, err := command(s, u, "request_current", Row{})
		if err != nil {
			return nil, err
		}
		out["request"] = req
		trip, err := command(s, u, "trip_active", Row{})
		if err != nil {
			return nil, err
		}
		out["trip"] = trip
	}
	return out, nil
}
func (s *Server) ws(w http.ResponseWriter, r *http.Request) {
	if !s.allowedOrigin(r.Header.Get("Origin")) {
		http.Error(w, "Origin ditolak", 403)
		return
	}
	up := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return s.allowedOrigin(r.Header.Get("Origin")) }}
	conn, err := up.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	conn.SetReadLimit(32768)
	_ = conn.SetReadDeadline(time.Now().Add(8 * time.Second))
	var auth struct {
		Type  string `json:"type"`
		Token string `json:"token"`
	}
	if conn.ReadJSON(&auth) != nil || auth.Type != "auth" {
		return
	}
	var u platform.User
	if auth.Token != "" {
		u, err = s.DB.User(auth.Token)
		if err != nil {
			_ = conn.WriteJSON(Row{"type": "auth:error", "error": err.Error()})
			return
		}
	}
	_ = conn.SetReadDeadline(time.Now().Add(45 * time.Second))
	conn.SetPongHandler(func(string) error { return conn.SetReadDeadline(time.Now().Add(45 * time.Second)) })
	done := make(chan struct{})
	events := make(chan Row, 16)
	go func() {
		defer close(done)
		for {
			var in Row
			if conn.ReadJSON(&in) != nil {
				return
			}
			_ = conn.SetReadDeadline(time.Now().Add(45 * time.Second))
			select {
			case events <- in:
			default:
				return
			}
		}
	}()
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	refresh := time.NewTicker(15 * time.Second)
	defer refresh.Stop()
	send := func(v any) error {
		_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
		return conn.WriteJSON(v)
	}
	if snap, err := s.snapshot(u); err == nil {
		if send(Row{"type": "snapshot", "data": snap}) != nil {
			return
		}
	} else {
		_ = send(Row{"type": "error", "error": err.Error()})
		return
	}
	for {
		select {
		case <-done:
			return
		case <-refresh.C:
			if u.ID != "" {
				fresh, err := s.DB.User(auth.Token)
				if err != nil {
					_ = send(Row{"type": "auth:error", "error": err.Error()})
					return
				}
				if fresh.Verification != "disetujui" && u.Role == "pengemudi" {
					s.Tracking.Stop(u.ID)
				}
				u = fresh
			}
		case <-ticker.C:
			snap, err := s.snapshot(u)
			if err != nil {
				if send(Row{"type": "error", "error": err.Error()}) != nil {
					return
				}
			} else if send(Row{"type": "snapshot", "data": snap}) != nil {
				return
			}
			if err := conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(time.Second)); err != nil {
				return
			}
		case in := <-events:
			err := s.event(u, in)
			response := Row{"type": "ack", "id": in["id"], "serverTime": time.Now().UnixMilli(), "sampledAt": in["sampledAt"]}
			if err != nil {
				response["type"] = "error"
				response["error"] = err.Error()
			}
			if send(response) != nil {
				return
			}
		}
	}
}
func (s *Server) event(u platform.User, in Row) error {
	if u.ID == "" {
		return errors.New("Login untuk membagikan GPS")
	}
	switch stringValue(in["type"]) {
	case "driver:position":
		if u.Role != "pengemudi" || u.Verification != "disetujui" {
			return errors.New("Pengemudi belum disetujui")
		}
		f, err := validateFix(in)
		if err != nil {
			return err
		}
		if f.TelemetrySource == "simulation" && !s.localDemoEnabled() {
			return errors.New("Simulasi hanya tersedia pada demo Supabase lokal")
		}
		s.trackingMu.Lock()
		defer s.trackingMu.Unlock()
		if err = s.refreshTrackingLocked(); err != nil {
			return err
		}
		err = s.Tracking.Position(u.ID, stringValue(in["session"]), f)
		if err == nil {
			s.persist(u, f, s.Tracking.Duty(u.ID))
		}
		return err
	case "passenger:position":
		if u.Role != "penumpang" {
			return errors.New("Akses penumpang diperlukan")
		}
		f, err := validateFix(in)
		if err != nil {
			return err
		}
		var req Row
		if err = s.DB.Command(u.ID, "request_current", Row{}, &req); err != nil {
			return err
		}
		if req == nil || stringValue(req["status"]) != "walking" && stringValue(req["status"]) != "searching" && stringValue(req["status"]) != "accepted" {
			_, err = command(s, u, "trip_position", Row{"position": f.Position})
			return err
		}
		if time.Since(parseTime(req["last_seen_at"])) < 2*time.Second {
			return nil
		}
		route, err := s.route(stringValue(req["route_id"]))
		if err != nil {
			return err
		}
		p := geo.Project(f.Position, route)
		_, err = command(s, u, "request_position", Row{"id": req["id"], "position": f.Position, "accuracy": f.Accuracy, "pickup": p.Point, "arrived": p.DistanceKm <= 0.1})
		return err
	case "ngetem:answer":
		s.trackingMu.Lock()
		defer s.trackingMu.Unlock()
		if err := s.refreshTrackingLocked(); err != nil {
			return err
		}
		if err := s.Tracking.Answer(u.ID, stringValue(in["session"]), stringValue(in["promptId"]), in["yes"] == true); err != nil {
			return err
		}
		if in["yes"] == true {
			d := s.Tracking.Duty(u.ID)
			_, err := command(s, u, "duty", Row{"mode": d.Mode, "session": d.Session, "distanceKm": d.DistanceKm, "telemetrySource": d.Vehicle.TelemetrySource})
			return err
		}
		return nil
	case "ping":
		return nil
	default:
		return errors.New("Event tidak dikenal")
	}
}
func (s *Server) persist(u platform.User, f tracking.Fix, d tracking.Duty) {
	now := time.Now().UnixMilli()
	s.snapshotMu.Lock()
	if now-s.lastSnapshot[u.ID] < 30000 {
		s.snapshotMu.Unlock()
		return
	}
	s.lastSnapshot[u.ID] = now
	s.snapshotMu.Unlock()
	if d.Vehicle == nil || d.Mode == "offline" || d.Mode == "istirahat" {
		return
	}
	v := d.Vehicle
	row := Row{"telemetry_source": v.TelemetrySource, "vehicle_id": v.ID, "driver_id": u.ID, "position": v.Position, "raw_position": f.Position, "accuracy": f.Accuracy, "speed_kph": f.Speed, "sampled_at": time.UnixMilli(f.SampledAt).UTC().Format(time.RFC3339Nano)}
	err := s.DB.Request("POST", "/rest/v1/vehicle_positions", s.DB.Key, row, nil)
	if err == nil {
		_, err = command(s, u, "progress", Row{"offsetKm": v.OffsetKm, "chain": v.Chain, "distanceKm": d.DistanceKm, "session": d.Session})
	}
	if err != nil {
		log.Printf("GPS/progress snapshot gagal: %v", err)
		s.snapshotMu.Lock()
		if s.lastSnapshot[u.ID] == now {
			s.lastSnapshot[u.ID] = 0
		}
		s.snapshotMu.Unlock()
	}
}

func (s *Server) localDemoEnabled() bool {
	u, err := url.Parse(s.DB.URL)
	return s.DemoLogin && err == nil && (u.Hostname() == "127.0.0.1" || u.Hostname() == "localhost" || u.Hostname() == "::1")
}
