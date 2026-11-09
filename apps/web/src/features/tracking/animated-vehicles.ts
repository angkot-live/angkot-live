import type { LatLng } from '../../lib/geo.ts'
import type { RouteInfo, Vehicle } from '../../types/index.ts'
import { routeLine } from './route-geometry.ts'

const EPOCH = Date.UTC(2026, 0, 1)
const TERMINAL_PAUSE_MS = 12000

/** Display-only examples. Positions use one clock, so tabs do not run independent simulations. */
export function animatedVehicles(routes: RouteInfo[], now: number): Vehicle[] {
  return routes.flatMap((route, routeIndex) => {
    const line = routeLine(route)
    if (line.points.length < 2 || line.length <= 0) return []
    const count = routeIndex % 2 === 0 ? 1 : 2
    const speedKph = 24 + (routeIndex % 4) * 3
    const travelMs = line.length / speedKph * 3600000
    const cycleMs = travelMs + TERMINAL_PAUSE_MS
    return Array.from({ length: count }, (_, slot): Vehicle => {
      const seed = cycleMs * (0.15 + slot * 0.5 + (routeIndex % 5) * 0.03)
      const phase = ((now - EPOCH + seed) % cycleMs + cycleMs) % cycleMs
      const waiting = phase >= travelMs
      const offset = Math.min(phase / travelMs, 1) * line.length
      let low = 0
      let high = line.points.length - 2
      while (low < high) {
        const mid = Math.floor((low + high) / 2)
        if (line.cumulative[mid + 1] < offset) low = mid + 1
        else high = mid
      }
      const a = line.points[low]
      const b = line.points[low + 1]
      const segmentKm = line.cumulative[low + 1] - line.cumulative[low]
      const fraction = segmentKm > 0 ? Math.min(1, (offset - line.cumulative[low]) / segmentKm) : 0
      const position: LatLng = [a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction]
      const heading = (Math.atan2((b[1] - a[1]) * Math.cos(a[0] * Math.PI / 180), b[0] - a[0]) * 180 / Math.PI + 360) % 360
      return {
        id: `example-${route.id}-${slot + 1}`, isExample: true,
        plate: `D ${1000 + routeIndex * 2 + slot} CT`,
        routeId: route.id, routeCode: route.code, routeName: route.name,
        driverName: `Pengemudi contoh ${route.code}-${slot + 1}`,
        position, heading, status: waiting ? 'ngetem' : 'jalan', speedKph: waiting ? 0 : speedKph,
        etaMinutes: Math.max(1, Math.ceil((line.length - offset) / speedKph * 60)),
        seatsAvailable: 5 + slot, driverVerified: true, lastSeenAt: now,
      }
    })
  })
}
