import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  BatteryCharging,
  BusFront,
  Clock3,
  Gauge,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import { toast } from 'sonner'

import { DriverModeBadge } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/features/auth/auth-store'
import { distanceKm } from '@/lib/geo'
import { routes, vehicles } from '@/mocks/data'
import { cn } from '@/lib/cn'
import type { DriverMode } from '@/types'

const AUTO_NGETEM_SECONDS = 90

const vehicle = vehicles[0]
const route = routes.find((item) => item.id === vehicle?.routeId) ?? routes[0]
const routePolyline = route?.polyline ?? []

const passengers = [
  { id: 'pax-1', name: 'Rina', destination: 'Simpang Dago', offset: 1, wait: '4 mnt' },
  { id: 'pax-2', name: 'Budi', destination: 'Cihampelas', offset: 2, wait: '7 mnt' },
  { id: 'pax-3', name: 'Tuti', destination: 'Dago', offset: 3, wait: '2 mnt' },
]

function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

const modeOptions: { value: DriverMode; label: string; detail: string }[] = [
  { value: 'narik', label: 'Narik', detail: 'Menerima penumpang' },
  { value: 'ngetem', label: 'Ngetem', detail: 'Menunggu di halte' },
  { value: 'istirahat', label: 'Istirahat', detail: 'Jeda sementara' },
  { value: 'offline', label: 'Offline', detail: 'Tidak menerima order' },
]

const modeColor: Record<DriverMode, string> = {
  narik: 'bg-brand text-white',
  ngetem: 'bg-sky text-sky-ink',
  istirahat: 'bg-peach text-amber-900',
  offline: 'bg-muted text-ink',
}

function vehicleIcon(active: boolean) {
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <span style="background:#004425;color:#fff;border-radius:9999px;padding:5px 10px;font-size:11px;font-weight:800;line-height:1;box-shadow:0 4px 14px rgba(0,0,0,.25);white-space:nowrap;border:2px solid ${active ? '#b1f1c4' : '#fff'}">
          ${vehicle?.plate ?? 'Angkot'}
        </span>
        <span style="width:2px;height:7px;background:#004425"></span>
        <span style="width:9px;height:9px;border-radius:9999px;background:#004425;box-shadow:0 0 0 4px rgba(177,241,196,.65)"></span>
      </div>
    `,
  })
}

function passengerIcon(index: number) {
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <span style="background:#325F99;color:#fff;border-radius:9999px;width:24px;height:24px;display:grid;place-items:center;font-size:10px;font-weight:800;box-shadow:0 3px 10px rgba(0,0,0,.22);border:2px solid #fff">${index + 1}</span>
        <span style="width:2px;height:6px;background:#325F99"></span>
        <span style="width:6px;height:6px;border-radius:9999px;background:#325F99;box-shadow:0 0 0 3px rgba(255,255,255,.7)"></span>
      </div>
    `,
  })
}

export function DriverMapPage() {
  const user = useAuthStore((state) => state.user)
  const [mode, setMode] = useState<DriverMode>('narik')
  const [gpsOn, setGpsOn] = useState(true)
  const [positionIndex, setPositionIndex] = useState(2)
  const [speedKph, setSpeedKph] = useState(24)
  const [stoppedSeconds, setStoppedSeconds] = useState(0)
  const [passengerRadius, setPassengerRadius] = useState(2)
  const [wakeLockOn, setWakeLockOn] = useState(false)
  const ngetemPromptedRef = useRef(false)

  const position = routePolyline[positionIndex] ?? routePolyline[0]

  const nearbyPassengers = useMemo(
    () =>
      passengers.map((passenger) => {
        const passengerPosition =
          routePolyline[(positionIndex + passenger.offset) % routePolyline.length] ??
          routePolyline[0]
        return {
          ...passenger,
          position: passengerPosition,
          distance: position && passengerPosition ? distanceKm(position, passengerPosition) : 0,
        }
      }),
    [positionIndex, position],
  )

  const passengerPoints = nearbyPassengers.filter(
    (passenger) => passenger.distance <= passengerRadius,
  )

  useEffect(() => {
    if (mode !== 'narik' || !gpsOn || speedKph > 5) return
    const timer = window.setInterval(() => {
      setStoppedSeconds((current) => current + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [gpsOn, mode, speedKph])

  useEffect(() => {
    if (stoppedSeconds < AUTO_NGETEM_SECONDS || mode !== 'narik') return
    if (ngetemPromptedRef.current) return
    ngetemPromptedRef.current = true
    toast.warning('Kendaraan berhenti 90 detik', {
      description: 'Ubah status ke Ngetem agar penumpang tahu kamu sedang menunggu.',
      action: {
        label: 'Ubah ke Ngetem',
        onClick: () => {
          ngetemPromptedRef.current = false
          setStoppedSeconds(0)
          setMode('ngetem')
        },
      },
      duration: 12000,
    })
  }, [mode, stoppedSeconds])

  useEffect(() => {
    if (mode !== 'narik' || !gpsOn || !('wakeLock' in navigator)) return
    let cancelled = false
    let sentinel: WakeLockSentinel | null = null
    navigator.wakeLock
      .request('screen')
      .then((lock) => {
        sentinel = lock
        if (!cancelled) setWakeLockOn(true)
      })
      .catch(() => {
        if (!cancelled) setWakeLockOn(false)
      })
    return () => {
      cancelled = true
      setWakeLockOn(false)
      void sentinel?.release()
    }
  }, [gpsOn, mode])

  useEffect(() => {
    if (mode !== 'narik' || !gpsOn) return
    const timer = window.setInterval(() => {
      setPositionIndex((current) => (current + 1) % Math.max(routePolyline.length, 1))
    }, 2600)
    return () => window.clearInterval(timer)
  }, [mode, gpsOn])

  function sendLocation() {
    toast.success('Lokasi terkirim', {
      description: 'Posisi kendaraan diperbarui untuk penumpang di sekitar rute.',
    })
  }

  function changeMode(next: DriverMode) {
    setMode(next)
    setStoppedSeconds(0)
    ngetemPromptedRef.current = false
  }

  function toggleGps() {
    setGpsOn((current) => !current)
    setStoppedSeconds(0)
    ngetemPromptedRef.current = false
  }

  function toggleSpeed() {
    setSpeedKph((current) => (current > 0 ? 0 : 24))
    setStoppedSeconds(0)
    ngetemPromptedRef.current = false
  }

  return (
    <div className="container-page py-6 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Mode pengemudi</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Peta kerja
            <DriverModeBadge mode={mode} />
          </h1>
          <p className="mt-1 text-sm text-ink">
            {user?.name ?? 'Pengemudi'} · {vehicle?.plate} · Jurusan {route?.code}
          </p>
        </div>
        <Badge variant={gpsOn ? 'leaf' : 'neutral'} className="gap-1.5">
          <Radio size={12} />
          {gpsOn ? 'GPS aktif' : 'GPS nonaktif'}
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="relative h-[360px] md:h-[540px]">
            <MapContainer
              center={position ?? [-6.9039, 107.618]}
              zoom={14}
              scrollWheelZoom={false}
              className="h-full w-full"
              attributionControl={false}
            >
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {routePolyline.length > 0 ? (
                <Polyline
                  positions={routePolyline}
                  pathOptions={{ color: route?.color ?? '#1F5C3A', weight: 5, opacity: 0.9 }}
                />
              ) : null}
              {position ? <Marker position={position} icon={vehicleIcon(gpsOn)} /> : null}
              {passengerPoints.map(
                (passenger, index) =>
                  passenger.position && (
                    <Marker
                      key={passenger.id}
                      position={passenger.position}
                      icon={passengerIcon(index)}
                    />
                  ),
              )}
            </MapContainer>

            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
              <div className="rounded-md border border-line-soft bg-surface/95 px-3 py-2 shadow-soft backdrop-blur">
                <p className="text-[10px] font-semibold text-ink">Kecepatan</p>
                <p className="text-lg leading-none font-extrabold text-ink-strong">
                  {mode === 'ngetem' || mode === 'istirahat' ? 0 : speedKph}
                  <span className="ml-1 text-[10px] font-medium text-ink">km/j</span>
                </p>
                {mode === 'narik' && speedKph <= 5 ? (
                  <p className="mt-0.5 text-[9px] text-warning">
                    Berhenti {stoppedSeconds}/{AUTO_NGETEM_SECONDS} detik
                  </p>
                ) : null}
              </div>
              <div className="rounded-md border border-line-soft bg-surface/95 px-3 py-2 text-right shadow-soft backdrop-blur">
                <p className="text-[10px] font-semibold text-ink">Penumpang sekitar</p>
                <p className="text-lg leading-none font-extrabold text-brand-strong">
                  {passengerPoints.length}
                  <span className="ml-1 text-[10px] font-medium text-ink">orang</span>
                </p>
              </div>
            </div>

            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-md border border-line-soft bg-surface/95 px-3 py-2 text-[10px] text-ink shadow-soft backdrop-blur">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand" />
                Kendaraanmu
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-sky-ink" />
                Penumpang megat
              </span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <LocateFixed size={11} className="text-brand" />
                {gpsOn ? 'Lokasi terkirim tiap 5 detik' : 'Aktifkan GPS untuk berbagi lokasi'}
                {wakeLockOn ? ' | layar aktif' : ''}
              </span>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-strong">Status kendaraan</h2>
                <DriverModeBadge mode={mode} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {modeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      changeMode(option.value)
                      toast.info(`Status diubah ke ${option.label}`)
                    }}
                    className={cn(
                      'rounded-md border p-2.5 text-left transition',
                      mode === option.value
                        ? cn('border-transparent', modeColor[option.value])
                        : 'border-line-soft bg-surface text-ink hover:border-brand/30',
                    )}
                  >
                    <span className="block text-xs font-bold">{option.label}</span>
                    <span
                      className={cn(
                        'mt-0.5 block text-[10px]',
                        mode === option.value ? 'opacity-80' : 'text-ink-soft',
                      )}
                    >
                      {option.detail}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-3">
                <div>
                  <p className="text-xs font-semibold text-ink-strong">Kirim GPS berkala</p>
                  <p className="text-[10px] text-ink">Bagikan posisi ke penumpang di rute ini.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={gpsOn}
                  aria-label="Kirim GPS berkala"
                  onClick={toggleGps}
                  className={cn(
                    'relative h-5 w-9 shrink-0 rounded-full transition',
                    gpsOn ? 'bg-brand' : 'bg-line',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition',
                      gpsOn && 'translate-x-4',
                    )}
                  />
                </button>
              </div>

              <Button size="sm" className="mt-3 w-full" onClick={sendLocation} disabled={!gpsOn}>
                <Navigation size={14} />
                Kirim lokasi sekarang
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={toggleSpeed}
              >
                <Gauge size={14} />
                {speedKph > 0 ? 'Simulasi berhenti di halte' : 'Mulai jalan lagi'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                  <Users size={15} className="text-brand" />
                  Penumpang menunggu
                </h2>
                <Badge variant="sky">{passengerPoints.length} megat</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {[0.5, 1, 2].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setPassengerRadius(radius)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-semibold transition',
                      passengerRadius === radius
                        ? 'bg-brand-strong text-white'
                        : 'bg-muted text-ink hover:bg-line',
                    )}
                  >
                    {radius} km
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {passengerPoints.map((passenger, index) => (
                  <div
                    key={passenger.id}
                    className="flex items-center gap-2.5 rounded-md border border-line-soft p-2.5"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sky text-[10px] font-bold text-sky-ink">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink-strong">
                        {passenger.name} · {passenger.destination}
                      </p>
                      <p className="text-[10px] text-ink">
                        {formatDistance(passenger.distance)} dari kendaraan | menunggu{' '}
                        {passenger.wait}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() =>
                        toast.success(`Menuju ${passenger.name}`, {
                          description: `Penumpang diarahkan ke ${vehicle?.plate}.`,
                        })
                      }
                    >
                      Jemput
                    </Button>
                  </div>
                ))}
                {passengerPoints.length === 0 ? (
                  <div className="rounded-md border border-dashed border-line p-4 text-center">
                    <p className="text-xs font-semibold text-ink-strong">Belum ada megat</p>
                    <p className="text-[10px] text-ink">
                      Tidak ada penumpang dalam radius {passengerRadius} km.
                    </p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Jarak hari ini', value: '42 km', icon: Gauge },
              { label: 'Trip', value: '8', icon: BusFront },
              { label: 'Tip', value: 'Rp 15k', icon: Wallet },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-3 text-center">
                  <stat.icon size={14} className="mx-auto text-brand" />
                  <p className="mt-1 text-sm leading-none font-extrabold text-ink-strong">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[9px] text-ink">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="flex items-center gap-2 p-3 text-[10px] text-ink">
              <BatteryCharging size={14} className="text-brand" />
              Baterai 78% · sinyal kuat
              <span className="ml-auto flex items-center gap-1">
                <Clock3 size={11} />
                Sesi 2j 14m
              </span>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[10px] text-ink-soft">
        <MapPin size={11} />
        Posisi disimulasikan untuk demo. Di produksi, GPS dikirim dari perangkat pengemudi.
      </p>
    </div>
  )
}
