package geo

import "math"

type Point [2]float64

func (p Point) Valid() bool {
	return !math.IsNaN(p[0]) && !math.IsNaN(p[1]) && !math.IsInf(p[0], 0) && !math.IsInf(p[1], 0) && math.Abs(p[0]) <= 90 && math.Abs(p[1]) <= 180
}
func Distance(a, b Point) float64 {
	const r = math.Pi / 180
	x := (b[1] - a[1]) * math.Cos((a[0]+b[0])*r/2)
	y := b[0] - a[0]
	return math.Hypot(x, y) * 111.195
}

type Route struct {
	ID                 string    `json:"id"`
	Code               string    `json:"code"`
	Name               string    `json:"name"`
	Origin             string    `json:"origin"`
	Destination        string    `json:"destination"`
	Color              string    `json:"color"`
	Polyline           []Point   `json:"polyline"`
	Segments           [][]Point `json:"segments"`
	Streets            []string  `json:"streets"`
	Endstops           any       `json:"endstops"`
	StreetRuns         any       `json:"streetRuns"`
	IsActive           bool      `json:"isActive"`
	UpdatedAt          string    `json:"updatedAt"`
	FareStandard       int       `json:"fareStandard"`
	FareStudent        int       `json:"fareStudent"`
	LengthKm           float64   `json:"lengthKm"`
	RegisteredVehicles int       `json:"registeredVehicles"`
}

func (r Route) Chains() [][]Point {
	if len(r.Segments) > 0 {
		return r.Segments
	}
	return [][]Point{r.Polyline}
}

type Projection struct {
	Point      Point   `json:"point"`
	DistanceKm float64 `json:"distanceKm"`
	OffsetKm   float64 `json:"offsetKm"`
	Chain      int     `json:"chain"`
}

func Project(p Point, r Route) Projection {
	best := Projection{DistanceKm: math.Inf(1)}
	for chain, line := range r.Chains() {
		offset := 0.0
		for i := 1; i < len(line); i++ {
			a, b := line[i-1], line[i]
			scale := math.Cos(p[0] * math.Pi / 180)
			dx := (b[1] - a[1]) * scale
			dy := b[0] - a[0]
			t := 0.0
			if den := dx*dx + dy*dy; den > 0 {
				t = math.Max(0, math.Min(1, ((p[1]-a[1])*scale*dx+(p[0]-a[0])*dy)/den))
			}
			q := Point{a[0] + t*(b[0]-a[0]), a[1] + t*(b[1]-a[1])}
			d := Distance(p, q)
			if d < best.DistanceKm {
				best = Projection{q, d, offset + t*Distance(a, b), chain}
			}
			offset += Distance(a, b)
		}
	}
	return best
}
