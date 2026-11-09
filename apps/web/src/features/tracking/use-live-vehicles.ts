import type { Vehicle } from '@/types'
import { useSyncExternalStore } from 'react'
import { routes } from '@/mocks/data'
import { STALE_GPS_MS } from './tracking-state'
import { animatedVehicles } from './animated-vehicles'

let vehicles = animatedVehicles(routes, Date.now())
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined
function update() {
  vehicles = animatedVehicles(routes, Date.now())
  listeners.forEach((listener) => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    update()
    timer = setInterval(update, 1000)
    document.addEventListener('visibilitychange', update)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) { clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }
}
const getSnapshot = () => vehicles

export function isVehicleStale(vehicle: Vehicle) {
  return vehicle.lastSeenAt !== undefined && Date.now() - vehicle.lastSeenAt > STALE_GPS_MS
}

export function useLiveVehicles(): Vehicle[] {
  return useSyncExternalStore(subscribe, getSnapshot)
}

if (import.meta.hot) import.meta.hot.dispose(() => { clearInterval(timer); document.removeEventListener('visibilitychange', update) })
