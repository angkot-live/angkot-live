import { distanceKm, type LatLng } from '../../lib/geo.ts'
import type { RouteInfo } from '../../types/index.ts'

const cache = new WeakMap<RouteInfo, { points: LatLng[]; cumulative: number[]; length: number }>()

export function routeLine(route: RouteInfo) {
  const cached = cache.get(route)
  if (cached) return cached
  const points = (route.segments ?? [route.polyline]).filter((line) => line.length > 1)
    .sort((a, b) => b.length - a.length)[0] ?? route.polyline
  const cumulative = [0]
  for (let index = 1; index < points.length; index++) {
    cumulative.push(cumulative[index - 1] + distanceKm(points[index - 1], points[index]))
  }
  const line = { points, cumulative, length: cumulative[cumulative.length - 1] ?? 0 }
  cache.set(route, line)
  return line
}
