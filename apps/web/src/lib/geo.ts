import type { RouteInfo } from '@/types'

export type LatLng = [number, number]

const EARTH_RADIUS_KM = 6371

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function distanceKm(a: LatLng, b: LatLng) {
  const latDelta = toRadians(b[0] - a[0])
  const lngDelta = toRadians(b[1] - a[1])
  const lat1 = toRadians(a[0])
  const lat2 = toRadians(b[0])

  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function nearestRoutePoint(point: LatLng, routes: RouteInfo[]) {
  let nearest: { point: LatLng; route: RouteInfo; distanceKm: number } | null = null

  for (const route of routes) {
    for (const routePoint of route.polyline) {
      const distance = distanceKm(point, routePoint)
      if (!nearest || distance < nearest.distanceKm) {
        nearest = { point: routePoint, route, distanceKm: distance }
      }
    }
  }

  return nearest
}
