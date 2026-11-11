package tracking

import (
	"angkot-live/api/internal/geo"
	"testing"
	"time"
)

func TestRouteEditsReconcileDuty(t *testing.T) {
	e := New()
	r := geo.Route{ID: "out", Name: "Before", Code: "A", IsActive: true, Polyline: []geo.Point{{-6.9, 107.6}, {-6.9, 107.62}}}
	if err := e.SetMode("driver", "session-1", "narik", Vehicle{ID: "vehicle", RouteID: r.ID, RouteName: r.Name}, r); err != nil {
		t.Fatal(err)
	}
	renamed := r
	renamed.Name = "After"
	e.ReconcileRoutes([]geo.Route{renamed})
	if duty := e.Duty("driver"); duty.Mode != "narik" || duty.Vehicle.RouteName != "After" {
		t.Fatal("metadata edit lost duty or retained old label")
	}
	changed := renamed
	changed.Polyline = []geo.Point{{-6.8, 107.6}, {-6.8, 107.62}}
	e.ReconcileRoutes([]geo.Route{changed})
	if e.Duty("driver").Mode != "offline" {
		t.Fatal("geometry edit retained old GPS session")
	}
	if err := e.SetMode("driver", "session-2", "narik", Vehicle{ID: "vehicle", RouteID: r.ID}, r); err != nil {
		t.Fatal(err)
	}
	r.IsActive = false
	e.ReconcileRoutes([]geo.Route{r})
	if e.Duty("driver").Mode != "offline" {
		t.Fatal("inactive direction retained duty")
	}
}

func setup() (*Engine, *time.Time, geo.Route) {
	now := time.Unix(1000000, 0)
	e := New()
	e.Now = func() time.Time { return now }
	r := geo.Route{ID: "out", Polyline: []geo.Point{{0, 0}, {0, 0.02}}}
	_ = e.SetMode("d", "session-one", "narik", Vehicle{ID: "v", DriverID: "d", RouteID: "out", DriverVerified: true}, r)
	return e, &now, r
}
func fix(now time.Time, seq int64, p geo.Point) Fix {
	return Fix{Position: p, Accuracy: 10, SampledAt: now.UnixMilli(), Sequence: seq, Speed: 0}
}
func TestGPSLifecycle(t *testing.T) {
	e, now, r := setup()
	if len(e.Vehicles()) != 0 {
		t.Fatal("Duty became visible before GPS")
	}
	if err := e.Position("d", "wrong-session", fix(*now, 1, geo.Point{0, 0})); err == nil {
		t.Fatal("Other session published")
	}
	if err := e.Position("d", "session-one", fix(*now, 1, geo.Point{0, 0})); err != nil {
		t.Fatal(err)
	}
	if len(e.Vehicles()) != 1 {
		t.Fatal("Vehicle not visible")
	}
	*now = now.Add(16 * time.Second)
	if !e.Vehicles()[0].Stale {
		t.Fatal("Not marked stale")
	}
	*now = now.Add(15 * time.Second)
	if len(e.Vehicles()) != 0 {
		t.Fatal("Stale marker not removed")
	}
	if err := e.SetMode("d", "session-one", "istirahat", Vehicle{}, r); err != nil {
		t.Fatal(err)
	}
	if e.Position("d", "session-one", fix(*now, 2, geo.Point{0, 0})) == nil {
		t.Fatal("GPS accepted during rest")
	}
}
func TestNgetemPromptAndSilence(t *testing.T) {
	e, now, _ := setup()
	for i := int64(1); i <= 31; i++ {
		if err := e.Position("d", "session-one", fix(*now, i, geo.Point{0, 0})); err != nil {
			t.Fatal(err)
		}
		*now = now.Add(3 * time.Second)
	}
	d := e.Duty("d")
	if d.Prompt == nil {
		t.Fatal("No prompt after 90s")
	}
	*now = now.Add(12 * time.Second)
	e.Tick()
	if e.Duty("d").Mode != "ngetem" {
		t.Fatal("No automatic ngetem at deadline")
	}
}
func TestPromptNoAndMovement(t *testing.T) {
	e, now, _ := setup()
	for i := int64(1); i <= 31; i++ {
		_ = e.Position("d", "session-one", fix(*now, i, geo.Point{0, 0}))
		*now = now.Add(3 * time.Second)
	}
	prompt := e.Duty("d").Prompt
	if prompt == nil {
		t.Fatal("Prompt missing")
	}
	if err := e.Answer("d", "session-one", prompt.ID, false); err != nil {
		t.Fatal(err)
	}
	if e.Duty("d").Prompt != nil || e.Duty("d").Mode != "narik" {
		t.Fatal("No answer did not reset observation")
	}
	if err := e.Answer("d", "session-one", prompt.ID, true); err == nil {
		t.Fatal("Old prompt accepted")
	}
	if err := e.Position("d", "session-one", fix(*now, 32, geo.Point{0, 0.0003})); err != nil {
		t.Fatal(err)
	}
	if e.Duty("d").Prompt != nil {
		t.Fatal("Moving driver prompted")
	}
}
func TestDisconnectIsNotStationary(t *testing.T) {
	e, now, _ := setup()
	_ = e.Position("d", "session-one", fix(*now, 1, geo.Point{0, 0}))
	*now = now.Add(91 * time.Second)
	if err := e.Position("d", "session-one", fix(*now, 2, geo.Point{0, 0})); err != nil {
		t.Fatal(err)
	}
	if e.Duty("d").Prompt != nil {
		t.Fatal("Missing GPS counted as stationary")
	}
}
func TestInvalidGPSAndSessionConflict(t *testing.T) {
	e, now, r := setup()
	f := fix(*now, 1, geo.Point{0, 0})
	f.Accuracy = 80
	if e.Position("d", "session-one", f) == nil {
		t.Fatal("Inaccurate GPS accepted")
	}
	f = fix(*now, 1, geo.Point{0, 0})
	_ = e.Position("d", "session-one", f)
	*now = now.Add(3 * time.Second)
	if e.Position("d", "session-one", f) == nil {
		t.Fatal("Repeated old fix accepted")
	}
	if e.SetMode("d", "session-two", "narik", Vehicle{}, r) == nil {
		t.Fatal("Second session took over silently")
	}
	if e.SetMode("d", "session-two", "offline", Vehicle{ID: "v"}, r) != nil {
		t.Fatal("Explicit offline failed")
	}
	if len(e.Vehicles()) != 0 {
		t.Fatal("Offline marker visible")
	}
}
func TestVisibilityRequiresDirectionChainAndFreshness(t *testing.T) {
	_, now, r := setup()
	v := Vehicle{ID: "v", RouteID: r.ID, DriverVerified: true, Position: geo.Point{0, 0}, Chain: 0}
	if !Eligible(v, geo.Point{0, 0.005}, r) {
		t.Fatal("Valid passenger hidden")
	}
	v.RouteID = "return"
	if Eligible(v, geo.Point{0, 0.005}, r) {
		t.Fatal("Wrong direction visible")
	}
	v.RouteID = r.ID
	v.Stale = true
	if Eligible(v, geo.Point{0, 0.005}, r) {
		t.Fatal("Stale driver sees passenger")
	}
	v.Stale = false
	v.OffsetKm = 1
	if Eligible(v, geo.Point{0, 0.005}, r) {
		t.Fatal("Passed pickup visible")
	}
	_ = now
}

func TestDutyLeaseAndFreshSessionReset(t *testing.T) {
	e, now, r := setup()
	if err := e.Position("d", "session-one", fix(*now, 1, geo.Point{0, 0})); err != nil {
		t.Fatal(err)
	}
	*now = now.Add(3 * time.Second)
	if err := e.Position("d", "session-one", fix(*now, 2, geo.Point{0, 0.0001})); err != nil {
		t.Fatal(err)
	}
	if e.Duty("d").DistanceKm <= 0 {
		t.Fatal("distance did not accumulate")
	}
	_ = e.SetMode("d", "session-one", "istirahat", Vehicle{}, r)
	_ = e.SetMode("d", "session-one", "narik", Vehicle{ID: "v", RouteID: r.ID}, r)
	if d := e.Duty("d"); d.DistanceKm != 0 || d.LastSequence != 0 || d.Vehicle.LastSeen != 0 {
		t.Fatal("new duty reused old telemetry")
	}
	*now = now.Add(61 * time.Second)
	changes := e.Tick()
	if len(changes) != 1 || changes[0].Reason != "gps_timeout" || e.Duty("d").Mode != "offline" {
		t.Fatal("silent publisher kept duty open")
	}
}
func TestAuthorizationRevocationAndReplacement(t *testing.T) {
	e, now, r := setup()
	_ = e.Position("d", "session-one", fix(*now, 1, geo.Point{0, 0}))
	valid := Authorization{DriverID: "d", VehicleID: "v", RouteID: r.ID, Session: "session-one"}
	if len(e.ReconcileAuthorizations([]Authorization{valid})) != 0 {
		t.Fatal("valid duty revoked")
	}
	replacement := valid
	replacement.Session = "replacement"
	changes := e.ReconcileAuthorizations([]Authorization{replacement})
	if len(changes) != 1 || len(e.Vehicles()) != 0 || e.Duty("d").Mode != "offline" {
		t.Fatal("superseded session remained public")
	}
}
func TestSampleAgeNotDeliveryTimeAndSlowGapReset(t *testing.T) {
	e, now, _ := setup()
	f := fix(*now, 1, geo.Point{0, 0})
	f.SampledAt -= 14000
	if err := e.Position("d", "session-one", f); err != nil {
		t.Fatal(err)
	}
	*now = now.Add(2 * time.Second)
	if !e.Vehicles()[0].Stale {
		t.Fatal("cached GPS became fresh at delivery time")
	}
	*now = now.Add(31 * time.Second)
	if err := e.Position("d", "session-one", fix(*now, 2, geo.Point{0, 0})); err != nil {
		t.Fatal(err)
	}
	if e.Duty("d").Vehicle.Status != "jalan" {
		t.Fatal("missing GPS counted as slow movement")
	}
}

func TestTelemetrySourceCannotChangeDuringDuty(t *testing.T) {
	e, now, r := setup()
	f := fix(*now, 1, geo.Point{0, 0})
	f.TelemetrySource = "simulation"
	if e.Position("d", "session-one", f) == nil {
		t.Fatal("simulation published into GPS duty")
	}
	if e.SetMode("d", "session-one", "narik", Vehicle{TelemetrySource: "simulation"}, r) == nil {
		t.Fatal("active duty changed source")
	}
	_ = e.SetMode("d", "session-one", "offline", Vehicle{}, r)
	_ = e.SetMode("d", "session-one", "narik", Vehicle{TelemetrySource: "simulation", ID: "v", DriverID: "d", RouteID: r.ID}, r)
	if err := e.Position("d", "session-one", f); err != nil {
		t.Fatal(err)
	}
	if len(e.Vehicles()) != 1 || e.Vehicles()[0].TelemetrySource != "simulation" {
		t.Fatal("simulation marker lost provenance")
	}
}

func TestNgetemConfirmationYes(t *testing.T) {
	e, now, _ := setup()
	for seq := int64(1); seq <= 31; seq++ {
		if err := e.Position("d", "session-one", fix(*now, seq, geo.Point{0, 0})); err != nil {
			t.Fatal(err)
		}
		*now = now.Add(3 * time.Second)
	}
	prompt := e.Duty("d").Prompt
	if prompt == nil {
		t.Fatal("missing prompt")
	}
	if err := e.Answer("d", "session-one", prompt.ID, true); err != nil {
		t.Fatal(err)
	}
	if d := e.Duty("d"); d.Mode != "ngetem" || d.Vehicle.Status != "ngetem" || d.Prompt != nil {
		t.Fatal("yes did not change duty and public status together")
	}
}
