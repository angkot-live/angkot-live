import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  AlertCircle,
  ArrowDownUp,
  ArrowLeft,
  BusFront,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Crosshair,
  Footprints,
  Landmark,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Route as RouteIcon,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, Circle, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge, VehicleStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  landmarkPlaces,
  placeFromCoordinates,
  resolvePlace,
  reverseLandmark,
  searchLocalPlaces,
  type Place,
} from '@/features/routing/geocode'
import { PlaceInput } from '@/features/routing/place-input'
import { coordinateLabel, parseCoordinatePair } from '@/lib/coordinates'
import { directTripPlan, type DirectRecommendation } from '@/features/routing/direct-plan'
import { walkingRouter } from '@/features/routing/walking-router'
import {
  type Itinerary,
  type TripPlan,
  type TripTransfer,
  type TripWalk,
} from '@/features/routing/trip-planner'
import { useAuthStore } from '@/features/auth/auth-store'
import { megatStore, useMegat } from '@/features/tracking/use-megat'
import { activeMegat, projectToRoute, MEGAT_WAIT_MS } from '@/features/tracking/megat-engine'
import { isVehicleStale, useLiveVehicles } from '@/features/tracking/use-live-vehicles'
import {
  groupRouteDirections,
  vehiclesForRouteSelection,
  vehiclesWithinRadius,
} from '@/features/tracking/route-directory'
import { useRoutes } from '@/features/routes/use-routes'
import { cn } from '@/lib/cn'
import { useLiveStore } from '@/features/tracking/live-store'
import { pickupEta } from '@/features/tracking/eta'
import { api, errorMessage } from '@/lib/api'
import { useGps } from '@/hooks/use-gps'
import { getCurrentLocation, locationErrorMessage } from '@/lib/geolocation'
import { distanceKm, nearestRoutePoint, type LatLng } from '@/lib/geo'
import type { RouteInfo, Vehicle } from '@/types'

const center: [number, number] = [-6.9039, 107.618]
const MEGAT_TIMEOUT_SECONDS = MEGAT_WAIT_MS / 1000

type MegatMode = 'idle' | 'walking' | 'searching' | 'matched'

const radiusOptions: { label: string; value: number | null }[] = [
  { label: 'Semua', value: null },
  { label: '100 m', value: 0.1 },
  { label: '300 m', value: 0.3 },
  { label: '500 m', value: 0.5 },
  { label: '1 km', value: 1 },
  { label: '3 km', value: 3 },
  { label: '5 km', value: 5 },
]

const FALLBACK_VEHICLE_LIMIT = 5

function radiusLabel(radiusKm: number | null) {
  if (radiusKm === null) return 'Semua'
  return radiusKm < 1 ? `${Math.round(radiusKm * 1000)} m` : `${radiusKm} km`
}

const statusColor: Record<Vehicle['status'], string> = {
  jalan: '#1F5C3A',
  merayap: '#B45309',
  ngetem: '#2563EB',
  istirahat: '#707971',
  offline: '#707971',
}

const exampleRoutes: { from: string; to: string }[] = [
  { from: 'Sarijadi', to: "Mall d'Botanica Bandung" },
  { from: 'Sarijadi', to: 'Gedung Sate' },
  { from: 'Stasiun Bandung (Stasiun Hall)', to: 'Simpang Dago' },
  { from: 'Alun-Alun Bandung', to: 'Paris Van Java (PVJ)' },
  { from: 'Alun-Alun Bandung', to: 'Trans Studio Mall (TSM)' },
]

function findLandmark(name: string) {
  const normalized = name.toLowerCase().trim()
  const exact = landmarkPlaces.find(
    (place) =>
      place.name.toLowerCase() === normalized ||
      place.name.toLowerCase().includes(normalized) ||
      normalized.includes(place.name.toLowerCase()),
  )
  if (exact) return exact
  const found = searchLocalPlaces(name, 1)
  return found[0] ?? null
}

function shortStreet(name: string) {
  return name.replace(/^Jalan\s+/i, 'Jl. ')
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`
}

function transferWalkText(transfer: TripTransfer) {
  if (transfer.walk.meters < 30) return 'naik di titik yang sama'
  return `jalan kaki ${formatDistance(transfer.walk.meters)} ke ${shortStreet(transfer.toStreet)}`
}

function parseLatLng(value: string | null): LatLng | null {
  return parseCoordinatePair(value)
}

function latLngParam([lat, lng]: LatLng) {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`
}

function transitLabel(itinerary: Itinerary) {
  return itinerary.transfers.length === 0 ? 'Langsung' : `${itinerary.transfers.length}x transit`
}

function landmarkKey([lat, lng]: LatLng) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

function nextArrival(_itinerary: Itinerary): number | null {
  return null
}

function markerIcon(vehicle: Vehicle, selected: boolean) {
  const color = statusColor[vehicle.status]
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:auto">
        <span style="background:${color};color:#fff;border-radius:9999px;padding:4px 9px;font-size:var(--text-caption);font-weight:700;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.22);white-space:nowrap;border:2px solid ${selected ? '#fff' : 'transparent'}">
          ${vehicle.routeCode}${vehicle.telemetrySource === 'simulation' ? ' · SIMULASI' : ''}
        </span>
        <span style="width:2px;height:7px;background:${color}"></span>
        <span style="width:7px;height:7px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(255,255,255,.6)"></span>
      </div>
    `,
  })
}

function userIcon(label = 'Lokasi Anda') {
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <span style="background:#325F99;color:#fff;border-radius:9999px;padding:4px 9px;font-size:var(--text-caption);font-weight:800;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.22);white-space:nowrap;border:2px solid #fff">
          ${label}
        </span>
        <span style="width:2px;height:7px;background:#325F99"></span>
        <span style="width:8px;height:8px;border-radius:9999px;background:#325F99;box-shadow:0 0 0 4px rgba(50,95,153,.28)"></span>
      </div>
    `,
  })
}

function pinIcon(label: string, color: string, prefixIcon = '') {
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer">
        <span style="background:${color};color:#fff;border-radius:9999px;padding:4px 9px;font-size:var(--text-caption);font-weight:800;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.25);white-space:nowrap;border:2px solid #fff;display:inline-flex;align-items:center;gap:4px">
          ${prefixIcon ? `<span>${prefixIcon}</span>` : ''}${label}
        </span>
        <span style="width:2px;height:6px;background:${color}"></span>
        <span style="width:8px;height:8px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(255,255,255,.75)"></span>
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

function RouteBounds({ routes, filter }: { routes: RouteInfo[]; filter: string }) {
  const map = useMap()

  useEffect(() => {
    if (filter === 'semua') return
    const visible = routes.filter((route) => route.id === filter || route.code === filter)
    const points = visible.flatMap((route) => route.polyline)
    if (points.length === 0) return
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
  }, [filter, map, routes])

  return null
}

function FitItinerary({ points, fitKey }: { points: LatLng[]; fitKey: string }) {
  const map = useMap()
  const pointsRef = useRef(points)

  useEffect(() => {
    pointsRef.current = points
  }, [points])

  useEffect(() => {
    if (pointsRef.current.length === 0) return
    map.fitBounds(L.latLngBounds(pointsRef.current), { padding: [52, 52], maxZoom: 16 })
  }, [fitKey, map])

  return null
}

function FocusVehicles({ points, focusKey }: { points: LatLng[]; focusKey: string }) {
  const map = useMap()
  const pointsRef = useRef(points)

  useEffect(() => {
    pointsRef.current = points
  }, [points])

  useEffect(() => {
    if (pointsRef.current.length === 0) return
    map.fitBounds(L.latLngBounds(pointsRef.current), { padding: [72, 72], maxZoom: 14 })
  }, [focusKey, map])

  return null
}

function FocusRadius({
  center,
  radiusKm,
  focusKey,
}: {
  center: LatLng
  radiusKm: number
  focusKey: string
}) {
  const map = useMap()
  const centerRef = useRef(center)
  const radiusRef = useRef(radiusKm)

  useEffect(() => {
    centerRef.current = center
    radiusRef.current = radiusKm
  }, [center, radiusKm])

  useEffect(() => {
    const bounds = L.latLng(centerRef.current).toBounds(radiusRef.current * 1000 * 2)
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 19 })
  }, [focusKey, map])

  return null
}

function MapEvents({ onBackgroundClick }: { onBackgroundClick: () => void }) {
  useMapEvents({
    click: () => {
      onBackgroundClick()
    },
  })
  return null
}

function VehicleCard({
  vehicle,
  active,
  distanceMeters,
  onSelect,
}: {
  vehicle: Vehicle
  active: boolean
  distanceMeters?: number
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
        {vehicle.telemetrySource === 'simulation' && <span className="block text-xs font-semibold text-warning">Simulasi pengujian</span>}
        <span className="mt-0.5 block truncate text-xs text-ink">
          {vehicle.plate} · {vehicle.driverName}
          {distanceMeters !== undefined ? ` · ${formatDistance(distanceMeters)}` : ''}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <VehicleStatusBadge status={vehicle.status} />
        <span className="text-xs font-semibold text-ink-strong">{vehicle.etaMinutes === null ? 'ETA belum tersedia' : `${vehicle.etaMinutes} mnt`}</span>
        {isVehicleStale(vehicle) ? (
          <span className="text-xs font-semibold text-warning">GPS tertunda</span>
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
              className="rounded-md px-2 py-1 text-xs font-extrabold text-white"
              style={{ backgroundColor: statusColor[vehicle.status] }}
            >
              {vehicle.routeCode}
            </span>
            <VehicleStatusBadge status={vehicle.status} />
          </div>
          <h2 className="mt-2 text-base font-bold text-ink-strong">{vehicle.routeName}</h2>
          <p className="text-xs text-ink">{vehicle.plate}</p>
          {vehicle.telemetrySource === 'simulation' && <p className="text-xs font-semibold text-warning">Simulasi pengujian · bukan GPS perangkat</p>}
        </div>
        <div className="rounded-md bg-leaf px-3 py-2 text-center">
          <p className="text-lg leading-none font-extrabold text-brand-strong">
            {vehicle.etaMinutes ?? '—'}
          </p>
          <p className="text-xs text-brand-strong/70">ETA ke titik naik Anda</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border-[0.5px] border-line-soft p-3">
          <p className="text-xs text-ink-soft">Pengemudi</p>
          <p className="mt-0.5 text-xs font-semibold text-ink-strong">{vehicle.driverName}</p>
        </div>
        <div className="rounded-md border-[0.5px] border-line-soft p-3">
          <p className="text-xs text-ink-soft">Kecepatan</p>
          <p className="mt-0.5 text-xs font-semibold text-ink-strong">{vehicle.speedKph} km/jam</p>
        </div>
        <div className="rounded-md border-[0.5px] border-line-soft p-3">
          <p className="text-xs text-ink-soft">Kursi tersedia</p>
          <p className="mt-0.5 text-xs font-semibold text-ink-strong">
            {vehicle.seatsAvailable === undefined ? 'Belum tersedia' : `${vehicle.seatsAvailable} kursi`}
          </p>
        </div>
        <div className="rounded-md border-[0.5px] border-line-soft p-3">
          <p className="text-xs text-ink-soft">Arah</p>
          <p className="mt-0.5 text-xs font-semibold text-ink-strong">{vehicle.heading}°</p>
        </div>
      </div>

      <div className="rounded-md bg-muted p-3 text-xs leading-relaxed text-ink">
        {isVehicleStale(vehicle)
          ? 'GPS terputus. ETA belum tersedia.'
          : vehicle.telemetrySource === 'simulation' ? 'Posisi simulasi untuk pengujian lokal. Kecepatan dan ETA mengikuti skenario uji.' : vehicle.etaMinutes === null ? 'Posisi bersumber dari GPS pengemudi. ETA memerlukan GPS Anda yang segar, dengan titik naik di depan kendaraan pada arah yang sama.' : 'Posisi bersumber dari GPS pengemudi. ETA mengikuti arah trayek menuju titik naik Anda.'}
      </div>

      <p className="text-xs text-ink">Pilih jurusan ini dan gunakan megat untuk panduan menuju titik naik.</p>
    </div>
  )
}

function useTransferLandmarks(plan: TripPlan | null | undefined) {
  const [landmarks, setLandmarks] = useState<Record<string, string | null>>({})

  useEffect(() => {
    if (!plan) return
    let cancelled = false
    const transferPoints: LatLng[] = []
    for (const itinerary of plan.itineraries) {
      for (const transfer of itinerary.transfers) {
        transferPoints.push(transfer.at)
      }
    }

    for (const point of transferPoints) {
      const key = landmarkKey(point)
      reverseLandmark(point).then((name) => {
        if (!cancelled && name) {
          setLandmarks((current) => ({ ...current, [key]: name }))
        }
      })
    }

    return () => {
      cancelled = true
    }
  }, [plan])

  return landmarks
}

export function MapScreen({ passengerMode = false }: { passengerMode?: boolean }) {
  const {routes, isPending: catalogPending, error: catalogError} = useRoutes()
 const catalogReady=!catalogPending && !catalogError
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const connection = useLiveStore((s) => s.connection)
  const liveError = useLiveStore((s) => s.error)
  const [megatBusy, setMegatBusy] = useState(false)
  const [megatDirectionId, setMegatDirectionId] = useState('')

  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  // Armada Live States
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('vehicle'))
  const [destinationQuery, setDestinationQuery] = useState(searchParams.get('to') ?? '')
  const [routeFilter, setRouteFilter] = useState<string>(searchParams.get('route') ?? 'semua')
  const [radiusKm, setRadiusKm] = useState<number | null>(null)
  const [radiusNotice, setRadiusNotice] = useState<string | null>(null)
  const [allFocus, setAllFocus] = useState(0)
  const [nearbyError, setNearbyError] = useState<string | null>(null)
  const [nearbyLocating, setNearbyLocating] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const passenger = useAuthStore((state) => state.user)
  const passengerId = passenger?.id ?? 'demo-passenger'
  const { requests: megatRequests, sampledAt: megatAt } = useMegat()
  const ownRequest = passengerMode ? megatRequests
    .filter((request) => request.passengerId === passengerId)
    .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))[0] : undefined
  const activeRequest = ownRequest && activeMegat(ownRequest) ? ownRequest : undefined
  const megatMode: MegatMode = activeRequest?.status === 'accepted' ? 'matched'
    : activeRequest?.status === 'walking' ? 'walking'
      : activeRequest?.status === 'searching' ? 'searching' : 'idle'
  const megatSeconds = activeRequest ? Math.max(0, Math.ceil((activeRequest.expiresAt - megatAt) / 1000)) : 0
  const matchedVehicleId = activeRequest?.vehicleId ?? null

  // Hasil pencarian rute
  const [fromText, setFromText] = useState(searchParams.get('from') ?? '')
  const [toText, setToText] = useState(searchParams.get('to') ?? '')
  const [fromPlace, setFromPlace] = useState<Place | null>(() => {
    const position = parseLatLng(searchParams.get('fl'))
    const name = searchParams.get('from')
    return position && name ? placeFromCoordinates(name, position) : null
  })
  const [toPlace, setToPlace] = useState<Place | null>(() => {
    const position = parseLatLng(searchParams.get('tl'))
    const name = searchParams.get('to')
    return position && name ? placeFromCoordinates(name, position) : null
  })
  const [routeSearchStatus, setRouteSearchStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [routeError, setRouteError] = useState<{ field: 'from' | 'to' | null; message: string } | null>(null)
  const [storedTripResult, setTripResult] = useState<{ from: Place; to: Place; plan: TripPlan } | null>(null)
  const tripResult = useMemo(() => {
    if (!storedTripResult) return null
    const outdated=storedTripResult.plan.itineraries.some(i=>i.legs.some(leg=>{
      const current=routes.find(r=>r.id===leg.route.id)
      return !current || current.updatedAt!==leg.route.updatedAt
    }))
    return outdated ? null : storedTripResult
  }, [routes, storedTripResult])
  const routeChanged=storedTripResult!==null && tripResult===null
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null)
  const [itineraryFilter, setItineraryFilter] = useState<'all' | 'direct' | 'transit'>('all')
  const [expandedSteps, setExpandedSteps] = useState(false)
  const [locating, setLocating] = useState(false)
  const [pointFocus, setPointFocus] = useState<{ position: LatLng; revision: number } | null>(null)
  const [requestedLocation, setUserLocation] = useState<LatLng | null>(null)
  const [requestedSample, setLocationSample] = useState<{sampledAt:number;accuracy:number} | null>(null)
  const [locationFocus, setLocationFocus] = useState(0)
  const [locationEnabled,setLocationEnabled]=useState(false)
  const mapGps=useGps(locationEnabled && !activeRequest)
  const userLocation=useMemo<LatLng|null>(()=>mapGps.position ? [mapGps.position.coords.latitude,mapGps.position.coords.longitude] : requestedLocation,[mapGps.position,requestedLocation])
  const locationSample=mapGps.position ? {sampledAt:mapGps.position.timestamp,accuracy:mapGps.position.coords.accuracy} : requestedSample
  const trackingFix = useLiveStore(s=>s.gpsFix)
  const trackingTime = useLiveStore(s=>s.serverTime)
  // Search origins are planning coordinates, never a passenger GPS measurement.
  const gpsPoint = trackingFix && trackingFix.telemetrySource !== 'simulation' && trackingTime-trackingFix.sampledAt<=15000 && trackingFix.accuracy<=50
    ? trackingFix.position
    : userLocation && locationSample && trackingTime-locationSample.sampledAt<=15000 && locationSample.accuracy<=50 ? userLocation : null
  const userPosition = activeRequest?.position ?? userLocation

  const userNearestRoute = useMemo(() => {
    if (!userPosition) return null
    const route = routes.find((item) => item.id === activeRequest?.routeId)
    return route ? { ...projectToRoute(userPosition, route), route } : nearestRoutePoint(userPosition, routes)
  }, [userPosition, activeRequest?.routeId, routes])
  const [megatWalk, setMegatWalk] = useState<TripWalk | null>(null)
  useEffect(() => {
    if (megatMode !== 'walking' || !userNearestRoute || !userPosition) return
    const controller = new AbortController()
    void walkingRouter.routeWalk({
      from: userPosition,
      to: userNearestRoute.point,
      path: [],
      routing: 'estimated',
      meters: Math.round(userNearestRoute.distanceKm * 1000),
      minutes: Math.max(1, Math.round(userNearestRoute.distanceKm / 4.5 * 60)),
    }, controller.signal).then((walk) => {
      if (controller.signal.aborted) return
      setMegatWalk(walk)
      if (walk.routing === 'unavailable') toast.info('Jalur jalan kaki belum tersedia. Coba lagi saat koneksi tersedia.')
    }).catch(() => {})
    return () => controller.abort()
  }, [megatMode, userNearestRoute, userPosition])
  const initialSearchDone = useRef(false)
  const searchToken = useRef(0)
  const walkingSearch = useRef<AbortController | null>(null)
  useEffect(() => () => {
    walkingSearch.current?.abort()
    searchToken.current += 1
    // StrictMode runs effect cleanup/setup twice on mount. Allow auto-search to restart.
    initialSearchDone.current = false
  }, [])

  const landmarks = useTransferLandmarks(tripResult?.plan)

  const liveVehicles = useLiveVehicles()
  const availableVehicles = useMemo(
    () => liveVehicles.filter((vehicle) => vehicle.driverVerified !== false &&
      vehicle.status !== 'offline' && vehicle.status !== 'istirahat').map((vehicle) => ({ ...vehicle, etaMinutes: pickupEta(vehicle, gpsPoint, routes.find((r) => r.id === vehicle.routeId), trackingTime) })),
    [liveVehicles, gpsPoint, routes, trackingTime],
  )

  const routeGroups = useMemo(() => groupRouteDirections(routes), [routes])
  const visibleRouteGroups = routeGroups
  const selectedCode =
    routeFilter === 'semua'
      ? 'semua'
      : (routes.find((route) => route.id === routeFilter)?.code ?? routeFilter)

  const nearbyVehicles = useMemo(
    () => (radiusKm !== null && userPosition
      ? vehiclesWithinRadius(availableVehicles, userPosition, radiusKm)
      : availableVehicles),
    [availableVehicles, radiusKm, userPosition],
  )

  const filtered = useMemo(() => {
    const base = routeFilter === 'semua'
      ? availableVehicles
      : vehiclesForRouteSelection(availableVehicles, routeFilter, routes)
    if (radiusKm === null || !userPosition) return base
    return vehiclesWithinRadius(base, userPosition, radiusKm)
  }, [availableVehicles, radiusKm, routeFilter, userPosition, routes])

  const nearestVehicles = useMemo(() => {
    if (!userPosition) return []
    return availableVehicles
      .map((vehicle) => ({
        vehicle,
        distanceKm: distanceKm(userPosition, vehicle.position),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, FALLBACK_VEHICLE_LIMIT)
  }, [availableVehicles, userPosition])

  const nearbyFallback = routeFilter === 'semua' && radiusKm !== null &&
    userPosition !== null && filtered.length === 0 && nearestVehicles.length > 0
  const displayedVehicles = nearbyFallback
    ? nearestVehicles.map(({ vehicle }) => vehicle)
    : filtered

  const selected = availableVehicles.find((vehicle) => vehicle.id === selectedId) ?? null
  const matchedVehicle = liveVehicles.find((vehicle) => vehicle.id === matchedVehicleId) ?? null
  const currentMegatWalk = megatWalk?.from === userPosition && megatWalk?.to === userNearestRoute?.point
    ? megatWalk : null
  const megatDistanceMeters = currentMegatWalk?.meters ?? Math.round((userNearestRoute?.distanceKm ?? 0) * 1000)

  const activeRoutes = useMemo(() => {
    if (tripResult) {
      return []
    }
    if (routeFilter !== 'semua') {
      return routes.filter((route) => route.id === routeFilter || route.code === routeFilter)
    }
    if (selected) {
      return routes.filter(
        (route) => route.id === selected.routeId || route.code === selected.routeCode,
      )
    }
    return []
  }, [tripResult, routeFilter, selected, routes])

  // Itinerary calculation results
  const itineraries = useMemo(() => tripResult?.plan.itineraries ?? [], [tripResult])
  const directCount = useMemo(
    () => itineraries.filter((itinerary) => itinerary.transfers.length === 0).length,
    [itineraries],
  )
  const transitCount = useMemo(
    () => itineraries.filter((itinerary) => itinerary.transfers.length > 0).length,
    [itineraries],
  )

  const filteredItineraries = useMemo(() => {
    if (itineraryFilter === 'direct') {
      return itineraries.filter((itinerary) => itinerary.transfers.length === 0)
    }
    if (itineraryFilter === 'transit') {
      return itineraries.filter((itinerary) => itinerary.transfers.length > 0)
    }
    return itineraries
  }, [itineraries, itineraryFilter])

  const selectedItinerary = useMemo(() => {
    if (!tripResult) return null
    if (selectedItineraryId) {
      const match = filteredItineraries.find((itinerary) => itinerary.id === selectedItineraryId)
      if (match) return match
    }
    return filteredItineraries[0] ?? itineraries[0] ?? null
  }, [tripResult, selectedItineraryId, filteredItineraries, itineraries])

  const itineraryMapPoints = useMemo<LatLng[]>(() => {
    if (!selectedItinerary || !tripResult) return []
    return [
      tripResult.from.position,
      tripResult.to.position,
      ...selectedItinerary.legs.flatMap((leg) => leg.path),
      ...selectedItinerary.accessWalk.path,
      ...selectedItinerary.egressWalk.path,
      ...selectedItinerary.transfers.flatMap((transfer) => transfer.walk.path),
    ]
  }, [selectedItinerary, tripResult])

  const runRouteSearch = useCallback(async (
    fromVal: string,
    fromChosen: Place | null,
    toVal: string,
    toChosen: Place | null,
  ) => {
    if(!catalogReady) {setRouteError({field:null,message:'Katalog trayek belum tersedia. Tunggu data selesai dimuat.'});setRouteSearchStatus('error');return}
    if (!fromVal.trim() && !fromChosen) {
      setRouteError({ field: 'from', message: 'Isi titik asal terlebih dahulu.' })
      setRouteSearchStatus('error')
      return
    }
    if (!toVal.trim() && !toChosen) {
      setRouteError({ field: 'to', message: 'Isi lokasi tujuan terlebih dahulu.' })
      setRouteSearchStatus('error')
      return
    }

    walkingSearch.current?.abort()
    const controller = new AbortController()
    walkingSearch.current = controller
    const token = ++searchToken.current
    setRouteSearchStatus('loading')
    setRouteError(null)
    setTripResult(null)

    let origin: Place | null, destination: Place | null
    try {
      [origin, destination] = await Promise.all([
        fromChosen ?? resolvePlace(fromVal, controller.signal),
        toChosen ?? resolvePlace(toVal, controller.signal),
      ])
    } catch {
      if (token !== searchToken.current || controller.signal.aborted) return
      setRouteSearchStatus('error')
      setRouteError({field:null,message:'Layanan pencarian lokasi sedang tidak tersedia. Coba lagi, atau pilih tujuan dari daftar saran.'})
      return
    }
    if (token !== searchToken.current) return

    if (!origin || !destination) {
      setRouteError({
        field: !origin ? 'from' : 'to',
        message: `Lokasi "${!origin ? fromVal : toVal}" tidak ditemukan. Coba nama jalan, kelurahan, atau tempat terkenal di Bandung.`,
      })
      setRouteSearchStatus('error')
      return
    }

    await new Promise((resolve) => window.setTimeout(resolve, 0))
    let direct: DirectRecommendation[]
    try {
      direct = await api<DirectRecommendation[]>(`/search/route?from=${origin.position.join(',')}&to=${destination.position.join(',')}`)
      if (token !== searchToken.current) return
    } catch (e) { if(token!==searchToken.current) return; setRouteSearchStatus('error'); setRouteError({field:null,message:errorMessage(e)}); return }
    const estimatedPlan = directTripPlan(routes, origin.position, destination.position, direct)
    let plan: TripPlan
    try {
      plan = await walkingRouter.routePlan(estimatedPlan, controller.signal)
    } catch {
      // Superseded searches and unmounted screens must not publish stale results.
      return
    }
    if (token !== searchToken.current) return

    setFromPlace(origin)
    setToPlace(destination)
    setFromText(origin.name)
    setToText(destination.name)
    setTripResult({ from: origin, to: destination, plan })
    setSelectedItineraryId(plan.itineraries[0]?.id ?? null)
    setItineraryFilter('all')
    setRouteSearchStatus('done')
    setIsPanelCollapsed(false)

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('from', origin.name)
        next.set('fl', latLngParam(origin.position))
        next.set('to', destination.name)
        next.set('tl', latLngParam(destination.position))
        return next
      },
      { replace: true },
    )
  }, [routes, catalogReady, setSearchParams])

  // Run auto search after the canonical catalog is ready.
  useEffect(() => {
    if(initialSearchDone.current || !catalogReady) return
    const initialFrom=searchParams.get('from'),initialTo=searchParams.get('to')
    if(initialFrom?.trim() && initialTo?.trim()) {
      const timer=window.setTimeout(()=>{
        if(initialSearchDone.current) return
        initialSearchDone.current=true
        void runRouteSearch(initialFrom,fromPlace,initialTo,toPlace)
      },0)
      return ()=>window.clearTimeout(timer)
    }
  },[catalogReady,searchParams,fromPlace,toPlace,runRouteSearch])

  function handleCustomPoint(field: 'from' | 'to', position: LatLng) {
    if (!parseCoordinatePair(position.join(','))) { toast.error('Koordinat titik tidak valid.'); return }
    walkingSearch.current?.abort()
    searchToken.current += 1
    initialSearchDone.current = true
    const label = field === 'from' ? 'Titik asal pilihan' : 'Titik tujuan pilihan'
    const place: Place = { ...placeFromCoordinates(label, position, coordinateLabel(position)), source: 'custom' }
    if (field === 'from') { setFromPlace(place); setFromText(place.name) }
    else { setToPlace(place); setToText(place.name) }
    setTripResult(null)
    setSelectedItineraryId(null)
    setRouteError(null)
    setRouteSearchStatus('idle')
    setIsPanelCollapsed(false)
    setPointFocus((previous) => ({ position, revision: (previous?.revision ?? 0) + 1 }))
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set(field === 'from' ? 'from' : 'to', place.name)
      next.set(field === 'from' ? 'fl' : 'tl', latLngParam(position))
      return next
    }, { replace: true })
  }

  function clearRouteResults() {
    walkingSearch.current?.abort()
    searchToken.current += 1
    initialSearchDone.current = true
    setTripResult(null)
    setSelectedItineraryId(null)
    setRouteSearchStatus('idle')
    setRouteError(null)
    setExpandedSteps(false)
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      for (const key of ['from', 'fl', 'to', 'tl', 'tab']) next.delete(key)
      return next
    }, { replace: true })
  }

  // Search bar Peta Live: satu langkah langsung ke hasil rute.
  function openRouteToDestination(chosen?: Place) {
    const destination = (chosen?.name ?? destinationQuery).trim()
    setIsPanelCollapsed(false)
    if (!destination) return

    let originText = fromText
    let originPlace = fromPlace
    if (!originPlace && !originText.trim()) {
      const fallback = userPosition
        ? placeFromCoordinates('Lokasi saya', userPosition)
        : findLandmark('Alun-Alun Bandung')
      if (fallback) {
        originText = fallback.name
        originPlace = fallback
        setFromText(fallback.name)
        setFromPlace(fallback)
      }
    }

    setToText(destination)
    setToPlace(chosen ?? null)
    setDestinationQuery('')
    void runRouteSearch(originText, originPlace, destination, chosen ?? null)
  }

  async function requestNearbyLocation(focus = true) {
    if (nearbyLocating) return null
    setNearbyLocating(true)
    setNearbyError(null)
    try {
      const position = await getCurrentLocation()
      const next: LatLng = [position.coords.latitude, position.coords.longitude]
      setUserLocation(next)
      setLocationSample({sampledAt:position.timestamp,accuracy:position.coords.accuracy})
      setLocationEnabled(true)
      if (focus) setLocationFocus((value) => value + 1)
      return next
    } catch (error) {
      setNearbyError(locationErrorMessage(error))
      return null
    } finally {
      setNearbyLocating(false)
    }
  }

  async function locateNearby() {
    await requestNearbyLocation(radiusKm === null)
  }

  const radiusTimerRef = useRef<number | null>(null)

  function showRadiusNotice(label: string) {
    if (radiusTimerRef.current !== null) window.clearTimeout(radiusTimerRef.current)
    setRadiusNotice(label)
    radiusTimerRef.current = window.setTimeout(() => {
      setRadiusNotice(null)
      radiusTimerRef.current = null
    }, 2000)
  }

  useEffect(() => {
    return () => {
      if (radiusTimerRef.current !== null) window.clearTimeout(radiusTimerRef.current)
    }
  }, [])

  async function handleRadiusSelect(value: number | null) {
    if (value === null) {
      setRadiusKm(null)
      setNearbyError(null)
      setAllFocus((current) => current + 1)
      return
    }
    if (userPosition) {
      setRadiusKm(value)
      setNearbyError(null)
      return
    }
    const position = await requestNearbyLocation(false)
    if (position) setRadiusKm(value)
  }

  async function handleUseLocation() {
    if (locating) return
    setLocating(true)
    try {
      const position = await getCurrentLocation()
      const place = placeFromCoordinates('Lokasi saya', [
        position.coords.latitude,
        position.coords.longitude,
      ])
      setFromPlace(place)
      setFromText(place.name)
      setUserLocation(place.position)
      setLocationSample({sampledAt:position.timestamp,accuracy:position.coords.accuracy})
      setLocationEnabled(true)
      if (tripResult || radiusKm === null) {
        setLocationFocus((value) => value + 1)
      }
      setNearbyError(null)

      setRouteError(null)
    } catch (error) {
      toast.error(locationErrorMessage(error), { duration: 10000 })
    } finally {
      setLocating(false)
    }
  }

  function handleExampleClick(example: { from: string; to: string }) {
    const origin = findLandmark(example.from)
    const destination = findLandmark(example.to)
    setFromText(example.from)
    setToText(example.to)
    setFromPlace(origin)
    setToPlace(destination)
    void runRouteSearch(example.from, origin, example.to, destination)
  }

  function handleSelect(vehicle: Vehicle) {
    setSelectedId(vehicle.id)
    setShowDetail(true)
  }

  function selectRouteGroup(code: string | null) {
    setMegatDirectionId('')
    setRouteFilter(code ?? 'semua')
    setSelectedId(null)
    setShowDetail(false)
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.delete('tab')
      next.delete('vehicle')
      if (code) next.set('route', code)
      else next.delete('route')
      return next
    }, { replace: true })
  }

  function megatRoute() {
    return (tripResult ? selectedItinerary?.legs[0]?.route : null)
      ?? routes.find((route) => route.id === selected?.routeId)
      ?? routes.find((route) => route.id === (megatDirectionId || routeFilter))
  }

  async function handleMegat() {
    const route = megatRoute()
    if (!route) { toast.error('Pilih jurusan dan arah trayek terlebih dahulu.'); return }
    setMegatBusy(true)
    try {
      const request = await megatStore.create({ routeId: route.id, destination: selectedItinerary?.legs.length && selectedItinerary.legs.length > 1 ? selectedItinerary.legs[0].alightStreet : tripResult?.to.name ?? (toText || destinationQuery || 'Belum dipilih'), destinationPoint: selectedItinerary?.legs[0]?.alight })
      setUserLocation(request.position)
      setLocationSample(null)
      setRouteFilter(route.id)
      toast.success(request.status === 'walking' ? 'Ikuti panduan ke titik naik. GPS akan mendeteksi kedatangan Anda.' : 'Megat aktif. Menunggu pengemudi pada trayek ini.')
    } catch (e) { toast.error(errorMessage(e)) } finally { setMegatBusy(false) }
  }

  async function handleCancelMegat() {
    if (!activeRequest) return
    setMegatBusy(true)
    try { await megatStore.cancel(activeRequest.id, passengerId); toast.success('Megat dibatalkan') }
    catch (e) { toast.error(errorMessage(e)) } finally { setMegatBusy(false) }
  }

  async function handleBoard(vehicleId: string) {
    if (!activeRequest) return
    setMegatBusy(true)
    try { await megatStore.board(activeRequest.id, vehicleId); navigate('/penumpang/perjalanan') }
    catch (e) { toast.error(errorMessage(e)) } finally { setMegatBusy(false) }
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ? <a href="https://routing.openstreetmap.de/about.html">FOSSGIS / OSRM</a> ? <a href="https://www.openstreetmap.org/fixthemap">Perbaiki peta</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapEvents
          onBackgroundClick={() => {
            setSelectedId(null)
            setShowDetail(false)
          }}
        />

        {/* Regular route lines when in Armada tab */}
        {activeRoutes.map((route) => {
          const segments = route.segments ?? [route.polyline]
          return segments.map((segment, index) => (
            <Polyline
              key={`${route.id}-${index}`}
              positions={segment}
              pathOptions={{
                color: route.color,
                weight: 5,
                opacity: 0.8,
                dashArray: '1 0',
              }}
            />
          ))
        })}
        {!tripResult ? <RouteBounds routes={routes} filter={routeFilter} /> : null}

        {/* Selected Itinerary on Wide Live Map */}
        {selectedItinerary && tripResult ? (
          <>
            <FitItinerary points={itineraryMapPoints} fitKey={selectedItinerary.id} />

            {/* Access walk line */}
            <Polyline
              positions={selectedItinerary.accessWalk.path}
              pathOptions={{ color: '#1F5C3A', weight: 4, dashArray: '4 8' }}
            />

            {/* Transfer walk lines */}
            {selectedItinerary.transfers.map((transfer, index) => (
              <Polyline
                key={`transfer-walk-${index}`}
                positions={transfer.walk.path}
                pathOptions={{ color: '#0284C7', weight: 4, dashArray: '4 8' }}
              />
            ))}

            {/* Egress walk line */}
            <Polyline
              positions={selectedItinerary.egressWalk.path}
              pathOptions={{ color: '#B45309', weight: 4, dashArray: '4 8' }}
            />

            {/* Route legs */}
            {selectedItinerary.legs.map((leg, index) => (
              <Polyline
                key={`itinerary-leg-${index}`}
                positions={leg.path}
                pathOptions={{ color: leg.route.color, weight: 6, opacity: 0.92 }}
              >
                <Tooltip sticky>
                  Angkot {leg.route.code} · {leg.route.name}
                </Tooltip>
              </Polyline>
            ))}

            {/* Origin marker */}
            <Marker
              position={tripResult.from.position}
              draggable
              eventHandlers={{ dragend: (event) => {
                const point = (event.target as L.Marker).getLatLng().wrap()
                handleCustomPoint('from', [point.lat, point.lng])
              } }}
              icon={pinIcon('Asal: ' + tripResult.from.name, '#1F5C3A', '📍')}
            />

            {/* First boarding marker */}
            <Marker
              position={selectedItinerary.legs[0].board}
              icon={pinIcon(
                `Naik ${selectedItinerary.legs[0].route.code}`,
                selectedItinerary.legs[0].route.color,
                '🚏',
              )}
            >
              <Tooltip direction="top" offset={[0, -20]}>
                <div className="p-0.5 text-xs">

                  <p className="font-bold">Titik Naik Angkot {selectedItinerary.legs[0].route.code}</p>
                  <p className="text-ink">Di {shortStreet(selectedItinerary.legs[0].boardStreet)}</p>
                </div>
              </Tooltip>
            </Marker>

            {/* Transfer markers */}
            {selectedItinerary.legs.map((leg, index) => {
              if (index === 0) return null
              const prev = selectedItinerary.legs[index - 1]
              const transfer = selectedItinerary.transfers[index - 1]
              return (
                <Marker
                  key={`transfer-marker-${index}`}
                  position={leg.board}
                  icon={pinIcon(`Transit: ${prev.route.code} → ${leg.route.code}`, '#0284C7', '🔄')}
                >
                  {transfer ? (
                    <Tooltip sticky direction="top" offset={[0, -20]}>
                      <div className="p-0.5 text-xs">
                        <p className="font-bold text-sky-800">Titik Transit & Ganti Angkot</p>
                        <p className="mt-0.5 text-ink">
                          Turun di <span className="font-semibold">{shortStreet(transfer.fromStreet)}</span>, lalu naik{' '}
                          <span className="font-semibold text-brand">Angkot {leg.route.code}</span> ({leg.route.name}).
                        </p>
                      </div>
                    </Tooltip>
                  ) : null}
                </Marker>
              )
            })}

            {/* Destination marker */}
            <Marker
              position={tripResult.to.position}
              draggable
              eventHandlers={{ dragend: (event) => {
                const point = (event.target as L.Marker).getLatLng().wrap()
                handleCustomPoint('to', [point.lat, point.lng])
              } }}
              icon={pinIcon('Tujuan: ' + tripResult.to.name, '#B45309', '🏁')}
            />
          </>
        ) : null}

        {!tripResult && radiusKm !== null && userPosition ? (
          <Circle
            center={userPosition}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#325F99',
              weight: 2,
              opacity: 0.85,
              fillColor: '#325F99',
              fillOpacity: 0.08,
            }}
          />
        ) : null}

        {/* Live Vehicles Markers */}
        {displayedVehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={vehicle.position}
            icon={markerIcon(vehicle, vehicle.id === selectedId || vehicle.id === matchedVehicleId)}
            eventHandlers={{ click: () => handleSelect(vehicle) }}
          />
        ))}

        {userPosition ? (
          <>
            {megatMode === 'walking' && userNearestRoute ? (
              <Polyline
                positions={currentMegatWalk?.path ?? []}
                pathOptions={{ color: '#325F99', weight: 3, dashArray: '6 6' }}
              />
            ) : null}
            <Marker position={userPosition} icon={userIcon(passengerMode ? 'Titik penumpang' : 'Lokasi Anda')} />
          </>
        ) : null}

        <MapController
          position={
            megatMode === 'walking' || megatMode === 'searching'
              ? (userPosition ?? null)
              : (matchedVehicle?.position ?? selected?.position ?? null)
          }
          focusKey={
            megatMode === 'walking' || megatMode === 'searching'
              ? 'user-megat'
              : (matchedVehicleId ?? selectedId)
          }
        />
        <MapController position={pointFocus?.position ?? null} focusKey={pointFocus ? `custom-${pointFocus.revision}` : null} />
        <MapController
          position={userLocation}
          focusKey={locationFocus ? `location-${locationFocus}` : null}
        />
        {!tripResult && allFocus > 0 && radiusKm === null ? (
          <FocusVehicles
            points={availableVehicles.map((vehicle) => vehicle.position)}
            focusKey={`all-${allFocus}`}
          />
        ) : null}
        {!tripResult && userPosition && radiusKm !== null ? (
          <FocusRadius
            center={userPosition}
            radiusKm={radiusKm}
            focusKey={`radius-${userPosition[0].toFixed(6)},${userPosition[1].toFixed(6)}-${radiusKm}`}
          />
        ) : null}
      </MapContainer>

      {/* Floating UI Over Wide Map */}
      <div className="pointer-events-none absolute inset-0 z-[400]">
        {/* Collapsed Pill Button */}
        {isPanelCollapsed ? (
          <div className="pointer-events-auto absolute top-16 left-3 md:top-4 md:left-4">
            <button
              type="button"
              onClick={() => setIsPanelCollapsed(false)}
              className="flex items-center gap-2 rounded-full border-[0.5px] border-line-soft bg-surface/95 px-4 py-2.5 text-xs font-bold text-ink-strong shadow-float backdrop-blur transition hover:bg-muted"
            >
              {selectedItinerary && tripResult ? (
                <>
                  <RouteIcon size={15} className="text-brand" />
                  <span className="max-w-[200px] truncate sm:max-w-xs">
                    {fromText} → {toText}
                  </span>
                  <span className="rounded-full bg-leaf px-2 py-0.5 text-xs text-brand-strong">
                    ± {selectedItinerary.totalMinutes} mnt
                  </span>
                  <ChevronRight size={14} className="text-ink-soft" />
                </>
              ) : (
                <>
                  <SlidersHorizontal size={15} className="text-brand" />
                  <span>Buka Menu & Pencarian</span>
                  <ChevronRight size={14} className="text-ink-soft" />
                </>
              )}
            </button>
          </div>
        ) : (
          /* Expanded Panel */
          <div className="pointer-events-auto absolute top-16 left-3 right-3 flex max-h-[calc(100svh-10rem)] flex-col gap-2 md:top-4 md:left-4 md:right-auto md:max-h-[calc(100svh-6rem)] md:w-[420px]">
            {/* Panel header */}
            <div className="flex items-center justify-between gap-1 rounded-xl border-[0.5px] border-line-soft bg-surface/95 p-1.5 shadow-float backdrop-blur">
              <div className="flex items-center gap-2 px-2.5 py-1 text-xs font-bold text-ink-strong">
                <BusFront size={14} className="text-brand" />
                Peta Live
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-ink-soft hover:text-ink"
                title="Sembunyikan panel untuk melihat peta lebih luas"
                onClick={() => setIsPanelCollapsed(true)}
              >
                <ChevronLeft size={16} />
              </Button>
            </div>

            {/* Pencarian tujuan: hasil rute tampil di panel yang sama */}
            <div className="relative z-20 rounded-lg border-[0.5px] border-line-soft bg-surface/95 p-3 shadow-float backdrop-blur">
              <PlaceInput
                id="armada-destination"
                value={destinationQuery}
                onValueChange={setDestinationQuery}
                onSelect={(place) => {
                  setDestinationQuery(place.name)
                  openRouteToDestination(place)
                }}
                onSubmit={() => openRouteToDestination()}
                icon={<Navigation size={15} className="text-peach" />}
                placeholder="Tujuan (contoh: Mall d'Botanica)"
              />
              <p className="mt-2 text-xs text-ink-soft">
                Ketik lokasi tujuan lalu tekan Enter untuk langsung mencari rute.
              </p>

              {routeSearchStatus === 'loading' ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink">
                  <Loader2 size={13} className="animate-spin text-brand" />
                  Mencari rute terbaik…
                </p>
              ) : null}
              {routeError || routeChanged ? (
                <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-medium text-danger">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  {routeError?.message ?? 'Trayek berubah. Cari ulang untuk memperoleh jalur terbaru.'}
                </p>
              ) : null}
              {!tripResult && routeSearchStatus === 'idle' ? (
                <div className="mt-2 flex flex-col gap-1.5 border-t border-line-soft pt-2.5">
                  <p className="text-xs font-semibold text-ink-soft">Coba rute populer:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exampleRoutes.map((ex) => (
                      <button
                        key={`${ex.from}-${ex.to}`}
                        type="button"
                        onClick={() => handleExampleClick(ex)}
                        className="rounded-full border-[0.5px] border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink transition hover:border-brand hover:text-brand"
                      >
                        {ex.from} → {ex.to}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {!tripResult ? (
              <div className="mt-2 flex flex-wrap items-center gap-1 md:hidden">
                <span className="mr-0.5 text-xs font-semibold text-ink-soft">Radius</span>
                {radiusOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => void handleRadiusSelect(option.value)}
                    className={cn(
                      'rounded-full px-2 py-1 text-xs font-semibold transition',
                      radiusKm === option.value
                        ? 'bg-brand text-white'
                        : 'bg-muted text-ink hover:bg-muted-strong',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              ) : null}
              {!tripResult && (nearbyError || mapGps.error) ? (
                <div className="mt-2 flex items-start gap-2 rounded-md border-[0.5px] border-warning/40 bg-warning/10 p-2 text-xs text-ink">
                  <AlertCircle size={12} className="mt-0.5 shrink-0 text-warning" />
                  <span className="flex-1">{nearbyError ?? mapGps.error}</span>
                  <button
                    type="button"
                    onClick={() => void locateNearby()}
                    disabled={nearbyLocating}
                    className="shrink-0 font-semibold text-brand hover:underline disabled:opacity-60"
                  >
                    {nearbyLocating ? 'Mencari…' : 'Coba lagi'}
                  </button>
                </div>
              ) : null}
            </div>

            {tripResult ? (
              <div className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border-[0.5px] border-line-soft bg-surface/95 p-3.5 shadow-float backdrop-blur">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-ink-strong">
                      {itineraries.length > 0 ? `${itineraries.length} pilihan rute` : 'Rute tidak ditemukan'}
                    </p>
                    <p className="text-xs text-ink">
                      {tripResult.from.name} → {tripResult.to.name}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-ink-soft hover:text-ink"
                    aria-label="Tutup hasil rute"
                    title="Tutup hasil rute"
                    onClick={clearRouteResults}
                  >
                    <X size={16} />
                  </Button>
                </div>

                {/* Filter Pills */}
                {itineraries.length > 0 && directCount > 0 && transitCount > 0 ? (
                  <div className="flex items-center gap-1 rounded-lg border-[0.5px] border-line-soft bg-surface p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setItineraryFilter('all')}
                      className={cn(
                        'flex-1 rounded py-1 text-center font-semibold transition',
                        itineraryFilter === 'all'
                          ? 'bg-brand text-white'
                          : 'text-ink hover:bg-muted hover:text-ink-strong',
                      )}
                    >
                      Semua ({itineraries.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setItineraryFilter('direct')}
                      className={cn(
                        'flex-1 rounded py-1 text-center font-semibold transition',
                        itineraryFilter === 'direct'
                          ? 'bg-brand text-white'
                          : 'text-ink hover:bg-muted hover:text-ink-strong',
                      )}
                    >
                      Langsung ({directCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setItineraryFilter('transit')}
                      className={cn(
                        'flex-1 rounded py-1 text-center font-semibold transition',
                        itineraryFilter === 'transit'
                          ? 'bg-brand text-white'
                          : 'text-ink hover:bg-muted hover:text-ink-strong',
                      )}
                    >
                      Transit ({transitCount})
                    </button>
                  </div>
                ) : null}

                {/* Itinerary Cards List */}
                <div className="flex flex-col gap-2">
                  {filteredItineraries.map((itinerary) => {
                    const isSelected = selectedItinerary?.id === itinerary.id
                    const isFastest = itineraries[0]?.id === itinerary.id
                    const eta = nextArrival(itinerary)

                    return (
                      <div
                        key={itinerary.id}
                        className={cn(
                          'cursor-pointer rounded-lg border p-3 transition',
                          isSelected
                            ? 'border-brand bg-leaf/40 ring-1 ring-brand'
                            : 'border-line-soft bg-surface hover:border-brand/40 hover:bg-muted/30',
                        )}
                        onClick={() => {
                          setSelectedItineraryId(itinerary.id)
                          setExpandedSteps(true)
                        }}
                      >
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col gap-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {itinerary.legs.map((leg, index) => (
                                  <span key={`chip-${leg.route.id}-${index}`} className="flex items-center gap-1">
                                    {index > 0 ? <ChevronRight size={12} className="text-ink-soft" /> : null}
                                    <span
                                      className="inline-grid h-6 min-w-7 place-items-center rounded px-1.5 text-xs font-extrabold text-white"
                                      style={{ backgroundColor: leg.route.color }}
                                    >
                                      {leg.route.code}
                                    </span>
                                  </span>
                                ))}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {isFastest ? <Badge variant="leaf" className="text-xs">Disarankan</Badge> : null}
                                <Badge
                                  variant={itinerary.transfers.length === 0 ? 'outline' : 'sky'}
                                  className="text-xs"
                                >
                                  {transitLabel(itinerary)}
                                </Badge>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-h3 leading-none font-extrabold text-brand-strong">
                                {itinerary.totalMinutes}
                              </p>
                              <p className="mt-0.5 text-xs text-ink-soft">menit</p>
                            </div>
                          </div>

                          <div className="mt-2.5 flex flex-col gap-1.5 border-l-2 border-line pl-2.5 text-xs leading-snug text-ink">
                            <p className="flex items-baseline gap-1.5">
                              <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                              <span>
                                <span className="font-semibold text-ink-strong">Naik</span> di{' '}
                                {shortStreet(itinerary.legs[0].boardStreet)}
                              </span>
                            </p>
                            <p className="flex items-baseline gap-1.5">
                              <span className="size-1.5 shrink-0 rounded-full bg-warning" />
                              <span>
                                <span className="font-semibold text-ink-strong">Turun</span> di{' '}
                                {shortStreet(itinerary.legs[itinerary.legs.length - 1].alightStreet)}
                              </span>
                            </p>
                          </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line-soft pt-2 text-xs text-ink-soft">
                          <span className="flex items-center gap-1">
                            <Footprints size={11} className="text-brand" />
                            {itinerary.walkMinutes} mnt jalan
                          </span>
                          <span className="flex items-center gap-1">
                            <BusFront size={11} className="text-brand" />
                            {itinerary.rideKm.toFixed(1)} km naik angkot
                          </span>
                          {eta !== null ? (
                            <span className="flex items-center gap-1 font-semibold text-brand">
                              <Clock3 size={11} />
                              ± {eta} mnt lagi
                            </span>
                          ) : null}
                        </div>
                        </div>

                        {/* Detailed Steps for Selected Itinerary */}
                        {isSelected ? (
                          <div className="border-t border-line-soft bg-muted/40 px-3 py-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedSteps((prev) => !prev)
                              }}
                              className="flex w-full items-center justify-between text-left text-xs font-semibold text-brand"
                            >
                              <span className="flex items-center gap-1.5">
                                <RouteIcon size={13} />
                                Langkah perjalanan ({itinerary.legs.length + 2} langkah)
                              </span>
                              {expandedSteps ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            {expandedSteps ? (
                              <ol className="mt-2.5 flex flex-col gap-2.5 text-xs">
                                {/* Step 1: Walk to board */}
                                <li className="flex gap-2.5">
                                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-leaf text-brand-strong">
                                    <Footprints size={12} />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-ink-strong">Jalan kaki ke titik naik</p>
                                    <p className="mt-0.5 text-ink-soft">
                                      {shortStreet(itinerary.legs[0].boardStreet)} · {formatDistance(itinerary.accessWalk.meters)} (± {itinerary.accessWalk.minutes} mnt)
                                    </p>
                                  </div>
                                </li>

                                {/* Steps for legs and transfers */}
                                {itinerary.legs.map((leg, index) => (
                                  <div key={`step-leg-${index}`} className="flex flex-col gap-2.5">
                                    <li className="flex gap-2.5">
                                      <span
                                        className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                                        style={{ backgroundColor: leg.route.color }}
                                      >
                                        {leg.route.code}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="font-semibold text-ink-strong">
                                          Naik angkot {leg.route.code} · {leg.route.name}
                                        </p>
                                        <p className="mt-0.5 text-ink-soft">
                                          Turun di {shortStreet(leg.alightStreet)} · {leg.rideKm.toFixed(1)} km (± {leg.rideMinutes} mnt)
                                        </p>
                                      </div>
                                    </li>

                                    {itinerary.transfers[index] ? (
                                      <li className="rounded-md border-[0.5px] border-sky/70 bg-sky/50 p-2.5">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary-strong">
                                          <ArrowDownUp size={13} />
                                          Transit {index + 1} · turun di {shortStreet(itinerary.transfers[index].fromStreet)}
                                        </div>
                                        <p className="mt-1 leading-relaxed text-ink">
                                          {transferWalkText(itinerary.transfers[index])}, lalu naik angkot{' '}
                                          <span className="font-semibold text-ink-strong">
                                            {itinerary.legs[index + 1].route.code}
                                          </span>.
                                        </p>
                                        {landmarks[landmarkKey(itinerary.transfers[index].at)] ? (
                                          <div className="mt-1 flex items-center gap-1 text-secondary-strong">
                                            <Landmark size={11} />
                                            <span>Patokan: dekat {landmarks[landmarkKey(itinerary.transfers[index].at)]}</span>
                                          </div>
                                        ) : null}
                                      </li>
                                    ) : null}
                                  </div>
                                ))}

                                {/* Step: Walk to destination */}
                                <li className="flex gap-2.5">
                                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-leaf text-brand-strong">
                                    <Footprints size={12} />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-ink-strong">Jalan kaki ke tujuan</p>
                                    <p className="mt-0.5 text-ink-soft">
                                      {formatDistance(itinerary.egressWalk.meters)} · ± {itinerary.egressWalk.minutes} menit
                                    </p>
                                  </div>
                                </li>

                                {/* Step: Arrival */}
                                <li className="flex gap-2.5">
                                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-peach text-amber-900">
                                    <MapPin size={12} />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-ink-strong">Tiba di {tripResult.to.name}</p>
                                    <p className="mt-0.5 text-ink-soft">
                                      Total perjalanan ± {itinerary.totalMinutes} menit
                                    </p>
                                  </div>
                                </li>
                              </ol>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

              </div>
            ) : (
              <div className="min-h-0 max-h-[38svh] overflow-y-auto rounded-lg border-[0.5px] border-line-soft bg-surface/95 p-3 shadow-float backdrop-blur md:max-h-[calc(100svh-14rem)]">

                {showDetail && selected ? (
                  <VehicleDetail
                    vehicle={selected}
                    onBack={() => {
                      setShowDetail(false)
                      setSelectedId(null)
                    }}
                  />
                ) : (
                  <>
                    {routeFilter === 'semua' && radiusKm !== null && userPosition ? (
                      <div className="mb-3 border-b border-line-soft pb-3">
                        <div className="mb-2 flex items-center justify-between gap-2 px-1">
                          <p className="text-xs font-bold text-ink-strong">
                            {nearbyFallback
                              ? `Angkot terdekat (${displayedVehicles.length})`
                              : `Angkot dalam ${radiusLabel(radiusKm)} (${filtered.length})`}
                          </p>
                          <button
                            type="button"
                            onClick={() => void locateNearby()}
                            disabled={nearbyLocating}
                            className="text-xs font-semibold text-brand hover:underline disabled:opacity-60"
                          >
                            {nearbyLocating ? 'Memperbarui…' : 'Perbarui lokasi'}
                          </button>
                        </div>
                        {nearbyFallback ? (
                          <p className="mb-2 rounded-md border-[0.5px] border-warning/40 bg-warning/10 p-2 text-xs text-ink">
                            Tidak ada angkot dalam radius {radiusLabel(radiusKm)}. Menampilkan{' '}
                            {displayedVehicles.length} angkot terdekat
                            {nearestVehicles[0]
                              ? ` (± ${formatDistance(Math.round(nearestVehicles[0].distanceKm * 1000))})`
                              : ''}.
                          </p>
                        ) : null}
                        <div className="flex flex-col gap-2">
                          {displayedVehicles.map((vehicle) => (
                            <VehicleCard
                              key={`nearby-${vehicle.id}`}
                              vehicle={vehicle}
                              active={vehicle.id === selectedId}
                              distanceMeters={Math.round(distanceKm(userPosition, vehicle.position) * 1000)}
                              onSelect={() => handleSelect(vehicle)}
                            />
                          ))}
                          {!displayedVehicles.length ? (
                            <p className="rounded-md border-[0.5px] border-dashed border-line-soft p-3 text-xs text-ink">
                              Belum ada angkot di sekitar lokasi Anda.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className="mb-2 flex items-center justify-between gap-2 px-1">
                      <p className="text-xs font-bold text-ink-strong">Jurusan angkot ({visibleRouteGroups.length})</p>
                      {routeFilter !== 'semua' ? <button type="button" onClick={() => selectRouteGroup(null)} className="text-xs font-semibold text-brand hover:underline">Hapus pilihan</button> : null}
                    </div>
                    <div className="flex flex-col gap-2">
                      {visibleRouteGroups.map((group) => {
                        const active = selectedCode === group.code
                        const count = nearbyVehicles.filter((vehicle) => group.directions.some((direction) => direction.id === vehicle.routeId)).length
                        return (
                          <div key={group.code} className={cn('overflow-hidden rounded-lg border-[0.5px] bg-surface', active ? 'border-brand ring-1 ring-brand/15' : 'border-line-soft')}>
                            <button type="button" className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-muted" aria-pressed={active} onClick={() => selectRouteGroup(group.code)}>
                              <span className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white" style={{ backgroundColor: group.color }}>{group.code}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-bold text-ink-strong">{group.name}</span>
                                <span className="mt-1 block text-xs text-ink">{group.directions.length} arah perjalanan | {count} angkot</span>
                              </span>
                              <ChevronRight size={16} className="shrink-0 text-brand" />
                            </button>
                            {active ? (
                              <div className="space-y-2 border-t border-line-soft bg-muted/40 p-2">
                                <p className="px-1 text-xs text-ink">Lokasi angkot jurusan {group.code} ditampilkan di peta.</p>
                                {filtered.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} active={vehicle.id === selectedId} onSelect={() => handleSelect(vehicle)} />)}
                                {!filtered.length ? <p className="p-2 text-xs text-ink">Tidak ada angkot dalam filter radius saat ini.</p> : null}
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                      {!visibleRouteGroups.length ? <p className="py-5 text-center text-xs text-ink">Jurusan tidak ditemukan. Coba kode atau nama jalan lain.</p> : null}
                    </div>
                  </>
                )}

              </div>
            )}
          </div>
        )}

        {/* Top-Right Map Control Buttons */}
        <div className="pointer-events-auto absolute top-3 right-3 hidden flex-col gap-2 md:top-4 md:right-4 md:flex">
          <Button
            variant="outline"
            size="icon"
            className="size-10 bg-surface/95 backdrop-blur"
            aria-label="Pusatkan ke lokasi saya"
            onClick={() => void handleUseLocation()}
            disabled={locating}
            aria-busy={locating}
          >
            {locating ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-10 bg-surface/95 backdrop-blur"
            aria-label={`Ganti radius, saat ini ${radiusLabel(radiusKm)}`}
            title={`Radius: ${radiusLabel(radiusKm)}`}
            onClick={() => {
              const currentIndex = radiusOptions.findIndex((option) => option.value === radiusKm)
              const next = radiusOptions[(currentIndex + 1) % radiusOptions.length]
              showRadiusNotice(
                next.value === null ? 'Semua radius' : `Radius ${radiusLabel(next.value)}`,
              )
              void handleRadiusSelect(next.value)
            }}
          >
            <Crosshair size={17} />
          </Button>
        </div>

        {/* Bottom Bar: Status Legend & Action Buttons */}
        <div className="pointer-events-auto absolute bottom-3 left-1/2 flex w-full max-w-[460px] -translate-x-1/2 flex-col items-center gap-2 px-3 md:bottom-4">
          <div className="hidden items-center gap-3 rounded-md border-[0.5px] border-line-soft bg-surface/90 px-3.5 py-2 shadow-float backdrop-blur md:flex">
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <span className="size-2 rounded-full bg-brand" /> Jalan
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <span className="size-2 rounded-full bg-warning" /> Merayap
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <span className="size-2 rounded-full bg-info" /> Ngetem
            </span>
          </div>

          {passengerMode && megatMode === 'idle' ? (
            <div className="w-full rounded-md border-[0.5px] border-line-soft bg-surface/95 p-3 text-xs shadow-card">
              {ownRequest?.status === 'expired' ? <p role="status" className="mb-2 text-danger">Permintaan megat kedaluwarsa. Silakan coba lagi.</p> : null}
              <label className="block space-y-1"><span>Pilih arah jurusan untuk megat</span><select aria-label="Arah jurusan megat" className="h-10 w-full rounded-md border border-line bg-surface px-2" value={selectedItinerary?.legs[0]?.route.id ?? selected?.routeId ?? megatDirectionId} onChange={(e) => setMegatDirectionId(e.target.value)}><option value="">Pilih arah trayek</option>{routes.filter((r) => selectedCode === 'semua' || r.code === selectedCode).map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}</select></label>
              <p className="mt-2 text-ink">{availableVehicles.length ? 'Megat membagikan lokasi Anda kepada pengemudi di trayek yang sama.' : 'Belum ada angkot aktif. Anda tetap dapat megat dan menunggu pengemudi.'}</p>
            </div>
          ) : null}

          {passengerMode && megatMode !== 'idle' ? (
            <div className="w-full rounded-lg border-[0.5px] border-line-soft bg-surface/95 p-3 shadow-float backdrop-blur">
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
                  <p className="mt-0.5 text-xs leading-relaxed text-ink">
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
                  <Button size="sm" onClick={() => void handleUseLocation()}>
                    <Navigation size={13} />
                    Perbarui lokasi saya
                  </Button>
                ) : null}
                {(megatMode === 'matched' || megatMode === 'searching') ? (
                  <div className="flex flex-wrap gap-2">
                    {availableVehicles.filter((v) => !v.isExample && !isVehicleStale(v) && v.routeId === activeRequest?.routeId && (!matchedVehicleId || v.id === matchedVehicleId) && userPosition && distanceKm(v.position,userPosition) <= 0.1).map((v) => (
                      <Button key={v.id} size="sm" disabled={megatBusy} onClick={() => { void handleBoard(v.id) }}>Saya naik {v.plate}</Button>
                    ))}
                  </div>
                ) : null}
                <Button size="sm" variant="outline" disabled={megatBusy} onClick={() => { void handleCancelMegat() }}>
                  <X size={13} />
                  Batalkan
                </Button>
              </div>
            </div>
          ) : null}

          {passengerMode ? (
            megatMode === 'idle' ? (
              <Button size="lg" className="rounded-full px-6 shadow-float" onClick={() => { void handleMegat() }} disabled={megatBusy || connection !== 'connected'}>
                <MapPin size={17} />
                Megat Angkot
              </Button>
            ) : null
          ) : tripResult ? (
            <Button asChild><Link to={passenger?.role === 'penumpang' ? `/penumpang?${searchParams}` : '/login'} state={{from:{pathname:'/penumpang',search:`?${searchParams}`}}}>Megat pada jurusan pilihan</Link></Button>
          ) : !tripResult ? (
            <Button
              size="lg"
              className="rounded-full px-6 shadow-float"
              onClick={() => openRouteToDestination()}
            >
              <Navigation size={17} />
              Cari Rute ke Tujuan
            </Button>
          ) : null}
        </div>

        {/* Live Vehicles Count Badge */}
        {!tripResult ? (
          <div className="pointer-events-none absolute right-3 bottom-20 flex items-center gap-1.5 rounded-full border-[0.5px] border-line-soft bg-surface/90 px-3 py-1.5 text-xs font-medium text-ink shadow-soft backdrop-blur md:right-4 md:bottom-4">
            <Users size={12} className="text-brand" />
            {routeFilter === 'semua'
              ? nearbyFallback
                ? `${displayedVehicles.length} angkot terdekat`
                : radiusKm !== null && userPosition
                  ? `${filtered.length} angkot dalam ${radiusLabel(radiusKm)}`
                  : `${displayedVehicles.length} angkot ditampilkan`
              : `${filtered.length} angkot ditampilkan`}
          </div>
        ) : null}
      </div>

      <Badge
        role="status"
        aria-live={radiusNotice ? 'polite' : 'off'}
        className={cn(
          'absolute top-3 left-1/2 z-[401] w-[min(90%,28rem)] -translate-x-1/2 justify-center bg-brand-strong text-center whitespace-normal text-white',
          radiusNotice && 'gap-1.5',
        )}
      >
        {radiusNotice ? (
          <>
            <Crosshair size={15} />
            {radiusNotice}
          </>
        ) : (
          liveError ?? (connection === 'connected' ? 'Posisi GPS pengemudi · pilih jurusan untuk melihat angkot' : 'Menunggu koneksi layanan GPS')
        )}
      </Badge>


    </section>
  )
}
