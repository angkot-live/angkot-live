export interface TripLeg {
  routeCode: string
  routeName: string
  from: string
  to: string
  durationMinutes: number
  fare: number
  boardAt: string
  alightAt: string
}

export interface Trip {
  id: string
  code: string
  date: string
  routeCode: string
  routeName: string
  from: string
  to: string
  durationMinutes: number
  distanceKm: number
  fare: number
  status: 'selesai' | 'dibatalkan'
  legs?: TripLeg[]
  vehicleId?: string
  telemetrySource?: 'gps' | 'simulation'
}
