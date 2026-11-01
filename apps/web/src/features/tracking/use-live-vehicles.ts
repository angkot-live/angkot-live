import { useEffect, useState } from 'react'

import { routes } from '@/mocks/data'
import { distanceKm } from '@/lib/geo'
import type { Vehicle } from '@/types'

const routeLines = new Map(routes.map((route) => [route.id, route.polyline]))
const STALE_GPS_MS = 15000

export function isVehicleStale(vehicle: Vehicle) {
  return vehicle.lastSeenAt !== undefined && Date.now() - vehicle.lastSeenAt > STALE_GPS_MS
}

function bearing(a: [number, number], b: [number, number]) {
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const lngDelta = ((b[1] - a[1]) * Math.PI) / 180

  const y = Math.sin(lngDelta) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lngDelta)

  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360)
}

function advance(vehicle: Vehicle): Vehicle {
  if (vehicle.status === 'offline') return vehicle
  if (vehicle.status === 'ngetem' || vehicle.status === 'istirahat') {
    return { ...vehicle, speedKph: 0, lastSeenAt: Date.now() }
  }
  const line = routeLines.get(vehicle.routeId)
  if (!line || line.length < 2) return vehicle

  const index = line.reduce((nearest, point, current) => {
    return distanceKm(point, vehicle.position) < distanceKm(line[nearest], vehicle.position)
      ? current
      : nearest
  }, 0)
  const nextIndex = (index + 1) % line.length
  const nextPosition = line[nextIndex] ?? line[0]

  const speedKph = vehicle.status === 'merayap' ? 12 : 24

  return {
    ...vehicle,
    position: nextPosition,
    heading: bearing(vehicle.position, nextPosition),
    speedKph,
    lastSeenAt: Date.now(),
  }
}

export function useLiveVehicles(baseVehicles: Vehicle[], intervalMs = 3000) {
  const [liveVehicles, setLiveVehicles] = useState<Vehicle[]>(() =>
    baseVehicles.map((vehicle) => ({ ...vehicle, lastSeenAt: Date.now() })),
  )

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLiveVehicles((current) => current.map(advance))
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [intervalMs])

  return liveVehicles
}
