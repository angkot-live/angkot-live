import { distanceKm, type LatLng } from '../../lib/geo.ts'
import type { RouteInfo, Vehicle } from '../../types/index.ts'
import { STALE_GPS_MS } from './tracking-state.ts'

export const MEGAT_WAIT_MS = 60000
export const MEGAT_ROUTE_RADIUS_KM = 0.1
export type MegatStatus = 'walking' | 'searching' | 'accepted' | 'cancelled' | 'expired' | 'boarded'

export interface MegatRequest {
  id: string
  passengerId: string
  name: string
  destination: string
  routeId: string
  position: LatLng
  pickup: LatLng
  status: MegatStatus
  vehicleId: string | null
  createdAt: number
  expiresAt: number
  revision: number
  writer: string
}

export interface MegatState {
  schema: 1
  requests: Record<string, MegatRequest>
}

export function projectToRoute(position: LatLng, route: RouteInfo) {
  const lines = route.segments ?? [route.polyline]
  let nearest = { point: route.polyline[0], distanceKm: Infinity, offsetKm: 0, chain: 0 }
  const scale = Math.cos(position[0] * Math.PI / 180)
  for (let chain = 0; chain < lines.length; chain++) {
    let offset = 0
    const line = lines[chain]
    for (let index = 1; index < line.length; index++) {
      const a = line[index - 1], b = line[index]
      const dx = (b[1] - a[1]) * scale, dy = b[0] - a[0]
      const denominator = dx * dx + dy * dy
      const fraction = denominator ? Math.max(0, Math.min(1, ((position[1] - a[1]) * scale * dx + (position[0] - a[0]) * dy) / denominator)) : 0
      const point: LatLng = [a[0] + fraction * (b[0] - a[0]), a[1] + fraction * (b[1] - a[1])]
      const km = distanceKm(position, point), segment = distanceKm(a, b)
      if (km < nearest.distanceKm) nearest = { point, distanceKm: km, offsetKm: offset + fraction * segment, chain }
      offset += segment
    }
  }
  return nearest
}

export function effectiveMegat(request: MegatRequest, now: number): MegatRequest {
  return ['walking', 'searching', 'accepted'].includes(request.status) && request.expiresAt <= now
    ? { ...request, status: 'expired' } : request
}

export function activeMegat(request: MegatRequest) {
  return request.status === 'walking' || request.status === 'searching' || request.status === 'accepted'
}

export function latestMegatRequests(requests: MegatRequest[]) {
  const latest = new Map<string, MegatRequest>()
  for (const request of requests) {
    const old = latest.get(request.passengerId)
    if (!old || request.createdAt > old.createdAt ||
        (request.createdAt === old.createdAt && request.id > old.id)) latest.set(request.passengerId, request)
  }
  return [...latest.values()]
}

export function canSeeMegat(request: MegatRequest, vehicle: Vehicle, route: RouteInfo, now: number, radiusKm = 2) {
  const current = effectiveMegat(request, now)
  if (current.status !== 'searching' && !(current.status === 'accepted' && current.vehicleId === vehicle.id)) return false
  if (vehicle.isExample || vehicle.driverVerified === false || vehicle.routeId !== request.routeId || route.id !== request.routeId ||
      vehicle.status === 'offline' || vehicle.status === 'istirahat' ||
      vehicle.lastSeenAt === undefined || now - vehicle.lastSeenAt > STALE_GPS_MS) return false
  const passenger = projectToRoute(request.position, route)
  const driver = projectToRoute(vehicle.position, route)
  return passenger.chain === driver.chain && passenger.distanceKm <= MEGAT_ROUTE_RADIUS_KM && driver.distanceKm <= MEGAT_ROUTE_RADIUS_KM &&
    distanceKm(vehicle.position, request.pickup) <= radiusKm &&
    // The vehicle must not already have passed the waiting point in this direction.
    driver.offsetKm <= passenger.offsetKm + 0.05
}

export function parseMegat(value: unknown, routes: RouteInfo[]): MegatState | null {
  try {
    const state = (typeof value === 'string' ? JSON.parse(value) : value) as MegatState
    if (state?.schema !== 1 || !state.requests || typeof state.requests !== 'object' || Array.isArray(state.requests)) return null
    const values = Object.entries(state.requests)
    if (values.length > 200) return null
    const validPoint = (point: LatLng) => Array.isArray(point) && point.length === 2 &&
      point.every(Number.isFinite) && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180
    for (const [id, r] of values) {
      if (!r || id !== r.id || typeof r.passengerId !== 'string' || typeof r.name !== 'string' ||
          typeof r.destination !== 'string' || !routes.some((route) => route.id === r.routeId) ||
          !validPoint(r.position) || !validPoint(r.pickup) || typeof r.writer !== 'string' ||
          ![r.createdAt, r.expiresAt, r.revision].every(Number.isFinite) ||
          !['walking', 'searching', 'accepted', 'cancelled', 'expired', 'boarded'].includes(r.status) ||
          !(r.vehicleId === null || typeof r.vehicleId === 'string')) return null
    }
    return state
  } catch { return null }
}

export function mergeMegat(current: MegatState, incoming: MegatState): MegatState {
  const requests = { ...current.requests }
  let changed = false
  for (const [id, request] of Object.entries(incoming.requests)) {
    const old = requests[id]
    // A cancellation/boarding is final for this ID, even if a delayed response
    // was authored concurrently by another tab. Retrying always creates a new ID.
    if (old && !activeMegat(old) && activeMegat(request)) continue
    if (!old || (!activeMegat(request) && activeMegat(old)) || request.revision > old.revision ||
        (request.revision === old.revision && request.writer > old.writer)) {
      requests[id] = request
      changed = true
    }
  }
  return changed ? { schema: 1, requests: Object.fromEntries(Object.values(requests)
    .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)).slice(0, 200).map((r) => [r.id, r])) } : current
}
