package geo

import "testing"

func TestProjectAllSegmentsWithoutBridging(t *testing.T) {
	r := Route{Segments: [][]Point{{{0, 0}, {0, 0.02}}, {{1, 1}, {1, 1.002}}}}
	p := Project(Point{1, 1.001}, r)
	if p.Chain != 1 || p.DistanceKm > 0.001 {
		t.Fatalf("Short chain ignored: %+v", p)
	}
	p = Project(Point{0.5, 0.5}, r)
	if p.DistanceKm < 20 {
		t.Fatal("Fictitious bridge used")
	}
}
