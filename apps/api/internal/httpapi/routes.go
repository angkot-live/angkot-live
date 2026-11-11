package httpapi

import (
	"angkot-live/api/internal/geo"
	"angkot-live/api/internal/platform"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gofiber/fiber/v2"
	"time"
)

func (s *Server) catalog(all bool) ([]geo.Route, error) {
	s.routesMu.Lock()
	defer s.routesMu.Unlock()
	rows := s.Routes
	if s.DatabaseRoutes {
		if time.Since(s.routesFetched) > 3*time.Second {
			var fresh []geo.Route
			if err := s.DB.Request("POST", "/rest/v1/rpc/route_catalog", s.DB.Key, Row{}, &fresh); err != nil {
				return nil, err
			}
			if fresh == nil {
				fresh = []geo.Route{}
			}
			s.cachedRoutes = fresh
			s.routesFetched = time.Now()
			s.Tracking.ReconcileRoutes(fresh)
		}
		rows = s.cachedRoutes
	}
	out := make([]geo.Route, 0, len(rows))
	for _, r := range rows {
		if all || r.IsActive {
			out = append(out, r)
		}
	}
	return out, nil
}
func (s *Server) ReloadRoutes() error {
	s.routesMu.Lock()
	s.routesFetched = time.Time{}
	s.routesMu.Unlock()
	_, err := s.catalog(true)
	return err
}
func (s *Server) manageRoute(c *fiber.Ctx, u platform.User) error {
	if u.Role != "admin" {
		return c.Status(403).JSON(Row{"error": "Akses admin diperlukan"})
	}
	if (c.Params("id") != "" && c.Method() == "POST") || (c.Params("id") == "" && (c.Method() == "PATCH" || c.Method() == "DELETE")) {
		return c.Status(405).JSON(Row{"error": "Metode tidak didukung pada endpoint ini"})
	}
	if c.Method() != "GET" && c.Method() != "POST" && c.Method() != "PATCH" && c.Method() != "DELETE" {
		return c.Status(405).JSON(Row{"error": "Metode tidak didukung"})
	}
	if c.Method() == "GET" {
		rows, err := s.catalog(true)
		if err != nil {
			return err
		}
		if id := c.Params("id"); id != "" {
			for _, r := range rows {
				if r.ID == id {
					return c.JSON(r)
				}
			}
			return c.Status(404).JSON(Row{"error": "Trayek tidak ditemukan"})
		}
		return c.JSON(rows)
	}
	in := Row{}
	if err := json.Unmarshal(c.Body(), &in); err != nil {
		return errors.New("JSON trayek tidak valid")
	}
	action := "update"
	id := c.Params("id")
	if c.Method() == "POST" {
		action = "create"
		id = ID()
	} else if c.Method() == "DELETE" {
		action = "delete"
	}
	if action != "delete" {
		for _, field := range []string{"code", "name", "origin", "destination", "color"} {
			if stringValue(in[field]) == "" {
				return fmt.Errorf("%s wajib diisi", field)
			}
		}
		var shape struct {
			Segments [][]geo.Point `json:"segments"`
			Endstops []struct {
				Name     string    `json:"name"`
				Position geo.Point `json:"position"`
			} `json:"endstops"`
		}
		if err := json.Unmarshal(c.Body(), &shape); err != nil || len(shape.Segments) == 0 {
			return errors.New("Geometri segmen tidak valid")
		}
		points := 0
		for _, line := range shape.Segments {
			if len(line) < 2 {
				return errors.New("Segmen memerlukan minimal dua titik")
			}
			for _, p := range line {
				if !p.Valid() {
					return errors.New("Koordinat tidak valid")
				}
				points++
			}
		}
		if points > 50000 {
			return errors.New("Maksimal 50.000 titik per arah trayek")
		}
		for _, stop := range shape.Endstops {
			if stop.Name == "" || !stop.Position.Valid() {
				return errors.New("Nama/koordinat halte tidak valid")
			}
		}
	}
	var out any
	if err := s.DB.Request("POST", "/rest/v1/rpc/admin_route_command", s.DB.Key, Row{"p_actor": u.ID, "p_action": action, "p_id": id, "p_input": in}, &out); err != nil {
		return err
	}
	if err := s.ReloadRoutes(); err != nil {
		return err
	}
	return c.JSON(out)
}
func (s *Server) statistics(actor string) (Row, error) {
	stats := Row{}
	path := "/rest/v1/rpc/flow_public_stats"
	body := Row{}
	if actor != "" {
		path = "/rest/v1/rpc/admin_dashboard"
		body["p_actor"] = actor
	}
	if err := s.DB.Request("POST", path, s.DB.Key, body, &stats); err != nil {
		return nil, err
	}
	// Force freshness/route reconciliation before counting live GPS, never persisted vehicle.status.
	routes, err := s.catalog(false)
	if err != nil {
		return nil, err
	}
	if err := s.refreshTracking(); err != nil {
		return nil, err
	}
	codes := map[string]int{}
	directions := map[string]int{}
	statuses := map[string]int{}
	active := 0
	simulated := 0
	for _, v := range s.Tracking.Vehicles() {
		if !v.Stale {
			codes[v.RouteCode]++
			directions[v.RouteID]++
			statuses[v.Status]++
			active++
			if v.TelemetrySource == "simulation" {
				simulated++
			}
		}
	}
	stats["activeByRoute"] = codes
	stats["activeByDirection"] = directions
	stats["activeVehicles"] = active
	stats["simulatedVehicles"] = simulated
	stats["gpsVehicles"] = active - simulated
	statuses["offline"] = max(0, int(number(stats["totalVehicles"]))-active)
	stats["vehicleStatuses"] = statuses
	stats["routes"] = len(routes)
	return stats, nil
}
