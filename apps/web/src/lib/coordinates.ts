import type { LatLng } from './geo.ts'

export function parseCoordinates(latitude: string, longitude: string): LatLng | null {
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/
  const lat = latitude.trim()
  const lng = longitude.trim()
  if (!decimal.test(lat) || !decimal.test(lng)) return null
  const point: LatLng = [Number(lat), Number(lng)]
  return Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180 ? point : null
}

export function parseCoordinatePair(value: string | null): LatLng | null {
  const parts = value?.trim().split(',')
  return parts?.length === 2 ? parseCoordinates(parts[0], parts[1]) : null
}

export function coordinateLabel([lat, lng]: LatLng) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}
