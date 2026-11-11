import type { Vehicle } from '@/types'
import { useLiveStore } from './live-store'
import { STALE_GPS_MS } from './tracking-state'
export function isVehicleStale(vehicle: Vehicle) {
  return (
    vehicle.stale === true ||
    vehicle.lastSeenAt === undefined ||
    Date.now() - vehicle.lastSeenAt > STALE_GPS_MS
  )
}
export function useLiveVehicles(): Vehicle[] {
  return useLiveStore((s) => s.vehicles)
}
