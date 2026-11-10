import { distanceKm, type LatLng } from '../../lib/geo.ts'
import type { RouteInfo, Vehicle } from '../../types/index.ts'

export function groupRouteDirections(routes: RouteInfo[]) {
  const groups = new Map<string, { code: string; name: string; color: string; directions: RouteInfo[] }>()
  for (const route of routes) {
    const existing = groups.get(route.code)
    if (existing) existing.directions.push(route)
    else groups.set(route.code, { code: route.code, name: route.name, color: route.color, directions: [route] })
  }
  return [...groups.values()]
}

export function vehiclesForRouteSelection(vehicles: Vehicle[], selection: string, routes: RouteInfo[]) {
  if (!selection || selection === 'semua') return []
  const ids = new Set(routes.filter((route) => route.id === selection || route.code === selection).map((route) => route.id))
  return vehicles.filter((vehicle) => ids.has(vehicle.routeId))
}

export function vehiclesWithinRadius<T extends { position: LatLng }>(
  vehicles: T[],
  center: LatLng,
  radiusKm: number,
) {
  return vehicles.filter((vehicle) => distanceKm(center, vehicle.position) <= radiusKm)
}
