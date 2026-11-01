import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ArrowLeft,
  CheckCircle2,
  Crosshair,
  Footprints,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge, VehicleStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isVehicleStale, useLiveVehicles } from '@/features/tracking/use-live-vehicles'
import { routes, vehicles } from '@/mocks/data'
import { cn } from '@/lib/cn'
import { distanceKm, nearestRoutePoint } from '@/lib/geo'
import type { Vehicle } from '@/types'

const center: [number, number] = [-6.9039, 107.618]
const USER_POSITION: [number, number] = [-6.9024, 107.6088]
const MEGAT_TIMEOUT_SECONDS = 60
const MEGAT_MATCH_DELAY_MS = 8000
const userNearestRoute = nearestRoutePoint(USER_POSITION, routes)

type MegatMode = 'idle' | 'walking' | 'searching' | 'matched'

const radiusOptions: { label: string; value: number | null }[] = [
  { label: 'Semua', value: null },
  { label: '1 km', value: 1 },
  { label: '3 km', value: 3 },
  { label: '5 km', value: 5 },
]

const statusColor: Record<Vehicle['status'], string> = {
  jalan: '#1F5C3A',
  merayap: '#B45309',
  ngetem: '#2563EB',
  istirahat: '#707971',
  offline: '#707971',
}

function markerIcon(vehicle: Vehicle, selected: boolean) {
  const color = statusColor[vehicle.status]
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:auto">
        <span style="background:${color};color:#fff;border-radius:9999px;padding:4px 9px;font-size:11px;font-weight:700;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.22);white-space:nowrap;border:2px solid ${selected ? '#fff' : 'transparent'}">
          ${vehicle.routeCode}
        </span>
        <span style="width:2px;height:7px;background:${color}"></span>
        <span style="width:7px;height:7px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(255,255,255,.6)"></span>
      </div>
    `,
  })
}

function userIcon() {
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <span style="background:#325F99;color:#fff;border-radius:9999px;padding:4px 9px;font-size:10px;font-weight:800;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.22);white-space:nowrap;border:2px solid #fff">
          Lokasi Anda
        </span>
        <span style="width:2px;height:7px;background:#325F99"></span>
        <span style="width:8px;height:8px;border-radius:9999px;background:#325F99;box-shadow:0 0 0 4px rgba(50,95,153,.28)"></span>
      </div>
    `,
  })
}

function MapController({
  position,
  focusKey,
}: {
  position: [number, number] | null
  focusKey: string | null
}) {
  const map = useMap()
  const positionRef = useRef(position)

  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    if (!positionRef.current) return
    map.flyTo(positionRef.current, Math.max(map.getZoom(), 14), { duration: 0.7 })
  }, [focusKey, map])

  return null
}

function VehicleCard({
  vehicle,
  active,
  onSelect,
}: {
  vehicle: Vehicle
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-md border p-3 text-left transition',
        active
          ? 'border-brand bg-leaf/50'
          : 'border-line-soft bg-surface hover:border-brand/40 hover:bg-muted/40',
      )}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-md text-xs font-extrabold text-white"
        style={{ backgroundColor: statusColor[vehicle.status] }}
      >
        {vehicle.routeCode}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-ink-strong">{vehicle.routeName}</span>
        <span className="mt-0.5 block truncate text-[11px] text-ink">
          {vehicle.plate} · {vehicle.driverName}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <VehicleStatusBadge status={vehicle.status} />
        <span className="text-[11px] font-semibold text-ink-strong">{vehicle.etaMinutes} mnt</span>
        {isVehicleStale(vehicle) ? (
          <span className="text-[9px] font-semibold text-warning">GPS tertunda</span>
        ) : null}
      </span>
    </button>
  )
}

function VehicleDetail({
  vehicle,
  onBack,
}: {
  vehicle: Vehicle
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-brand-strong hover:underline"
      >
        <ArrowLeft size={14} />
        Kembali ke daftar
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-md px-2 py-1 text-[11px] font-extrabold text-white"
              style={{ backgroundColor: statusColor[vehicle.status] }}
            >
              {vehicle.routeCode}
            </span>
            <VehicleStatusBadge status={vehicle.status} />
          </div>
          <h2 className="mt-2 text-base font-bold text-ink-strong">{vehicle.routeName}</h2>
          <p className="text-xs text-ink">{vehicle.plate}</p>
        </div>
        <div className="rounded-md bg-leaf px-3 py-2 text-center">
          <p className="text-lg leading-none font-extrabold text-brand-strong">
            {vehicle.etaMinutes}
          </p>
          <p className="text-[10px] text-brand-strong/70">menit</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-line-soft p-3">
          <p className="text-[10px] text-ink-soft">Pengemudi</p>
          <p className="mt-0.5 text-xs font-semibold text-ink-strong">{vehicle.driverName}</p>
        </div>
        <div className="rounded-md border border-line-soft p-3">
          <p className="text-[10px] text-ink-soft">Kecepatan</p>
          <p className="mt-0.5 text-xs font-semibold text-ink-strong">{vehicle.speedKph} km/jam</p>
        </div>
        <div className="rounded-md border border-line-soft p-3">
          <p className="text-[10px] text-ink-soft">Kursi tersedia</p>
          <p className="mt-0.5 text-xs font-semibold text-ink-strong">
            {vehicle.seatsAvailable} kursi
          </p>
        </div>
        <div className="rounded-md border border-line-soft p-3">
          <p className="text-[10px] text-ink-soft">Arah</p>
          <p className="mt-0.5 text-xs font-semibold text-ink-strong">{vehicle.heading}°</p>
        </div>
      </div>

      <div className="rounded-md bg-muted p-3 text-[11px] leading-relaxed text-ink">
        {isVehicleStale(vehicle)
          ? 'Data GPS terakhir lebih dari 15 detik. Posisi mungkin sudah berubah.'
          : 'Posisi diperbarui setiap 3 detik. ETA dihitung dari posisi Anda ke titik angkot saat ini.'}
      </div>

      <Button
        className="w-full"
        onClick={() =>
          toast.success('Panduan ke titik angkot aktif', {
            description: `Ikuti arah menuju ${vehicle.plate} di rute ${vehicle.routeCode}.`,
          })
        }
      >
        <Navigation size={16} />
        Pandu saya ke titik angkot
      </Button>
    </div>
  )
}

export function MapScreen({ passengerMode = false }: { passengerMode?: boolean }) {
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState(searchParams.get('to') ?? '')
  const [routeFilter, setRouteFilter] = useState<string>(searchParams.get('route') ?? 'semua')
  const [radiusKm, setRadiusKm] = useState<number | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [megatMode, setMegatMode] = useState<MegatMode>('idle')
  const [megatSeconds, setMegatSeconds] = useState(MEGAT_TIMEOUT_SECONDS)
  const [matchedVehicleId, setMatchedVehicleId] = useState<string | null>(null)

  const liveVehicles = useLiveVehicles(vehicles)
  const availableVehicles = useMemo(
    () => liveVehicles.filter((vehicle) => vehicle.driverVerified !== false),
    [liveVehicles],
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return availableVehicles.filter((vehicle) => {
      const matchesRoute = routeFilter === 'semua' || vehicle.routeId === routeFilter
      const matchesQuery =
        !term ||
        vehicle.routeName.toLowerCase().includes(term) ||
        vehicle.plate.toLowerCase().includes(term) ||
        vehicle.driverName.toLowerCase().includes(term)
      const matchesRadius =
        radiusKm === null || distanceKm(USER_POSITION, vehicle.position) <= radiusKm
      return matchesRoute && matchesQuery && matchesRadius
    })
  }, [availableVehicles, query, radiusKm, routeFilter])

  const selected = availableVehicles.find((vehicle) => vehicle.id === selectedId) ?? null
  const matchedVehicle = availableVehicles.find((vehicle) => vehicle.id === matchedVehicleId) ?? null
  const megatDistanceMeters = Math.round((userNearestRoute?.distanceKm ?? 0) * 1000)

  useEffect(() => {
    if (megatMode !== 'searching') return

    const deadline = Date.now() + MEGAT_TIMEOUT_SECONDS * 1000

    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setMegatSeconds(left)

      if (left === 0) {
        setMegatMode('idle')
        setMatchedVehicleId(null)
        toast.error('Permintaan megat kedaluwarsa', {
          description: 'Tidak ada pengemudi yang merespons. Silakan coba lagi.',
        })
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [megatMode])

  useEffect(() => {
    if (megatMode !== 'searching' || !matchedVehicleId) return

    const timer = window.setTimeout(() => {
      setMegatMode('matched')
      setSelectedId(matchedVehicleId)
      setShowDetail(false)
      const vehicle = vehicles.find((item) => item.id === matchedVehicleId)
      toast.success('Pengemudi ditemukan', {
        description: `${vehicle?.plate ?? 'Angkot'} menuju titik jemput Anda.`,
      })
    }, MEGAT_MATCH_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [matchedVehicleId, megatMode])

  function handleSelect(vehicle: Vehicle) {
    setSelectedId(vehicle.id)
    setShowDetail(true)
  }

  function handleMegat() {
    const nearest = userNearestRoute
    const candidate =
      availableVehicles.find(
        (vehicle) => vehicle.status === 'jalan' && vehicle.routeId === nearest?.route.id,
      ) ??
      availableVehicles.find((vehicle) => vehicle.status === 'jalan') ??
      availableVehicles[0]

    if (!candidate) {
      toast.error('Belum ada angkot aktif', {
        description: 'Coba lagi beberapa saat lagi.',
      })
      return
    }

    setMatchedVehicleId(candidate.id)
    setMegatSeconds(MEGAT_TIMEOUT_SECONDS)

    const isOutsideRoute = (nearest?.distanceKm ?? 0) > 0.35
    setMegatMode(isOutsideRoute ? 'walking' : 'searching')

    if (isOutsideRoute) {
      toast.info('Anda di luar area rute', {
        description: `Jalan kaki ${megatDistanceMeters} m ke ${nearest?.route.code ?? 'rute terdekat'}.`,
      })
    } else {
      toast.success('Permintaan megat dikirim', {
        description: 'Pengemudi di sekitar rute melihat posisi Anda.',
      })
    }
  }

  function handleCancelMegat() {
    setMegatMode('idle')
    setMatchedVehicleId(null)
    setMegatSeconds(MEGAT_TIMEOUT_SECONDS)
    toast.info('Megat dibatalkan')
  }

  function handleAtRoute() {
    setMegatMode('searching')
    setMegatSeconds(MEGAT_TIMEOUT_SECONDS)
    toast.info('Mode mencari pengemudi aktif', {
      description: 'Pengemudi di sekitar rute sekarang dapat melihat posisi Anda.',
    })
  }

  return (
    <section className="relative h-[calc(100svh-4rem)] min-h-[560px] w-full overflow-hidden bg-muted md:h-[calc(100svh-5rem)]">
      <MapContainer
        center={center}
        zoom={13}
        zoomControl={false}
        scrollWheelZoom
        className="absolute inset-0 z-0 h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.polyline}
            pathOptions={{
              color: route.color,
              weight: 4,
              opacity: routeFilter === 'semua' || routeFilter === route.id ? 0.75 : 0.15,
              dashArray: '1 0',
            }}
          />
        ))}
        {filtered.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={vehicle.position}
            icon={markerIcon(vehicle, vehicle.id === selectedId)}
            eventHandlers={{ click: () => handleSelect(vehicle) }}
          />
        ))}
        {passengerMode ? (
          <>
            {megatMode === 'walking' && userNearestRoute ? (
              <Polyline
                positions={[USER_POSITION, userNearestRoute.point]}
                pathOptions={{ color: '#325F99', weight: 3, dashArray: '6 6' }}
              />
            ) : null}
            <Marker position={USER_POSITION} icon={userIcon()} />
          </>
        ) : null}
        <MapController
          position={
            megatMode === 'walking' || megatMode === 'searching'
              ? USER_POSITION
              : (selected?.position ?? null)
          }
          focusKey={
            megatMode === 'walking' || megatMode === 'searching'
              ? 'user-megat'
              : selectedId
          }
        />
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-[400]">
        <div className="pointer-events-auto absolute top-3 left-3 right-3 flex flex-col gap-3 md:top-4 md:left-4 md:right-auto md:w-[400px]">
          <div className="rounded-lg border border-line-soft bg-surface p-3 shadow-float">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari tujuan, jurusan, plat, atau pengemudi..."
                className="h-10 pl-10"
                aria-label="Cari angkot"
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <Button
                type="button"
                size="sm"
                variant={routeFilter === 'semua' ? 'primary' : 'soft'}
                className="h-8 shrink-0 px-2.5 text-[11px]"
                onClick={() => setRouteFilter('semua')}
              >
                <SlidersHorizontal size={12} />
                Semua
              </Button>
              {routes.map((route) => (
                <Button
                  key={route.id}
                  type="button"
                  size="sm"
                  variant={routeFilter === route.id ? 'primary' : 'soft'}
                  className="h-8 shrink-0 px-2.5 text-[11px]"
                  onClick={() => setRouteFilter(route.id)}
                >
                  {route.code}
                </Button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <span className="mr-0.5 text-[10px] font-semibold text-ink-soft">Radius</span>
              {radiusOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setRadiusKm(option.value)}
                  className={cn(
                    'rounded-full px-2 py-1 text-[10px] font-semibold transition',
                    radiusKm === option.value
                      ? 'bg-brand text-white'
                      : 'bg-muted text-ink hover:bg-muted-strong',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[38svh] overflow-y-auto rounded-lg border border-line-soft bg-surface/95 p-3 shadow-float backdrop-blur md:max-h-[calc(100svh-14rem)]">
            {showDetail && selected ? (
              <VehicleDetail vehicle={selected} onBack={() => setShowDetail(false)} />
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-bold text-ink-strong">
                    Angkot di sekitar
                    <span className="ml-1 font-medium text-ink-soft">({filtered.length})</span>
                  </p>
                  <span className="flex items-center gap-1 text-[10px] text-ink-soft">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
                    </span>
                    Live
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {filtered.map((vehicle) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      active={vehicle.id === selectedId}
                      onSelect={() => handleSelect(vehicle)}
                    />
                  ))}
                  {filtered.length === 0 ? (
                    <p className="py-6 text-center text-xs text-ink">
                      Tidak ada angkot yang cocok. Coba ubah filter.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="pointer-events-auto absolute top-3 right-3 hidden flex-col gap-2 md:top-4 md:right-4 md:flex">
          <Button
            variant="outline"
            size="icon"
            className="size-10 bg-surface/95 backdrop-blur"
            aria-label="Pusatkan ke lokasi saya"
            onClick={() => toast('Lokasi Anda: Bandung', { description: 'GPS presisi ±4 m' })}
          >
            <LocateFixed size={17} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-10 bg-surface/95 backdrop-blur"
            aria-label="Filter radius"
            onClick={() => {
              const currentIndex = radiusOptions.findIndex((option) => option.value === radiusKm)
              const next = radiusOptions[(currentIndex + 1) % radiusOptions.length]
              setRadiusKm(next.value)
              toast.info(`Radius ${next.label}`, {
                description: 'Filter armada di sekitar lokasi Anda.',
              })
            }}
          >
            <Crosshair size={17} />
          </Button>
        </div>

        <div className="pointer-events-auto absolute bottom-3 left-1/2 flex w-full max-w-[460px] -translate-x-1/2 flex-col items-center gap-2 px-3 md:bottom-4">
          <div className="hidden items-center gap-3 rounded-md border border-line-soft bg-surface/90 px-3.5 py-2 shadow-float backdrop-blur md:flex">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
              <span className="size-2 rounded-full bg-brand" /> Jalan
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
              <span className="size-2 rounded-full bg-warning" /> Merayap
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
              <span className="size-2 rounded-full bg-info" /> Ngetem
            </span>
          </div>

          {passengerMode && megatMode !== 'idle' ? (
            <div className="w-full rounded-lg border border-line-soft bg-surface/95 p-3 shadow-float backdrop-blur">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full',
                    megatMode === 'matched'
                      ? 'bg-leaf text-brand-strong'
                      : megatMode === 'searching'
                        ? 'bg-sky text-sky-ink'
                        : 'bg-peach text-amber-900',
                  )}
                >
                  {megatMode === 'matched' ? (
                    <CheckCircle2 size={17} />
                  ) : megatMode === 'searching' ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Footprints size={17} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ink-strong">
                    {megatMode === 'walking'
                      ? 'Menuju titik rute terdekat'
                      : megatMode === 'searching'
                        ? 'Mencari pengemudi'
                        : 'Pengemudi ditemukan'}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-ink">
                    {megatMode === 'walking'
                      ? `Jalan kaki ${megatDistanceMeters} m ke ${userNearestRoute?.route.code ?? 'rute terdekat'}.`
                      : megatMode === 'searching'
                        ? `Megat aktif. Pengemudi di sekitar rute melihat posisi Anda. Sisa ${megatSeconds} detik.`
                        : `${matchedVehicle?.plate ?? 'Angkot'} — ${matchedVehicle?.driverName ?? 'pengemudi'} menuju lokasi Anda.`}
                  </p>
                  {megatMode === 'searching' ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${(megatSeconds / MEGAT_TIMEOUT_SECONDS) * 100}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {megatMode === 'walking' ? (
                  <Button size="sm" onClick={handleAtRoute}>
                    <Navigation size={13} />
                    Saya di titik rute
                  </Button>
                ) : null}
                {megatMode === 'matched' ? (
                  <Button size="sm" asChild>
                    <Link to="/penumpang/perjalanan">
                      <MapPin size={13} />
                      Naik angkot
                    </Link>
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={handleCancelMegat}>
                  <X size={13} />
                  Batalkan
                </Button>
              </div>
            </div>
          ) : null}

          {passengerMode ? (
            megatMode === 'idle' ? (
              <Button size="lg" className="rounded-full px-6 shadow-float" onClick={handleMegat}>
                <MapPin size={17} />
                Megat Angkot
              </Button>
            ) : null
          ) : (
            <Button size="lg" className="rounded-full px-6 shadow-float" asChild>
              <Link
                to={
                  query.trim()
                    ? `/rute?to=${encodeURIComponent(query.trim())}`
                    : '/rute'
                }
              >
                <Navigation size={17} />
                Cari Rute ke Tujuan
              </Link>
            </Button>
          )}
        </div>

        <div className="pointer-events-none absolute right-3 bottom-20 flex items-center gap-1.5 rounded-full border border-line-soft bg-surface/90 px-3 py-1.5 text-[10px] font-medium text-ink shadow-soft backdrop-blur md:right-4 md:bottom-4">
          <Users size={12} className="text-brand" />
          {availableVehicles.length} angkot aktif
        </div>
      </div>

      <Badge className="absolute top-3 left-1/2 z-[401] hidden -translate-x-1/2 bg-brand-strong text-white md:flex">
        Simulasi GPS · pembaruan tiap 3 detik
      </Badge>
    </section>
  )
}
