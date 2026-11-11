package tracking

import (
	"angkot-live/api/internal/geo"
	"errors"
	"math"
	"reflect"
	"sync"
	"time"
)

const (
	StaleMS     int64 = 15000
	RemoveMS    int64 = 30000
	LeaseMS     int64 = 60000
	MaxAccuracy       = 50
)

type Authorization struct {
	DriverID  string `json:"driverId"`
	VehicleID string `json:"vehicleId"`
	RouteID   string `json:"routeId"`
	Session   string `json:"session"`
}
type Transition struct {
	DriverID string
	Duty     Duty
	Reason   string
}
type Fix struct {
	TelemetrySource string    `json:"telemetrySource"`
	Position        geo.Point `json:"position"`
	Accuracy        float64   `json:"accuracy"`
	Speed           float64   `json:"speedKph"`
	InferSpeed      bool      `json:"inferSpeed"`
	Heading         float64   `json:"heading"`
	SampledAt       int64     `json:"sampledAt"`
	Sequence        int64     `json:"sequence"`
}
type Vehicle struct {
	TelemetrySource string    `json:"telemetrySource"`
	ID              string    `json:"id"`
	Plate           string    `json:"plate"`
	DriverID        string    `json:"-"`
	DriverName      string    `json:"driverName"`
	RouteID         string    `json:"routeId"`
	RouteCode       string    `json:"routeCode"`
	RouteName       string    `json:"routeName"`
	Status          string    `json:"status"`
	Position        geo.Point `json:"position"`
	RawPosition     geo.Point `json:"-"`
	Speed           float64   `json:"speedKph"`
	Heading         float64   `json:"heading"`
	LastSeen        int64     `json:"lastSeenAt"`
	DriverVerified  bool      `json:"driverVerified"`
	Stale           bool      `json:"stale"`
	Accuracy        float64   `json:"accuracy"`
	OffsetKm        float64   `json:"offsetKm"`
	Chain           int       `json:"chain"`
	ETA             *float64  `json:"etaMinutes"`
}
type Duty struct {
	Mode         string    `json:"mode"`
	Session      string    `json:"session"`
	Vehicle      *Vehicle  `json:"vehicle"`
	Prompt       *Prompt   `json:"prompt"`
	DistanceKm   float64   `json:"distanceKm"`
	StartedAt    int64     `json:"-"`
	LastSequence int64     `json:"-"`
	LastSample   int64     `json:"-"`
	LastPublish  int64     `json:"-"`
	Anchor       geo.Point `json:"-"`
	StationaryAt int64     `json:"-"`
	SlowAt       int64     `json:"-"`
	Route        geo.Route `json:"-"`
}
type Prompt struct {
	ID       string `json:"id"`
	Deadline int64  `json:"deadline"`
}
type Engine struct {
	mu     sync.Mutex
	duties map[string]*Duty
	Now    func() time.Time
}

func New() *Engine            { return &Engine{duties: map[string]*Duty{}, Now: time.Now} }
func active(mode string) bool { return mode == "narik" || mode == "ngetem" }
func (e *Engine) SetMode(id, session, mode string, v Vehicle, r geo.Route) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if mode != "narik" && mode != "ngetem" && mode != "istirahat" && mode != "offline" {
		return errors.New("Status tidak valid")
	}
	if v.TelemetrySource == "" {
		v.TelemetrySource = "gps"
	}
	old := e.duties[id]
	if old != nil && active(old.Mode) && old.Session != session && mode != "offline" {
		return errors.New("Kendaraan sedang bertugas pada tab/perangkat lain. Akhiri sesi tersebut terlebih dahulu")
	}
	if old != nil && active(old.Mode) && active(mode) && old.Vehicle.TelemetrySource != v.TelemetrySource {
		return errors.New("Pilih Offline sebelum mengganti sumber posisi")
	}
	if old == nil || old.Session != session || (!active(old.Mode) && active(mode)) {
		old = &Duty{Session: session, Vehicle: &v, Route: r, StartedAt: e.Now().UnixMilli()}
		e.duties[id] = old
	}
	old.Mode = mode
	old.Prompt = nil
	old.StationaryAt = 0
	old.SlowAt = 0
	if old.Vehicle != nil {
		old.Vehicle.Status = mode
		if mode == "narik" {
			old.Vehicle.Status = "jalan"
		}
	}
	if !active(mode) {
		old.Vehicle.LastSeen = 0
	}
	return nil
}
func (e *Engine) Position(id, session string, f Fix) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	d := e.duties[id]
	now := e.Now().UnixMilli()
	if d == nil || !active(d.Mode) || d.Session != session {
		return errors.New("Mulai bertugas pada perangkat ini terlebih dahulu")
	}
	if f.TelemetrySource == "" {
		f.TelemetrySource = "gps"
	}
	if f.TelemetrySource != d.Vehicle.TelemetrySource {
		return errors.New("Sumber posisi berbeda dari sesi tugas")
	}
	if !f.Position.Valid() || f.Accuracy <= 0 || f.Accuracy > MaxAccuracy || math.IsNaN(f.Accuracy) || f.Speed < 0 || f.Speed > 160 || math.IsNaN(f.Speed) || math.IsNaN(f.Heading) || f.Heading < 0 || f.Heading >= 360 {
		return errors.New("GPS tidak valid atau akurasi lebih dari 50 meter")
	}
	if now-f.SampledAt > StaleMS || f.SampledAt > now+5000 || f.SampledAt <= d.LastSample || f.Sequence <= d.LastSequence {
		return errors.New("Sampel GPS lama atau urutan tidak valid")
	}
	if now-d.LastPublish < 2000 && d.LastPublish > 0 {
		return errors.New("Pengiriman GPS terlalu sering")
	}
	projection := geo.Project(f.Position, d.Route)
	if projection.DistanceKm > 0.15 {
		return errors.New("Posisi lebih dari 150 meter dari trayek tugas")
	}
	v := d.Vehicle
	if v.LastSeen > 0 && now-v.LastSeen < RemoveMS {
		jump := geo.Distance(v.RawPosition, f.Position)
		elapsed := float64(f.SampledAt-d.LastSample) / 3600000
		if elapsed > 0 && jump/elapsed > 160 {
			return errors.New("Lonjakan GPS ditolak")
		}
		if f.InferSpeed && elapsed > 0 {
			f.Speed = math.Min(160, jump/elapsed)
		}
		// Do not count a projection jumping across a loop as travelled distance.
		delta := projection.OffsetKm - v.OffsetKm
		if projection.Chain == v.Chain && delta >= 0 && delta <= 160*elapsed+0.05 {
			d.DistanceKm += delta
		}

	}
	if v.LastSeen == 0 || now-v.LastSeen > StaleMS {
		d.SlowAt = 0
	}
	if d.StationaryAt == 0 || geo.Distance(d.Anchor, f.Position) > 0.02 || now-v.LastSeen > StaleMS {
		d.Anchor = f.Position
		d.StationaryAt = now
		d.Prompt = nil
	}
	if f.Speed < 5 {
		if d.SlowAt == 0 {
			d.SlowAt = now
		}
	} else {
		d.SlowAt = 0
	}
	status := "jalan"
	if d.Mode == "ngetem" {
		status = "ngetem"
	} else if d.SlowAt > 0 && now-d.SlowAt >= 30000 {
		status = "merayap"
	}
	if d.Mode == "narik" && now-d.StationaryAt >= 90000 && d.Prompt == nil {
		d.Prompt = &Prompt{ID: time.UnixMilli(now).Format(time.RFC3339Nano), Deadline: now + 15000}
	}
	v.Position = projection.Point
	v.RawPosition = f.Position
	v.Status = status
	v.Speed = f.Speed
	v.Heading = f.Heading
	v.LastSeen = min(now, f.SampledAt)
	v.Accuracy = f.Accuracy
	v.Chain = projection.Chain
	v.OffsetKm = projection.OffsetKm
	d.LastSequence = f.Sequence
	d.LastSample = f.SampledAt
	d.LastPublish = now
	return nil
}
func (e *Engine) Answer(id, session, prompt string, yes bool) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	d := e.duties[id]
	now := e.Now().UnixMilli()
	if d == nil || d.Session != session || d.Prompt == nil || d.Prompt.ID != prompt || d.Prompt.Deadline <= now {
		return errors.New("Konfirmasi sudah tidak berlaku")
	}
	if yes {
		d.Mode = "ngetem"
		d.Vehicle.Status = "ngetem"
	}
	d.Prompt = nil
	d.StationaryAt = now
	return nil
}
func (e *Engine) Tick() []Transition {
	e.mu.Lock()
	defer e.mu.Unlock()
	now := e.Now().UnixMilli()
	changes := []Transition{}
	for id, d := range e.duties {
		seen := d.StartedAt
		if d.Vehicle.LastSeen > 0 {
			seen = d.Vehicle.LastSeen
		}
		if active(d.Mode) && now-seen > LeaseMS {
			changes = append(changes, Transition{DriverID: id, Duty: *d, Reason: "gps_timeout"})
			delete(e.duties, id)
			continue
		}
		if d.Prompt != nil && d.Prompt.Deadline <= now {
			if active(d.Mode) && now-d.Vehicle.LastSeen <= StaleMS {
				d.Mode = "ngetem"
				d.Vehicle.Status = "ngetem"
				changes = append(changes, Transition{DriverID: id, Duty: *d, Reason: "ngetem"})
			}
			d.Prompt = nil
			d.StationaryAt = now
		}
	}
	return changes
}

// An authoritative DB snapshot revokes GPS immediately after approval/assignment changes.
func (e *Engine) ReconcileAuthorizations(rows []Authorization) []Transition {
	e.mu.Lock()
	defer e.mu.Unlock()
	allowed := map[string]Authorization{}
	for _, a := range rows {
		allowed[a.DriverID] = a
	}
	changes := []Transition{}
	for id, d := range e.duties {
		if !active(d.Mode) {
			continue
		}
		a, ok := allowed[id]
		if !ok || a.Session != d.Session || a.VehicleID != d.Vehicle.ID || a.RouteID != d.Route.ID {
			changes = append(changes, Transition{DriverID: id, Duty: *d, Reason: "authorization_changed"})
			delete(e.duties, id)
		}
	}
	return changes
}
func (e *Engine) Duty(id string) Duty {
	e.mu.Lock()
	defer e.mu.Unlock()
	d := e.duties[id]
	if d == nil {
		return Duty{Mode: "offline"}
	}
	out := *d
	if d.Vehicle != nil {
		v := *d.Vehicle
		out.Vehicle = &v
	}
	if d.Prompt != nil {
		p := *d.Prompt
		out.Prompt = &p
	}
	return out
}
func (e *Engine) Vehicles() []Vehicle {
	e.mu.Lock()
	defer e.mu.Unlock()
	out := []Vehicle{}
	now := e.Now().UnixMilli()
	for _, d := range e.duties {
		if active(d.Mode) && d.Vehicle.LastSeen > 0 && now-d.Vehicle.LastSeen <= RemoveMS {
			v := *d.Vehicle
			v.Stale = now-v.LastSeen > StaleMS
			out = append(out, v)
		}
	}
	return out
}
func (e *Engine) Stop(id string) { e.mu.Lock(); defer e.mu.Unlock(); delete(e.duties, id) }

// A geometry/status edit ends the old GPS session; metadata edits update live labels.
func (e *Engine) ReconcileRoutes(routes []geo.Route) {
	e.mu.Lock()
	defer e.mu.Unlock()
	byID := map[string]geo.Route{}
	for _, r := range routes {
		byID[r.ID] = r
	}
	for id, d := range e.duties {
		r, ok := byID[d.Route.ID]
		if !ok || !r.IsActive || !reflect.DeepEqual(r.Chains(), d.Route.Chains()) {
			delete(e.duties, id)
			continue
		}
		d.Route = r
		if d.Vehicle != nil {
			d.Vehicle.RouteCode = r.Code
			d.Vehicle.RouteName = r.Name
		}
	}
}
func Eligible(v Vehicle, position geo.Point, r geo.Route) bool {
	p := geo.Project(position, r)
	return !v.Stale && v.DriverVerified && v.RouteID == r.ID && p.DistanceKm <= 0.1 && p.Chain == v.Chain && v.OffsetKm <= p.OffsetKm+0.05 && geo.Distance(v.Position, p.Point) <= 2
}
