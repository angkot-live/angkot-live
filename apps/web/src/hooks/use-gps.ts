import { useEffect, useState } from 'react'
import { locationErrorMessage } from '@/lib/geolocation'

export function useGps(enabled: boolean) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [wasEnabled, setWasEnabled] = useState(enabled)
  if (wasEnabled !== enabled) {
    setWasEnabled(enabled)
    setPosition(null)
    setError(null)
  }
  useEffect(() => {
    if (!enabled) return
    if (!window.isSecureContext || !navigator.geolocation) return
    let stopped = false,
      pending = false
    const accept = (fix: GeolocationPosition) => {
      if (!stopped) {
        if (
          !Number.isFinite(fix.coords.latitude) ||
          !Number.isFinite(fix.coords.longitude) ||
          !Number.isFinite(fix.coords.accuracy) ||
          fix.coords.accuracy <= 0 ||
          Date.now() - fix.timestamp > 15000 ||
          fix.timestamp > Date.now() + 5000
        ) {
          setError('GPS belum menghasilkan sampel yang segar dan valid.')
          return
        }
        setPosition(fix)
        setError(
          fix.coords.accuracy > 50
            ? 'Akurasi GPS belum memadai. Pindah ke area terbuka dan coba lagi.'
            : null,
        )
      }
    }
    const reject = (e: GeolocationPositionError) => {
      if (!stopped) setError(locationErrorMessage(e))
    }
    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    const id = navigator.geolocation.watchPosition(accept, reject, options)
    const timer = setInterval(() => {
      if (pending || document.visibilityState !== 'visible') return
      pending = true
      navigator.geolocation.getCurrentPosition(
        (fix) => {
          pending = false
          accept(fix)
        },
        (e) => {
          pending = false
          reject(e)
        },
        options,
      )
    }, 3000)
    return () => {
      stopped = true
      clearInterval(timer)
      navigator.geolocation.clearWatch(id)
    }
  }, [enabled])
  return {
    position: enabled ? position : null,
    error: enabled
      ? !window.isSecureContext
        ? 'Lokasi memerlukan HTTPS atau localhost.'
        : !navigator.geolocation
          ? 'GPS tidak didukung browser ini.'
          : error
      : null,
  }
}
export function fixPayload(fix: GeolocationPosition) {
  return {
    position: [fix.coords.latitude, fix.coords.longitude] as [number, number],
    accuracy: fix.coords.accuracy,
    speedKph: Number.isFinite(fix.coords.speed)
      ? Math.max(0, (fix.coords.speed ?? 0) * 3.6)
      : 0,
    inferSpeed: fix.coords.speed === null || !Number.isFinite(fix.coords.speed),
    heading: Number.isFinite(fix.coords.heading)
      ? (fix.coords.heading ?? 0)
      : 0,
    sampledAt: fix.timestamp,
  }
}
