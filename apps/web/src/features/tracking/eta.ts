import type { Vehicle, RouteInfo } from '../../types/index.ts'
import type { LatLng } from '../../lib/geo.ts'
import { projectToRoute } from './megat-engine.ts'
export function pickupEta(
  vehicle: Vehicle,
  pickup: LatLng | null,
  route?: RouteInfo,
  now = Date.now(),
): number | null {
  if (
    !pickup ||
    !route ||
    route.id !== vehicle.routeId ||
    route.isActive === false ||
    !Number.isFinite(vehicle.speedKph) ||
    vehicle.stale ||
    vehicle.status === 'ngetem' ||
    vehicle.status === 'offline' ||
    vehicle.status === 'istirahat' ||
    !vehicle.lastSeenAt ||
    now - vehicle.lastSeenAt > 15000
  )
    return null
  const target = projectToRoute(pickup, route),
    origin = projectToRoute(vehicle.position, route)
  if (
    target.distanceKm > 0.8 ||
    origin.distanceKm > 0.15 ||
    target.chain !== origin.chain ||
    origin.offsetKm > target.offsetKm + 0.02
  )
    return null
  return Math.max(
    1,
    Math.ceil(
      (Math.max(0, target.offsetKm - origin.offsetKm) /
        Math.max(5, Math.min(vehicle.speedKph, 50))) *
        60,
    ),
  )
}
