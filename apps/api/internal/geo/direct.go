package geo

import (
	"math"
	"sort"
)

type DirectPlan struct {
	Chain          int     `json:"chain"`
	BoardOffsetKm  float64 `json:"boardOffsetKm"`
	AlightOffsetKm float64 `json:"alightOffsetKm"`
	Board          Point   `json:"board"`
	Alight         Point   `json:"alight"`
	RideKm         float64 `json:"rideKm"`
	Minutes        float64 `json:"minutes"`
	Score          float64 `json:"-"`
}
type stopCandidate struct {
	position       Point
	offset, access float64
}

// Direct considers every reachable point, rather than only the closest projection.
// The closest point can be behind the destination on a directed/looping route.
func Direct(r Route, origin, destination Point) (DirectPlan, bool) {
	best := DirectPlan{Score: math.Inf(1)}
	for chain, line := range r.Chains() {
		if len(line) < 2 {
			continue
		}
		candidates := []stopCandidate{}
		offset := 0.0
		for i, p := range line {
			if i > 0 {
				offset += Distance(line[i-1], p)
			}
			candidates = append(candidates, stopCandidate{position: p, offset: offset, access: Distance(origin, p)})
		}
		for _, target := range []Point{origin, destination} {
			projection := Project(target, Route{Polyline: line})
			if !math.IsInf(projection.DistanceKm, 0) {
				candidates = append(candidates, stopCandidate{projection.Point, projection.OffsetKm, Distance(origin, projection.Point)})
			}
		}
		sort.SliceStable(candidates, func(i, j int) bool { return candidates[i].offset < candidates[j].offset })
		pending := []stopCandidate{}
		next := 0
		board := stopCandidate{}
		boardCost := math.Inf(1)
		for _, stop := range candidates {
			// A meaningful ride must advance along the chosen chain.
			for next < len(pending) && pending[next].offset <= stop.offset-0.1 {
				p := pending[next]
				cost := p.access/4.5*60*1.3*2 - p.offset/15*60
				if cost < boardCost {
					boardCost = cost
					board = p
				}
				next++
			}
			egress := Distance(stop.position, destination)
			if !math.IsInf(boardCost, 0) && egress <= 0.8 {
				score := boardCost + stop.offset/15*60 + egress/4.5*60*1.3*2 + 5
				if score < best.Score {
					ride := stop.offset - board.offset
					best = DirectPlan{Chain: chain, BoardOffsetKm: board.offset, AlightOffsetKm: stop.offset, Board: board.position, Alight: stop.position, RideKm: ride, Minutes: ride/15*60 + (board.access+egress)/4.5*60*1.3 + 5, Score: score}
				}
			}
			if stop.access <= 0.8 {
				pending = append(pending, stop)
			}
		}
	}
	return best, !math.IsInf(best.Score, 0)
}
