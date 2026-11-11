import { distanceKm, type LatLng } from '../../lib/geo.ts'
import type { RouteInfo } from '../../types/index.ts'
import type { Itinerary, TripPlan, TripWalk } from './trip-planner.ts'

export interface DirectRecommendation {
  route: { id: string }
  board: LatLng
  alight: LatLng
  rideKm: number
  minutes: number
  chain: number
  boardOffsetKm: number
  alightOffsetKm: number
}
function walk(from: LatLng, to: LatLng): TripWalk {
  const meters = Math.round(distanceKm(from, to) * 1300)
  return {
    from,
    to,
    path: [],
    routing: 'estimated',
    meters,
    minutes: Math.round(meters / 75),
  }
}
// The backend chooses direction, chain, and exact pickup/drop-off points. The
// browser only builds presentation and asks the walking service for real paths.
export function directTripPlan(
  routes: RouteInfo[],
  origin: LatLng,
  destination: LatLng,
  recommendations: DirectRecommendation[],
): TripPlan {
  const itineraries: Itinerary[] = []
  for (const item of recommendations) {
    const route = routes.find(
      (r) => r.id === item.route.id && r.isActive !== false,
    )
    if (!route) continue
    const points = (route.segments?.length ? route.segments : [route.polyline])[
      item.chain
    ]
    if (!points || item.alightOffsetKm <= item.boardOffsetKm) continue
    const path: LatLng[] = [item.board]
    let offset = 0,
      boardIndex = 0
    for (let i = 0; i < points.length; i++) {
      if (i) offset += distanceKm(points[i - 1], points[i])
      if (offset <= item.boardOffsetKm) boardIndex = i
      if (offset > item.boardOffsetKm && offset < item.alightOffsetKm)
        path.push(points[i])
    }
    path.push(item.alight)
    const accessWalk = walk(origin, item.board),
      egressWalk = walk(item.alight, destination)
    const walkMinutes = accessWalk.minutes + egressWalk.minutes
    itineraries.push({
      id: `direct-${route.id}-${item.chain}`,
      kind: 'langsung',
      transfers: [],
      accessWalk,
      egressWalk,
      rideKm: item.rideKm,
      totalMinutes: Math.ceil(item.minutes),
      walkMinutes,
      score: item.minutes + walkMinutes,
      legs: [
        {
          route,
          board: item.board,
          alight: item.alight,
          path,
          rideKm: item.rideKm,
          rideMinutes: Math.max(1, Math.ceil((item.rideKm / 15) * 60)),
          boardStreet: `Titik naik trayek ${route.code}`,
          alightStreet: `Titik turun trayek ${route.code}`,
          boardOffsetKm: item.boardOffsetKm,
          chainPoints: points,
          boardIndex,
        },
      ],
    })
  }
  itineraries.sort((a, b) => a.score - b.score)
  const straightKm = distanceKm(origin, destination)
  return {
    itineraries: itineraries.slice(0, 6),
    straightKm,
    walkOnly: straightKm <= 0.7 ? walk(origin, destination) : null,
    noRouteNearOrigin: !routes.some((r) =>
      (r.segments?.length ? r.segments : [r.polyline]).some((line) =>
        line.some((p) => distanceKm(origin, p) <= 0.8),
      ),
    ),
    noRouteNearDestination: !routes.some((r) =>
      (r.segments?.length ? r.segments : [r.polyline]).some((line) =>
        line.some((p) => distanceKm(destination, p) <= 0.8),
      ),
    ),
  }
}
