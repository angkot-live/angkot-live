package geo

import "testing"

func TestDirectCanWalkToAnEarlierBoardingPoint(t *testing.T) {
	r := Route{Polyline: []Point{{0, 0.006}, {0, 0.012}, {0.006, 0.012}, {0.006, 0}, {0, 0}}}
	p, ok := Direct(r, Point{0, 0}, Point{0, 0.012})
	if !ok {
		t.Fatal("Closest projection at route end incorrectly hid a valid earlier boarding")
	}
	if p.Board != r.Polyline[0] {
		t.Fatalf("Wrong boarding: %+v", p)
	}
}
func TestDirectDoesNotRideBackwardOrBridgeChains(t *testing.T) {
	r := Route{Polyline: []Point{{0, 0}, {0, 0.05}}}
	if _, ok := Direct(r, Point{0, 0.05}, Point{0, 0}); ok {
		t.Fatal("Backward trip allowed")
	}
	r.Segments = [][]Point{{{0, 0}, {0, 0.005}}, {{1, 1}, {1, 1.005}}}
	if _, ok := Direct(r, Point{0, 0}, Point{1, 1.005}); ok {
		t.Fatal("Disconnected chains bridged")
	}
}
