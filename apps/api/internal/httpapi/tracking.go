package httpapi

import (
	"angkot-live/api/internal/tracking"
	"context"
	"log"
	"time"
)

// One process owns live GPS. Serialize duty transitions and publication so a fix
// can never be persisted against a replacement session during an HTTP/WS race.
func (s *Server) refreshTracking() error {
	s.trackingMu.Lock()
	defer s.trackingMu.Unlock()
	return s.refreshTrackingLocked()
}
func (s *Server) refreshTrackingLocked() error {
	if s.DatabaseRoutes && time.Since(s.authorizationsFetched) >= time.Second {
		var rows []tracking.Authorization
		if err := s.DB.Request("POST", "/rest/v1/rpc/tracking_authorizations", s.DB.Key, Row{}, &rows); err != nil {
			return err
		}
		s.pendingTransitions = append(s.pendingTransitions, s.Tracking.ReconcileAuthorizations(rows)...)
		s.authorizationsFetched = time.Now()
	}
	s.pendingTransitions = append(s.pendingTransitions, s.Tracking.Tick()...)
	for len(s.pendingTransitions) > 0 {
		change := s.pendingTransitions[0]
		current := s.Tracking.Duty(change.DriverID)
		if change.Reason == "ngetem" && (current.Session != change.Duty.Session || current.Mode != "ngetem") {
			s.pendingTransitions = s.pendingTransitions[1:]
			continue
		}
		if s.DatabaseRoutes {
			var err error
			if change.Reason == "ngetem" {
				err = s.DB.Command(change.DriverID, "duty", Row{"mode": "ngetem", "session": change.Duty.Session, "distanceKm": change.Duty.DistanceKm, "telemetrySource": change.Duty.Vehicle.TelemetrySource}, nil)
			} else {
				err = s.DB.Request("POST", "/rest/v1/rpc/end_tracking", s.DB.Key, Row{"p_actor": change.DriverID, "p_session": change.Duty.Session, "p_distance": change.Duty.DistanceKm, "p_reason": change.Reason}, nil)
			}
			if err != nil {
				return err
			}
		}
		s.pendingTransitions = s.pendingTransitions[1:]
	}
	return nil
}

// Sweep even when no map is open, so a disconnected driver's DB duty expires.
func (s *Server) RunTracking(ctx context.Context) {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.refreshTracking(); err != nil {
				log.Printf("Tracking reconciliation gagal: %v", err)
			}
		}
	}
}
