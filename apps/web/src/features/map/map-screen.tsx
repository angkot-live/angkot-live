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
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge, VehicleStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  landmarkPlaces,
  placeFromCoordinates,
  resolvePlace,
  reverseLandmark,
  searchLocalPlaces,
  type Place,
} from '@/features/routing/geocode'
import { PlaceInput } from '@/features/routing/place-input'
import { CustomPlaceControls } from '@/features/routing/custom-place-controls'
import { coordinateLabel, parseCoordinatePair } from '@/lib/coordinates'
import { walkingRouter } from '@/features/routing/walking-router'
import { WalkingRouteNotice } from '@/features/routing/walking-route-notice'
import {
  planTrip,
  type Itinerary,
  type TripPlan,
  type TripTransfer,
  type TripWalk,
} from '@/features/routing/trip-planner'
import { useAuthStore } from '@/features/auth/auth-store'
import { megatStore, useMegat } from '@/features/tracking/use-megat'
import { activeMegat, projectToRoute, MEGAT_WAIT_MS } from '@/features/tracking/megat-engine'
import { isVehicleStale, useLiveVehicles } from '@/features/tracking/use-live-vehicles'
import { groupRouteDirections, vehiclesForRouteSelection } from '@/features/tracking/route-directory'
import { routes } from '@/mocks/data'
import { cn } from '@/lib/cn'
import { getCurrentLocation, locationErrorMessage } from '@/lib/geolocation'
import { distanceKm, nearestRoutePoint, type LatLng } from '@/lib/geo'
import type { RouteInfo, Vehicle } from '@/types'

const center: [number, number] = [-6.9039, 107.618]
const MEGAT_TIMEOUT_SECONDS = MEGAT_WAIT_MS / 1000

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
        <span style="background:${color};color:#fff;border-radius:9999px;padding:4px 9px;font-size:11px;font-weight:700;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.22);white-space:nowrap;border:2px solid ${selected ? '#fff' : 'transparent'}">
          ${vehicle.routeCode}
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
        <span style="background:#325F99;color:#fff;border-radius:9999px;padding:4px 9px;font-size:10px;font-weight:800;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.22);white-space:nowrap;border:2px solid #fff">
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
        <span style="background:${color};color:#fff;border-radius:9999px;padding:4px 9px;font-size:10px;font-weight:800;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.25);white-space:nowrap;border:2px solid #fff;display:inline-flex;align-items:center;gap:4px">
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

function MapEvents({ onBackgroundClick, picking, onPick }: {
  onBackgroundClick: () => void
  picking: boolean
  onPick: (position: LatLng) => void
}) {
  const map = useMapEvents({
    click: (event) => {
      const point = event.latlng.wrap()
      if (picking) onPick([point.lat, point.lng])
      else onBackgroundClick()
    },
  })
  useEffect(() => {
    if (!picking) return
    const container = map.getContainer()
    const previous = container.style.cursor
    container.style.cursor = 'crosshair'
    return () => { container.style.cursor = previous }
  }, [map, picking])
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
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = searchParams.get('tab') === 'armada' ? 'armada' :
    searchParams.get('tab') === 'rute' || searchParams.has('from') || searchParams.has('to')
      ? 'rute'
      : 'armada'

  const [activeTab, setActiveTab] = useState<'armada' | 'rute'>(initialTab)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  // Armada Live States
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('vehicle'))
  const [query, setQuery] = useState(searchParams.get('to') ?? '')
  const [routeFilter, setRouteFilter] = useState<string>(searchParams.get('route') ?? 'semua')
  const [radiusKm, setRadiusKm] = useState<number | null>(null)
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

  // Cari Rute States
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
  const [tripResult, setTripResult] = useState<{ from: Place; to: Place; plan: TripPlan } | null>(null)
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null)
  const [itineraryFilter, setItineraryFilter] = useState<'all' | 'direct' | 'transit'>('all')
  const [expandedSteps, setExpandedSteps] = useState(true)
  const [locating, setLocating] = useState(false)
  const [pickingPoint, setPickingPoint] = useState<'from' | 'to' | null>(null)
  const [pointFocus, setPointFocus] = useState<{ position: LatLng; revision: number } | null>(null)
  useEffect(() => {
    if (!pickingPoint) return
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setPickingPoint(null); setIsPanelCollapsed(false) }
    }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [pickingPoint])
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [locationFocus, setLocationFocus] = useState(0)
  const userPosition = activeRequest?.position ?? userLocation ?? (activeTab === 'rute' ? fromPlace?.position : null)
  const userNearestRoute = useMemo(() => {
    if (!userPosition) return null
    const route = routes.find((item) => item.id === activeRequest?.routeId)
    return route ? { ...projectToRoute(userPosition, route), route } : nearestRoutePoint(userPosition, routes)
  }, [userPosition, activeRequest?.routeId])
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

  // Switch to rute tab if URL params indicate it
  useEffect(() => {
    if (searchParams.get('tab') !== 'armada' &&
        (searchParams.get('tab') === 'rute' || searchParams.has('from') || searchParams.has('to'))) {
      setActiveTab('rute')
      setIsPanelCollapsed(false)
    }
  }, [searchParams])

  const liveVehicles = useLiveVehicles()
  const availableVehicles = useMemo(
    () => liveVehicles.filter((vehicle) => vehicle.driverVerified !== false &&
      vehicle.status !== 'offline' && vehicle.status !== 'istirahat' && !isVehicleStale(vehicle)),
    [liveVehicles],
  )

  const routeGroups = useMemo(() => groupRouteDirections(routes), [])
  const visibleRouteGroups = useMemo(() => {
    const term = query.trim().toLowerCase()
    return routeGroups.filter((group) => !term || group.code.toLowerCase().includes(term) ||
      group.directions.some((route) => [route.name, route.origin, route.destination, ...(route.streets ?? [])]
        .some((name) => name.toLowerCase().includes(term))))
  }, [routeGroups, query])
  const selectedCode =
    routeFilter === 'semua'
      ? 'semua'
      : (routes.find((route) => route.id === routeFilter)?.code ?? routeFilter)

  const filtered = useMemo(() => {
    return vehiclesForRouteSelection(availableVehicles, routeFilter, routes).filter((vehicle) => {
      const matchesRadius =
        radiusKm === null || (userPosition != null && distanceKm(userPosition, vehicle.position) <= radiusKm)
      return matchesRadius
    })
  }, [availableVehicles, radiusKm, routeFilter, userPosition])

  const selected = availableVehicles.find((vehicle) => vehicle.id === selectedId) ?? null
  const matchedVehicle = liveVehicles.find((vehicle) => vehicle.id === matchedVehicleId) ?? null
  const currentMegatWalk = megatWalk?.from === userPosition && megatWalk?.to === userNearestRoute?.point
    ? megatWalk : null
  const megatDistanceMeters = currentMegatWalk?.meters ?? Math.round((userNearestRoute?.distanceKm ?? 0) * 1000)

  const activeRoutes = useMemo(() => {
    if (activeTab === 'rute') {
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
  }, [activeTab, routeFilter, selected])

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

  async function runRouteSearch(
    fromVal: string,
    fromChosen: Place | null,
    toVal: string,
    toChosen: Place | null,
  ) {
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

    const [origin, destination] = await Promise.all([
      fromChosen ?? resolvePlace(fromVal),
      toChosen ?? resolvePlace(toVal),
    ])
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
    const estimatedPlan = planTrip(routes, origin.position, destination.position)
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
        next.set('tab', 'rute')
        next.set('from', origin.name)
        next.set('fl', latLngParam(origin.position))
        next.set('to', destination.name)
        next.set('tl', latLngParam(destination.position))
        return next
      },
      { replace: true },
    )
  }

  // Run auto search if opened with from & to params
  useEffect(() => {
    if (initialSearchDone.current) return
    const initialFrom = searchParams.get('from')
    const initialTo = searchParams.get('to')
    if (initialFrom?.trim() && initialTo?.trim()) {
      initialSearchDone.current = true
      void runRouteSearch(initialFrom, fromPlace, initialTo, toPlace)
    }
  }, [searchParams, fromPlace, toPlace])

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
    setPickingPoint(null)
    setIsPanelCollapsed(false)
    setPointFocus((previous) => ({ position, revision: (previous?.revision ?? 0) + 1 }))
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('tab', 'rute')
      next.set(field === 'from' ? 'from' : 'to', place.name)
      next.set(field === 'from' ? 'fl' : 'tl', latLngParam(position))
      return next
    }, { replace: true })
  }

  function startPicking(field: 'from' | 'to') {
    setPickingPoint((current) => current === field ? null : field)
    setIsPanelCollapsed(true)
  }

  function handleRouteSwap() {
    setPickingPoint(null)
    setFromText(toText)
    setToText(fromText)
    setFromPlace(toPlace)
    setToPlace(fromPlace)
  }

  function handleRouteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runRouteSearch(fromText, fromPlace, toText, toPlace)
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
      setLocationFocus((value) => value + 1)
      if (activeRequest?.status === 'walking') megatStore.arrive(activeRequest.id, passengerId, place.position)
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
    setRouteFilter(code ?? 'semua')
    setSelectedId(null)
    setShowDetail(false)
    setQuery('')
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('tab', 'armada')
      next.delete('vehicle')
      if (code) next.set('route', code)
      else next.delete('route')
      return next
    }, { replace: true })
  }

  function megatRoute() {
    return (activeTab === 'rute' ? selectedItinerary?.legs[0]?.route : null)
      ?? routes.find((route) => route.id === routeFilter)
      ?? routes.find((route) => route.id === selected?.routeId)
      ?? userNearestRoute?.route
  }

  function handleMegat() {
    if (!userPosition) { toast.info('Gunakan lokasi saya atau pilih titik asal terlebih dahulu.'); return }
    if (!availableVehicles.some((vehicle) => !vehicle.isExample)) { toast.info('Angkot di peta masih animasi contoh. GPS pengemudi belum terhubung.'); return }
    const route = megatRoute()
    if (!route) { toast.error('Pilih trayek terlebih dahulu.'); return }
    try {
      const request = megatStore.create({
        passengerId, name: passenger?.name ?? 'Penumpang demo', routeId: route.id,
        position: userPosition, destination: tripResult?.to.name ?? (toText || query || 'Belum dipilih'),
      })
      setRouteFilter(route.id)
      toast.info(request.status === 'walking' ? 'Menuju titik rute sebelum megat aktif' : 'Permintaan megat dikirim', {
        description: `Trayek ${route.code} | ${route.name}. Menunggu sumber lokasi dan respons pengemudi aktif.`,
      })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Permintaan belum dapat dikirim.') }
  }

  function handleCancelMegat() {
    if (activeRequest) megatStore.cancel(activeRequest.id, passengerId)
    toast.info('Megat dibatalkan')
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
        />
        <MapEvents
          picking={pickingPoint !== null}
          onPick={(position) => { if (pickingPoint) handleCustomPoint(pickingPoint, position) }}
          onBackgroundClick={() => {
            setSelectedId(null)
            setShowDetail(false)
          }}
        />

        {activeTab === 'rute' && !tripResult ? (
          <>
            {fromPlace ? <Marker position={fromPlace.position} icon={pinIcon('Asal', '#1F5C3A')} draggable
              eventHandlers={{ dragend: (event) => {
                const point = (event.target as L.Marker).getLatLng().wrap()
                handleCustomPoint('from', [point.lat, point.lng])
              } }} /> : null}
            {toPlace ? <Marker position={toPlace.position} icon={pinIcon('Tujuan', '#B45309')} draggable
              eventHandlers={{ dragend: (event) => {
                const point = (event.target as L.Marker).getLatLng().wrap()
                handleCustomPoint('to', [point.lat, point.lng])
              } }} /> : null}
          </>
        ) : null}

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
        {activeTab === 'armada' ? <RouteBounds routes={routes} filter={routeFilter} /> : null}

        {/* Selected Itinerary on Wide Live Map */}
        {activeTab === 'rute' && selectedItinerary && tripResult ? (
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

        {/* Live Vehicles Markers */}
        {filtered.map((vehicle) => (
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
      </MapContainer>

      {pickingPoint ? (
        <div role="status" className="absolute top-16 left-1/2 z-[1100] flex max-w-[90%] -translate-x-1/2 items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm shadow-float">
          <span>Klik peta untuk titik {pickingPoint === 'from' ? 'asal' : 'tujuan'}. Tekan Esc untuk batal.</span>
          <Button type="button" size="sm" variant="outline" onClick={() => { setPickingPoint(null); setIsPanelCollapsed(false) }}>Batal</Button>
        </div>
      ) : null}

      {/* Floating UI Over Wide Map */}
      <div className="pointer-events-none absolute inset-0 z-[400]">
        {/* Collapsed Pill Button */}
        {isPanelCollapsed ? (
          <div className="pointer-events-auto absolute top-3 left-3 md:top-4 md:left-4">
            <button
              type="button"
              onClick={() => setIsPanelCollapsed(false)}
              className="flex items-center gap-2 rounded-full border border-line-soft bg-surface/95 px-4 py-2.5 text-xs font-bold text-ink-strong shadow-float backdrop-blur transition hover:bg-muted"
            >
              {activeTab === 'rute' && selectedItinerary && tripResult ? (
                <>
                  <RouteIcon size={15} className="text-brand" />
                  <span className="max-w-[200px] truncate sm:max-w-xs">
                    {fromText} → {toText}
                  </span>
                  <span className="rounded-full bg-leaf px-2 py-0.5 text-[10px] text-brand-strong">
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
          <div className="pointer-events-auto absolute top-3 left-3 right-3 flex max-h-[calc(100svh-5.5rem)] flex-col gap-2 md:top-4 md:left-4 md:right-auto md:w-[420px]">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between gap-1 rounded-xl border border-line-soft bg-surface/95 p-1.5 shadow-float backdrop-blur">
              <div className="flex flex-1 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('armada')
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev)
                      next.delete('tab')
                      return next
                    })
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition',
                    activeTab === 'armada'
                      ? 'bg-brand text-white shadow-soft'
                      : 'text-ink hover:bg-muted hover:text-ink-strong',
                  )}
                >
                  <BusFront size={14} />
                  Armada Live
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('rute')
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev)
                      next.set('tab', 'rute')
                      return next
                    })
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition',
                    activeTab === 'rute'
                      ? 'bg-brand text-white shadow-soft'
                      : 'text-ink hover:bg-muted hover:text-ink-strong',
                  )}
                >
                  <RouteIcon size={14} />
                  Cari Rute
                </button>
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

            {/* TAB CONTENT: CARI RUTE */}
            {activeTab === 'rute' ? (
              <div className="flex flex-col gap-3 overflow-y-auto rounded-xl border border-line-soft bg-surface/95 p-3.5 shadow-float backdrop-blur">
                <form onSubmit={handleRouteSubmit} className="flex flex-col gap-2.5">
                  <div className="flex flex-col gap-2">
                    <PlaceInput
                      id="peta-from"
                      value={fromText}
                      onValueChange={(val) => {
                        setFromText(val)
                        setFromPlace(null)
                      }}
                      onSelect={(place) => {
                        setFromPlace(place)
                        setFromText(place.name)
                      }}
                      invalid={routeError?.field === 'from'}
                      icon={<MapPin size={15} className="text-brand" />}
                      placeholder="Titik asal (contoh: Sarijadi)"
                      trailing={
                        <button
                          type="button"
                          onClick={() => void handleUseLocation()}
                          disabled={locating}
                          aria-busy={locating}
                          className="grid size-8 place-items-center rounded-md text-brand hover:bg-muted-strong"
                          aria-label="Gunakan lokasi saya"
                          title="Gunakan lokasi saya"
                        >
                          {locating ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
                        </button>
                      }
                    />

                    <CustomPlaceControls field="from" place={fromPlace} picking={pickingPoint === 'from'}
                      onPick={() => startPicking('from')} onSelect={(position) => handleCustomPoint('from', position)} />

                    <div className="flex items-center justify-center">
                      <Button
                        type="button"
                        variant="soft"
                        size="icon"
                        className="size-7 rounded-full"
                        aria-label="Tukar asal dan tujuan"
                        onClick={handleRouteSwap}
                      >
                        <ArrowDownUp size={13} />
                      </Button>
                    </div>

                    <PlaceInput
                      id="peta-to"
                      value={toText}
                      onValueChange={(val) => {
                        setToText(val)
                        setToPlace(null)
                      }}
                      onSelect={(place) => {
                        setToPlace(place)
                        setToText(place.name)
                      }}
                      invalid={routeError?.field === 'to'}
                      icon={<Navigation size={15} className="text-peach" />}
                      placeholder="Tujuan (contoh: Mall d'Botanica)"
                    />
                    <CustomPlaceControls field="to" place={toPlace} picking={pickingPoint === 'to'}
                      onPick={() => startPicking('to')} onSelect={(position) => handleCustomPoint('to', position)} />
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2 font-bold shadow-soft"
                    disabled={routeSearchStatus === 'loading'}
                  >
                    {routeSearchStatus === 'loading' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                    Cari Rute
                  </Button>
                </form>

                {routeError ? (
                  <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-danger">
                    <AlertCircle size={14} className="shrink-0" />
                    {routeError.message}
                  </p>
                ) : null}

                {/* Example Quick Buttons */}
                {!tripResult && routeSearchStatus === 'idle' ? (
                  <div className="flex flex-col gap-1.5 border-t border-line-soft pt-2.5">
                    <p className="text-[11px] font-semibold text-ink-soft">Coba rute populer:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {exampleRoutes.map((ex) => (
                        <button
                          key={`${ex.from}-${ex.to}`}
                          type="button"
                          onClick={() => handleExampleClick(ex)}
                          className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-brand hover:text-brand"
                        >
                          {ex.from} → {ex.to}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Results Section */}
                {tripResult ? (
                  <div className="flex flex-col gap-3 border-t border-line-soft pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-ink-strong">
                          {itineraries.length > 0 ? `${itineraries.length} pilihan rute` : 'Rute tidak ditemukan'}
                        </p>
                        <p className="text-[10px] text-ink">
                          {tripResult.from.name} → {tripResult.to.name}
                        </p>
                      </div>
                      <Badge variant="leaf" className="text-[10px]">
                        Peta Live Aktif
                      </Badge>
                    </div>

                    <WalkingRouteNotice plan={tripResult.plan} />

                    {/* Filter Pills */}
                    {itineraries.length > 0 && directCount > 0 && transitCount > 0 ? (
                      <div className="flex items-center gap-1 rounded-lg border border-line-soft bg-surface p-1 text-[11px]">
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
                            onClick={() => setSelectedItineraryId(itinerary.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {itinerary.legs.map((leg, index) => (
                                  <span key={`chip-${leg.route.id}-${index}`} className="flex items-center gap-1">
                                    {index > 0 ? <ChevronRight size={12} className="text-ink-soft" /> : null}
                                    <span
                                      className="inline-grid h-6 min-w-7 place-items-center rounded px-1.5 text-[11px] font-extrabold text-white"
                                      style={{ backgroundColor: leg.route.color }}
                                    >
                                      {leg.route.code}
                                    </span>
                                  </span>
                                ))}
                                {isFastest ? <Badge variant="leaf" className="text-[10px]">Disarankan</Badge> : null}
                                <Badge
                                  variant={itinerary.transfers.length === 0 ? 'outline' : 'sky'}
                                  className="text-[10px]"
                                >
                                  {transitLabel(itinerary)}
                                </Badge>
                              </div>
                              <div className="rounded bg-leaf px-2 py-1 text-center">
                                <p className="text-sm font-extrabold text-brand-strong leading-none">
                                  {itinerary.totalMinutes}
                                </p>
                                <p className="text-[9px] text-brand-strong/70">menit</p>
                              </div>
                            </div>

                            <p className="mt-1.5 text-xs text-ink">
                              Naik {itinerary.legs[0].route.code} di {shortStreet(itinerary.legs[0].boardStreet)} → turun di{' '}
                              {shortStreet(itinerary.legs[itinerary.legs.length - 1].alightStreet)}
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-ink-soft">
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

                            {/* Detailed Steps for Selected Itinerary */}
                            {isSelected ? (
                              <div className="mt-3 border-t border-line-soft pt-2.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedSteps((prev) => !prev)
                                  }}
                                  className="flex w-full items-center justify-between text-left text-xs font-bold text-brand hover:underline"
                                >
                                  <span>Langkah Perjalanan ({itinerary.legs.length + 2} langkah)</span>
                                  {expandedSteps ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                {expandedSteps ? (
                                  <ol className="mt-2.5 flex flex-col gap-2 text-xs">
                                    {/* Step 1: Walk to board */}
                                    <li className="flex gap-2">
                                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-leaf text-brand-strong">
                                        <Footprints size={12} />
                                      </span>
                                      <div>
                                        <p className="font-semibold text-ink-strong">
                                          Jalan kaki ke titik naik di {shortStreet(itinerary.legs[0].boardStreet)}
                                        </p>
                                        <p className="text-[11px] text-ink">
                                          {formatDistance(itinerary.accessWalk.meters)} · ± {itinerary.accessWalk.minutes} menit
                                        </p>
                                      </div>
                                    </li>

                                    {/* Steps for legs and transfers */}
                                    {itinerary.legs.map((leg, index) => (
                                      <div key={`step-leg-${index}`} className="flex flex-col gap-2">
                                        <li className="flex gap-2">
                                          <span
                                            className="grid size-6 shrink-0 place-items-center rounded-full text-white text-[10px] font-bold"
                                            style={{ backgroundColor: leg.route.color }}
                                          >
                                            {leg.route.code}
                                          </span>
                                          <div>
                                            <p className="font-semibold text-ink-strong">
                                              Naik Angkot {leg.route.code} ({leg.route.name})
                                            </p>
                                            <p className="text-[11px] text-ink">
                                              Turun di {shortStreet(leg.alightStreet)} · {leg.rideKm.toFixed(1)} km (± {leg.rideMinutes} mnt)
                                            </p>
                                          </div>
                                        </li>

                                        {itinerary.transfers[index] ? (
                                          <li className="rounded-lg border border-sky-200 bg-sky-50/70 p-2 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                                            <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200 text-[11px]">
                                              <ArrowDownUp size={13} className="text-sky-600 dark:text-sky-400" />
                                              Transit ke-{index + 1}: Turun di {shortStreet(itinerary.transfers[index].fromStreet)}
                                            </div>
                                            <p className="mt-0.5 text-[11px] leading-relaxed text-ink">
                                              {transferWalkText(itinerary.transfers[index])}, lalu naik Angkot{' '}
                                              <span className="font-bold text-ink-strong">
                                                {itinerary.legs[index + 1].route.code}
                                              </span>.
                                            </p>
                                            {landmarks[landmarkKey(itinerary.transfers[index].at)] ? (
                                              <div className="mt-1 flex items-center gap-1 text-[10px] text-sky-800 dark:text-sky-300">
                                                <Landmark size={11} />
                                                <span>Patokan: Dekat {landmarks[landmarkKey(itinerary.transfers[index].at)]}</span>
                                              </div>
                                            ) : null}
                                          </li>
                                        ) : null}
                                      </div>
                                    ))}

                                    {/* Step: Walk to destination */}
                                    <li className="flex gap-2">
                                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-leaf text-brand-strong">
                                        <Footprints size={12} />
                                      </span>
                                      <div>
                                        <p className="font-semibold text-ink-strong">Jalan kaki ke tujuan</p>
                                        <p className="text-[11px] text-ink">
                                          {formatDistance(itinerary.egressWalk.meters)} · ± {itinerary.egressWalk.minutes} menit
                                        </p>
                                      </div>
                                    </li>

                                    {/* Step: Arrival */}
                                    <li className="flex gap-2">
                                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-peach text-amber-900">
                                        <MapPin size={12} />
                                      </span>
                                      <div>
                                        <p className="font-semibold text-ink-strong">Tiba di {tripResult.to.name}</p>
                                        <p className="text-[11px] text-ink">
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
                ) : null}
              </div>
            ) : (
              /* TAB CONTENT: ARMADA LIVE */
              <>
                <div className="rounded-xl border border-line-soft bg-surface/95 p-3 shadow-float backdrop-blur">
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-soft"
                    />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Cari kode, jurusan, atau nama jalan..."
                      className="h-10 pl-10"
                      aria-label="Cari jurusan angkot"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-ink-soft">Pilih jurusan di bawah untuk menampilkan jalur dan posisi angkotnya.</p>
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

                <div className="max-h-[38svh] overflow-y-auto rounded-xl border border-line-soft bg-surface/95 p-3 shadow-float backdrop-blur md:max-h-[calc(100svh-14rem)]">
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
                      <div className="mb-2 flex items-center justify-between gap-2 px-1">
                        <p className="text-xs font-bold text-ink-strong">Jurusan angkot ({visibleRouteGroups.length})</p>
                        {routeFilter !== 'semua' ? <button type="button" onClick={() => selectRouteGroup(null)} className="text-[11px] font-semibold text-brand hover:underline">Hapus pilihan</button> : null}
                      </div>
                      <div className="flex flex-col gap-2">
                        {visibleRouteGroups.map((group) => {
                          const active = selectedCode === group.code
                          const count = availableVehicles.filter((vehicle) => group.directions.some((direction) => direction.id === vehicle.routeId)).length
                          return (
                            <div key={group.code} className={cn('overflow-hidden rounded-xl border bg-surface', active ? 'border-brand ring-1 ring-brand/15' : 'border-line-soft')}>
                              <button type="button" className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-muted" aria-pressed={active} onClick={() => selectRouteGroup(group.code)}>
                                <span className="grid size-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-white" style={{ backgroundColor: group.color }}>{group.code}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block text-xs font-bold text-ink-strong">{group.name}</span>
                                  <span className="mt-1 block text-[11px] text-ink">{group.directions.length} arah perjalanan | {count} angkot</span>
                                </span>
                                <ChevronRight size={16} className="shrink-0 text-brand" />
                              </button>
                              {active ? (
                                <div className="space-y-2 border-t border-line-soft bg-muted/40 p-2">
                                  <p className="px-1 text-[11px] text-ink">Lokasi angkot jurusan {group.code} ditampilkan di peta.</p>
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
              </>
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

        {/* Bottom Bar: Status Legend & Action Buttons */}
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

          {passengerMode && megatMode === 'idle' ? (
            <div className="w-full rounded-md border border-line-soft bg-surface/95 p-3 text-xs shadow-soft">
              {ownRequest?.status === 'expired' ? <p role="status" className="mb-2 text-danger">Permintaan megat kedaluwarsa. Silakan coba lagi.</p> : null}
              <p className="text-ink">Belum ada sumber lokasi pengemudi yang terhubung.</p>
            </div>
          ) : null}

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
                  <Button size="sm" onClick={() => void handleUseLocation()}>
                    <Navigation size={13} />
                    Perbarui lokasi saya
                  </Button>
                ) : null}
                {megatMode === 'matched' ? (
                  <Button size="sm" asChild>
                    <Link to="/penumpang/perjalanan" onClick={(event) => {
                      if (!activeRequest || !megatStore.board(activeRequest.id, passengerId)) {
                        event.preventDefault()
                        toast.info('Permintaan sudah tidak aktif. Buat megat kembali.')
                      }
                    }}>
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
              <Button size="lg" className="rounded-full px-6 shadow-float" onClick={handleMegat} disabled={!userPosition || !availableVehicles.some((vehicle) => !vehicle.isExample)}>
                <MapPin size={17} />
                Megat Angkot
              </Button>
            ) : null
          ) : activeTab === 'armada' ? (
            <Button
              size="lg"
              className="rounded-full px-6 shadow-float"
              onClick={() => {
                setActiveTab('rute')
                if (query.trim()) {
                  setToText(query.trim())
                }
                setIsPanelCollapsed(false)
              }}
            >
              <Navigation size={17} />
              Cari Rute ke Tujuan
            </Button>
          ) : null}
        </div>

        {/* Live Vehicles Count Badge */}
        <div className="pointer-events-none absolute right-3 bottom-20 flex items-center gap-1.5 rounded-full border border-line-soft bg-surface/90 px-3 py-1.5 text-[10px] font-medium text-ink shadow-soft backdrop-blur md:right-4 md:bottom-4">
          <Users size={12} className="text-brand" />
          {routeFilter === 'semua' ? 'Pilih jurusan untuk melihat angkot' : `${filtered.length} angkot ditampilkan`}
        </div>
      </div>

      <Badge className="absolute top-3 left-1/2 z-[401] max-w-[90%] -translate-x-1/2 bg-brand-strong text-center text-white">
        Animasi contoh · 1–2 angkot per arah trayek · bukan GPS langsung
      </Badge>


    </section>
  )
}
