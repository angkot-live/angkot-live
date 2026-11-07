export type Role = 'penumpang' | 'pengemudi' | 'admin'

export type VehicleStatus = 'jalan' | 'merayap' | 'ngetem' | 'istirahat' | 'offline'

export type DriverMode = 'narik' | 'ngetem' | 'istirahat' | 'offline'

export type DriverVerificationStatus = 'menunggu' | 'ditolak' | 'disetujui'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: Role
  driverVerification?: DriverVerificationStatus
  avatarUrl?: string
}

export interface RouteEndstop {
  id: string
  name: string
  position: [number, number]
}

export interface RouteInfo {
  id: string
  code: string
  name: string
  origin: string
  destination: string
  color: string
  polyline: [number, number][]
  segments?: [number, number][][]
  endstops?: RouteEndstop[]
  streets?: string[]
  /** Nama jalan per chain (selaras dengan `segments ?? [polyline]`), format [indeksTitikAwal, namaJalan]. */
  streetRuns?: [number, string][][]
}

export interface Vehicle {
  id: string
  plate: string
  routeId: string
  routeCode: string
  routeName: string
  driverName: string
  status: VehicleStatus
  position: [number, number]
  heading: number
  speedKph: number
  etaMinutes: number
  seatsAvailable: number
  driverVerified?: boolean
  lastSeenAt?: number
}

export type ReportStatus = 'diterima' | 'diproses' | 'selesai'
export type ReportCategory = 'pengemudi' | 'fasilitas' | 'tarif' | 'lainnya'

export interface Report {
  id: string
  code: string
  category: ReportCategory
  subject: string
  description: string
  status: ReportStatus
  createdAt: string
  plate?: string
  response?: string
}
