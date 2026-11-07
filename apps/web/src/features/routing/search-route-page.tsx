import {
  AlertCircle,
  ArrowDownUp,
  ArrowRight,
  BusFront,
  ChevronRight,
  Clock3,
  Crosshair,
  Footprints,
  Landmark,
  Loader2,
  MapPin,
  Navigation,
  Repeat2,
  Route as RouteIcon,
  Search,
  Sparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import type { LatLng } from '@/lib/geo'
import { routes, vehicles } from '@/mocks/data'

import {
  landmarkPlaces,
  placeFromCoordinates,
  resolvePlace,
  reverseLandmark,
  searchLocalPlaces,
  type Place,
} from './geocode'
import { ItineraryMap } from './itinerary-map'
import { PlaceInput } from './place-input'
import {
  estimateNextArrival,
  planTrip,
  type Itinerary,
  type TripPlan,
  type TripTransfer,
} from './trip-planner'

// ---- Util tampilan -----------------------------------------------------------

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
  if (!value) return null
  const [lat, lng] = value.split(',').map(Number)
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null
}

function latLngParam([lat, lng]: LatLng) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

function transitLabel(itinerary: Itinerary) {
  return itinerary.transfers.length === 0
    ? 'Langsung'
    : `${itinerary.transfers.length}x transit`
}

function landmarkKey([lat, lng]: LatLng) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

const vehiclePositionsByRoute = vehicles.reduce((map, vehicle) => {
  const list = map.get(vehicle.routeId) ?? []
  list.push(vehicle.position)
  map.set(vehicle.routeId, list)
  return map
}, new Map<string, LatLng[]>())

function nextArrival(itinerary: Itinerary) {
  const leg = itinerary.legs[0]
  return estimateNextArrival(leg, vehiclePositionsByRoute.get(leg.route.id) ?? [])
}

const examples: { from: string; to: string }[] = [
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

// ---- Patokan transit (reverse geocoding) -------------------------------------

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

// ---- Komponen ----------------------------------------------------------------

function RouteCodeChip({ code, color, className }: { code: string; color: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-grid h-7 min-w-9 place-items-center rounded-md px-2 text-xs font-extrabold text-white',
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {code}
    </span>
  )
}

interface TimelineStep {
  key: string
  icon: ReactNode
  tone: string
  title: string
  detail: ReactNode
}

function ItineraryTimeline({
  itinerary,
  fromName,
  toName,
  landmarks,
}: {
  itinerary: Itinerary
  fromName: string
  toName: string
  landmarks: Record<string, string | null>
}) {
  const steps: TimelineStep[] = []
  const firstLeg = itinerary.legs[0]
  const eta = nextArrival(itinerary)

  steps.push({
    key: 'walk-start',
    icon: <Footprints size={15} />,
    tone: 'bg-leaf text-brand-strong',
    title: `Jalan kaki ke titik naik di ${shortStreet(firstLeg.boardStreet)}`,
    detail: `Dari ${fromName} · ${formatDistance(itinerary.accessWalk.meters)} · ± ${itinerary.accessWalk.minutes} menit`,
  })

  itinerary.legs.forEach((leg, index) => {
    steps.push({
      key: `leg-${index}`,
      icon: <BusFront size={15} />,
      tone: 'text-white',
      title: `Naik Angkot ${leg.route.code} di ${shortStreet(leg.boardStreet)}`,
      detail: (
        <>
          Jurusan <span className="font-semibold text-ink-strong">{leg.route.name}</span>
          <br />
          Turun di {shortStreet(leg.alightStreet)} · {leg.rideKm.toFixed(1)} km · ± {leg.rideMinutes}{' '}
          menit
          {index === 0 && eta !== null ? (
            <span className="mt-1 flex items-center gap-1 font-semibold text-brand">
              <span className="size-1.5 rounded-full bg-brand" /> Angkot terdekat ± {eta} menit lagi
            </span>
          ) : null}
        </>
      ),
    })

    const transfer = itinerary.transfers[index]
    if (transfer) {
      const next = itinerary.legs[index + 1]
      const landmark = landmarks[landmarkKey(transfer.at)]
      steps.push({
        key: `transfer-${index}`,
        icon: <ArrowDownUp size={16} />,
        tone: 'bg-sky-600 text-white shadow-xs',
        title: `Transit & Ganti Angkot di ${shortStreet(transfer.fromStreet)}`,
        detail: (
          <div className="mt-1 flex flex-col gap-2 rounded-lg border border-sky-200/90 bg-sky-50/80 p-3 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200">
                <ArrowDownUp size={14} className="text-sky-600 dark:text-sky-400" />
                Ganti Angkot: {leg.route.code} ➔ {next.route.code}
              </span>
              <Badge variant="sky" className="text-[10px]">
                Transit ke-{index + 1}
              </Badge>
            </div>
            <div className="flex flex-col gap-1 text-[11px] leading-relaxed">
              <p>
                <span className="font-semibold text-ink-strong">1. Turun:</span> Turun dari Angkot{' '}
                <span className="font-bold text-ink-strong">{leg.route.code}</span> di{' '}
                <span className="font-semibold">{shortStreet(transfer.fromStreet)}</span>.
              </p>
              <p>
                <span className="font-semibold text-ink-strong">2. Berpindah:</span>{' '}
                {transferWalkText(transfer)}.
              </p>
              <p>
                <span className="font-semibold text-ink-strong">3. Naik:</span> Naik Angkot{' '}
                <span
                  className="inline-block rounded px-1.5 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: next.route.color }}
                >
                  {next.route.code}
                </span>{' '}
                jurusan <span className="font-semibold text-ink-strong">{next.route.name}</span>.
              </p>
            </div>
            {landmark ? (
              <div className="flex items-center gap-1.5 rounded bg-sky-100/70 px-2 py-1 text-[11px] font-medium text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                <Landmark size={13} className="shrink-0 text-sky-600 dark:text-sky-400" />
                <span>Patokan Transit: Dekat {landmark}</span>
              </div>
            ) : null}
            <p className="text-[10px] text-sky-800/80 dark:text-sky-300/80">
              💡 Pastikan menunggu di sisi jalan yang mengarah ke tujuan Anda.
            </p>
          </div>
        ),
      })
    }
  })

  steps.push({
    key: 'walk-end',
    icon: <Footprints size={15} />,
    tone: 'bg-leaf text-brand-strong',
    title: `Jalan kaki ke tujuan`,
    detail: `${formatDistance(itinerary.egressWalk.meters)} · ± ${itinerary.egressWalk.minutes} menit`,
  })
  steps.push({
    key: 'arrive',
    icon: <MapPin size={15} />,
    tone: 'bg-peach text-amber-900',
    title: `Tiba di ${toName}`,
    detail: `Total perjalanan ± ${itinerary.totalMinutes} menit`,
  })

  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const legIndex = step.key.startsWith('leg-') ? Number(step.key.slice(4)) : -1
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn('grid size-8 shrink-0 place-items-center rounded-md', step.tone)}
                style={
                  legIndex >= 0 ? { backgroundColor: itinerary.legs[legIndex].route.color } : undefined
                }
              >
                {step.icon}
              </span>
              {index < steps.length - 1 ? <span className="my-1 w-px flex-1 bg-line" /> : null}
            </div>
            <div className={index < steps.length - 1 ? 'pb-4' : ''}>
              <p className="text-xs font-bold text-ink-strong">{step.title}</p>
              <div className="text-[11px] leading-relaxed text-ink">{step.detail}</div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function ItineraryCard({
  itinerary,
  fastest,
  active,
  landmarks,
  onSelect,
}: {
  itinerary: Itinerary
  fastest: boolean
  active: boolean
  landmarks: Record<string, string | null>
  onSelect: () => void
}) {
  const firstLeg = itinerary.legs[0]
  const lastLeg = itinerary.legs[itinerary.legs.length - 1]
  const eta = nextArrival(itinerary)

  return (
    <Card
      className={cn(
        'transition-colors',
        active ? 'border-brand ring-2 ring-brand/15' : 'hover:border-brand/40',
      )}
    >
      <CardContent className="flex flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {itinerary.legs.map((leg, index) => (
                <span key={`${leg.route.id}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 ? <ChevronRight size={14} className="text-ink-soft" /> : null}
                  <RouteCodeChip code={leg.route.code} color={leg.route.color} />
                </span>
              ))}
              <span className="ml-1 flex flex-wrap gap-1.5">
                {fastest ? <Badge variant="leaf">Tercepat</Badge> : null}
                <Badge variant={itinerary.transfers.length === 0 ? 'outline' : 'sky'}>
                  {itinerary.transfers.length === 0 ? (
                    <RouteIcon size={12} />
                  ) : (
                    <Repeat2 size={12} />
                  )}
                  {transitLabel(itinerary)}
                </Badge>
              </span>
            </div>
            <p className="text-xs text-ink">
              Naik <span className="font-semibold text-ink-strong">{firstLeg.route.code}</span> di{' '}
              {shortStreet(firstLeg.boardStreet)} → turun di {shortStreet(lastLeg.alightStreet)}
            </p>
          </div>
          <div className="rounded-md bg-leaf px-3 py-2 text-center">
            <p className="text-xl leading-none font-extrabold text-brand-strong">
              {itinerary.totalMinutes}
            </p>
            <p className="text-[10px] text-brand-strong/70">menit</p>
          </div>
        </div>

        {itinerary.transfers.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-xs dark:border-sky-900/60 dark:bg-sky-950/30">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200">
                <ArrowDownUp size={14} className="text-sky-600 dark:text-sky-400" />
                Titik Pergantian Angkot ({itinerary.transfers.length}x transit)
              </span>
              <span className="text-[11px] font-semibold text-sky-800 dark:text-sky-300">
                {itinerary.legs.map((l) => l.route.code).join(' ➔ ')}
              </span>
            </div>
            {itinerary.transfers.map((transfer, index) => {
              const fromLeg = itinerary.legs[index]
              const toLeg = itinerary.legs[index + 1]
              const landmark = landmarks[landmarkKey(transfer.at)]
              return (
                <div
                  key={`card-transfer-${index}`}
                  className="flex flex-col gap-1 border-t border-sky-200/60 pt-2 text-ink dark:border-sky-900/40"
                >
                  <p className="font-semibold text-ink-strong">
                    Transit di {shortStreet(transfer.fromStreet)}
                    {landmark ? (
                      <span className="font-normal text-sky-700 dark:text-sky-300">
                        {' '}(Dekat {landmark})
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] leading-relaxed text-ink">
                    Turun dari <span className="font-semibold">{fromLeg.route.code}</span>,{' '}
                    {transferWalkText(transfer)}, lalu naik{' '}
                    <span className="font-semibold text-brand">Angkot {toLeg.route.code}</span> (jurusan {toLeg.route.name}).
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md bg-leaf/40 px-3 py-2 text-xs text-leaf-ink">
            <RouteIcon size={14} className="shrink-0 text-brand" />
            <span>
              <span className="font-semibold">Rute langsung:</span> Tidak perlu ganti angkot. Cukup
              naik Angkot {firstLeg.route.code} dari {shortStreet(firstLeg.boardStreet)} sampai dekat tujuan.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line-soft pt-3 text-[11px] text-ink">
          <span className="flex items-center gap-1.5">
            <Footprints size={13} className="text-brand" />
            {itinerary.walkMinutes} menit jalan kaki
          </span>
          <span className="flex items-center gap-1.5">
            <BusFront size={13} className="text-brand" />
            {itinerary.rideKm.toFixed(1)} km naik angkot
          </span>
          {eta !== null ? (
            <span className="flex items-center gap-1.5">
              <Clock3 size={13} className="text-brand" />
              Angkot {firstLeg.route.code} ± {eta} menit lagi
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={active ? 'primary' : 'outline'} onClick={onSelect} aria-pressed={active}>
            <Navigation size={14} />
            {active ? 'Sedang ditampilkan' : 'Lihat langkah & peta'}
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to={`/peta?route=${firstLeg.route.id}`}>
              <MapPin size={14} />
              Trayek {firstLeg.route.code} di peta live
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyResult({ plan }: { plan: TripPlan }) {
  let title = 'Belum ada kombinasi angkot yang cocok'
  let message = 'Kami mencari hingga 2 kali transit. Coba geser titik asal atau tujuan ke jalan besar terdekat.'
  if (plan.noRouteNearOrigin) {
    title = 'Tidak ada trayek angkot di dekat titik asal'
    message = 'Belum ada angkot yang melintas dalam radius ±800 m dari titik asal. Coba pilih lokasi lain yang lebih dekat ke jalan besar.'
  } else if (plan.noRouteNearDestination) {
    title = 'Tidak ada trayek angkot di dekat tujuan'
    message = 'Belum ada angkot yang melintas dalam radius ±800 m dari tujuan. Coba pilih patokan lain di sekitar tujuan.'
  }
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
        <AlertCircle size={26} className="text-ink-soft" />
        <p className="text-sm font-semibold text-ink-strong">{title}</p>
        <p className="max-w-md text-xs text-ink">{message}</p>
      </CardContent>
    </Card>
  )
}

// ---- Halaman -------------------------------------------------------------------

interface SearchResult {
  from: Place
  to: Place
  plan: TripPlan
}

export function SearchRoutePage() {
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState<{ field: 'from' | 'to' | null; message: string } | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterKind, setFilterKind] = useState<'all' | 'direct' | 'transit'>('all')
  const [locating, setLocating] = useState(false)
  const searchToken = useRef(0)

  const landmarks = useTransferLandmarks(result?.plan)

  const plan = result?.plan
  const itineraries = useMemo(() => plan?.itineraries ?? [], [plan])
  const directCount = useMemo(
    () => itineraries.filter((itinerary) => itinerary.transfers.length === 0).length,
    [itineraries],
  )
  const transitCount = useMemo(
    () => itineraries.filter((itinerary) => itinerary.transfers.length > 0).length,
    [itineraries],
  )

  const filteredItineraries = useMemo(() => {
    if (filterKind === 'direct') {
      return itineraries.filter((itinerary) => itinerary.transfers.length === 0)
    }
    if (filterKind === 'transit') {
      return itineraries.filter((itinerary) => itinerary.transfers.length > 0)
    }
    return itineraries
  }, [itineraries, filterKind])

  const selected = useMemo(() => {
    if (!result) return null
    if (selectedId) {
      const match = filteredItineraries.find((itinerary) => itinerary.id === selectedId)
      if (match) return match
    }
    return filteredItineraries[0] ?? itineraries[0] ?? null
  }, [result, selectedId, filteredItineraries, itineraries])

  async function runSearch(
    fromValue: string,
    fromChosen: Place | null,
    toValue: string,
    toChosen: Place | null,
  ) {
    if (!fromValue.trim() && !fromChosen) {
      setError({ field: 'from', message: 'Isi titik asal terlebih dahulu.' })
      setStatus('error')
      return
    }
    if (!toValue.trim() && !toChosen) {
      setError({ field: 'to', message: 'Isi lokasi tujuan terlebih dahulu.' })
      setStatus('error')
      return
    }

    const token = ++searchToken.current
    setStatus('loading')
    setError(null)

    const [origin, destination] = await Promise.all([
      fromChosen ?? resolvePlace(fromValue),
      toChosen ?? resolvePlace(toValue),
    ])
    if (token !== searchToken.current) return

    if (!origin || !destination) {
      setError({
        field: !origin ? 'from' : 'to',
        message: `Lokasi "${!origin ? fromValue : toValue}" tidak ditemukan. Coba nama jalan, kelurahan, atau tempat terkenal di Bandung.`,
      })
      setStatus('error')
      return
    }

    // Beri kesempatan UI menampilkan status memuat sebelum perhitungan rute.
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    const plan = planTrip(routes, origin.position, destination.position)
    if (token !== searchToken.current) return

    setFromPlace(origin)
    setToPlace(destination)
    setFromText(origin.name)
    setToText(destination.name)
    setResult({ from: origin, to: destination, plan })
    setSelectedId(plan.itineraries[0]?.id ?? null)
    setFilterKind('all')
    setStatus('done')
    setSearchParams(
      {
        from: origin.name,
        fl: latLngParam(origin.position),
        to: destination.name,
        tl: latLngParam(destination.position),
      },
      { replace: true },
    )
  }

  // Jalankan pencarian otomatis bila halaman dibuka dengan parameter asal & tujuan.
  const initialSearchDone = useRef(false)
  useEffect(() => {
    if (initialSearchDone.current) return
    initialSearchDone.current = true
    if (fromText.trim() && toText.trim()) {
      void runSearch(fromText, fromPlace, toText, toPlace)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSwap() {
    setFromText(toText)
    setToText(fromText)
    setFromPlace(toPlace)
    setToPlace(fromPlace)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runSearch(fromText, fromPlace, toText, toPlace)
  }

  function handleUseLocation() {
    if (!('geolocation' in navigator)) {
      toast.error('Perangkat tidak mendukung deteksi lokasi.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        const place = placeFromCoordinates('Lokasi saya', [
          position.coords.latitude,
          position.coords.longitude,
        ])
        setFromPlace(place)
        setFromText(place.name)
      },
      () => {
        setLocating(false)
        toast.error('Lokasi tidak dapat diakses. Izinkan akses lokasi atau ketik titik asal.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function handleExample(example: { from: string; to: string }) {
    const origin = findLandmark(example.from)
    const destination = findLandmark(example.to)
    setFromText(example.from)
    setToText(example.to)
    setFromPlace(origin)
    setToPlace(destination)
    void runSearch(example.from, origin, example.to, destination)
  }

  return (
    <div className="container-page py-8 md:py-10">
      <div className="max-w-2xl">
        <Badge variant="leaf" className="gap-1.5">
          <Sparkles size={13} />
          Rekomendasi jurusan
        </Badge>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-strong md:text-4xl">
          Cari rute menuju tujuan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          Ketik lokasi asal dan tempat tujuan Anda. Kami carikan kombinasi angkot yang cocok,
          lengkap dengan lokasi naik, turun, dan tempat transit untuk ganti angkot.
        </p>
      </div>

      <Card className="relative z-10 mt-6 max-w-4xl">
        <CardContent className="p-4 md:p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="route-from" className="text-xs font-semibold text-ink-strong">
                  Titik asal
                </label>
                <PlaceInput
                  id="route-from"
                  value={fromText}
                  onValueChange={(value) => {
                    setFromText(value)
                    setFromPlace(null)
                  }}
                  onSelect={(place) => {
                    setFromPlace(place)
                    setFromText(place.name)
                  }}
                  invalid={error?.field === 'from'}
                  icon={<MapPin size={16} />}
                  placeholder="Contoh: Sarijadi"
                  trailing={
                    <button
                      type="button"
                      onClick={handleUseLocation}
                      className="grid size-8 place-items-center rounded-md text-brand hover:bg-muted-strong"
                      aria-label="Gunakan lokasi saya"
                      title="Gunakan lokasi saya"
                    >
                      {locating ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Crosshair size={15} />
                      )}
                    </button>
                  }
                />
              </div>

              <Button
                type="button"
                variant="soft"
                size="icon"
                className="mx-auto mb-0.5"
                aria-label="Tukar asal dan tujuan"
                onClick={handleSwap}
              >
                <ArrowDownUp size={16} />
              </Button>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="route-to" className="text-xs font-semibold text-ink-strong">
                  Tujuan
                </label>
                <PlaceInput
                  id="route-to"
                  value={toText}
                  onValueChange={(value) => {
                    setToText(value)
                    setToPlace(null)
                  }}
                  onSelect={(place) => {
                    setToPlace(place)
                    setToText(place.name)
                  }}
                  invalid={error?.field === 'to'}
                  icon={<Navigation size={16} />}
                  placeholder="Contoh: Botanica Bandung"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="md:w-auto" disabled={status === 'loading'}>
              {status === 'loading' ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              Cari Rute
            </Button>
          </form>

          {error ? (
            <p role="alert" className="mt-3 flex items-center gap-1.5 text-xs font-medium text-danger">
              <AlertCircle size={14} />
              {error.message}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink">
            <span>Coba:</span>
            {examples.map((example) => (
              <button
                key={`${example.from}-${example.to}`}
                type="button"
                onClick={() => handleExample(example)}
                className="rounded-full border border-line bg-surface px-2.5 py-1 font-medium text-ink-strong transition-colors hover:border-brand hover:text-brand"
              >
                {example.from} → {example.to}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {status === 'loading' && !result ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-ink">
          <Loader2 size={16} className="animate-spin text-brand" />
          Mencari kombinasi angkot terbaik…
        </div>
      ) : null}

      {status === 'idle' && !result ? (
        <Card className="mt-8 max-w-4xl">
          <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
            {[
              {
                icon: <Search size={16} />,
                title: 'Ketik asal & tujuan',
                text: 'Bisa nama tempat, jalan, kelurahan, atau gunakan lokasi Anda saat ini.',
              },
              {
                icon: <BusFront size={16} />,
                title: 'Pilih kombinasi angkot',
                text: 'Rute langsung maupun dengan transit, diurutkan dari yang tercepat.',
              },
              {
                icon: <ArrowDownUp size={16} />,
                title: 'Ikuti titik transit',
                text: 'Kami tunjukkan di jalan mana harus turun dan ganti angkot.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-leaf text-brand-strong">
                  {item.icon}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-strong">{item.title}</p>
                  <p className="text-xs text-ink">{item.text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {result && plan ? (
        <div
          className={cn(
            'mt-8 grid gap-6 lg:grid-cols-[1fr_380px]',
            status === 'loading' && 'opacity-60 transition-opacity',
          )}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-ink-strong">
                  {itineraries.length > 0
                    ? `${itineraries.length} pilihan rute ditemukan`
                    : 'Rute tidak ditemukan'}
                </h2>
                <p className="text-xs text-ink">
                  {result.from.name} → {result.to.name} · jarak lurus{' '}
                  {plan.straightKm.toFixed(1)} km · diurutkan dari yang tercepat
                </p>
              </div>
              {itineraries.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {directCount > 0 ? (
                    <Badge variant="leaf" className="gap-1">
                      <RouteIcon size={12} />
                      {directCount} Langsung
                    </Badge>
                  ) : null}
                  {transitCount > 0 ? (
                    <Badge variant="sky" className="gap-1">
                      <Repeat2 size={12} />
                      {transitCount} Perlu Transit
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>

            {itineraries.length > 0 && directCount > 0 && transitCount > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line-soft bg-surface p-1.5 text-xs">
                <span className="px-2 font-semibold text-ink-strong">Filter:</span>
                <button
                  type="button"
                  onClick={() => setFilterKind('all')}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-1 font-semibold transition-colors',
                    filterKind === 'all'
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-ink hover:bg-muted hover:text-ink-strong',
                  )}
                >
                  Semua ({itineraries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKind('direct')}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-1 font-semibold transition-colors',
                    filterKind === 'direct'
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-ink hover:bg-muted hover:text-ink-strong',
                  )}
                >
                  Langsung Saja ({directCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterKind('transit')}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-1 font-semibold transition-colors',
                    filterKind === 'transit'
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-ink hover:bg-muted hover:text-ink-strong',
                  )}
                >
                  Dengan Transit ({transitCount})
                </button>
              </div>
            ) : null}

            {plan.walkOnly ? (
              <div className="flex items-start gap-2 rounded-md border border-line-soft bg-leaf px-4 py-3 text-xs text-leaf-ink">
                <Footprints size={15} className="mt-0.5 shrink-0" />
                <span>
                  Tujuan cukup dekat — jalan kaki sekitar{' '}
                  <span className="font-bold">{formatDistance(plan.walkOnly.meters)}</span> (±{' '}
                  {plan.walkOnly.minutes} menit) mungkin lebih cepat daripada naik angkot.
                </span>
              </div>
            ) : null}

            {filteredItineraries.map((itinerary) => (
              <ItineraryCard
                key={itinerary.id}
                itinerary={itinerary}
                fastest={itineraries[0]?.id === itinerary.id}
                active={selected?.id === itinerary.id}
                landmarks={landmarks}
                onSelect={() => setSelectedId(itinerary.id)}
              />
            ))}

            {filteredItineraries.length === 0 && itineraries.length > 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-6 text-center text-xs text-ink">
                  <p className="font-semibold text-ink-strong">Tidak ada rute untuk filter ini</p>
                  <Button size="sm" variant="outline" onClick={() => setFilterKind('all')}>
                    Tampilkan Semua Pilihan
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {itineraries.length === 0 && !plan.walkOnly ? <EmptyResult plan={plan} /> : null}

            <p className="text-[11px] leading-relaxed text-ink-soft">
              Estimasi waktu sudah termasuk jalan kaki, menunggu angkot (± 5 menit) dan waktu
              transit. Angkot di Bandung dapat diberhentikan di sepanjang trayek, jadi lokasi naik
              & turun ditunjukkan berdasarkan nama jalan.
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
            {selected ? (
              <Card className="overflow-hidden">
                <ItineraryMap
                  itinerary={selected}
                  origin={result.from.position}
                  destination={result.to.position}
                  className="h-64 w-full"
                />
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-ink-strong">Langkah perjalanan</h3>
                      <p className="text-xs text-ink">
                        {selected.legs.map((leg) => leg.route.code).join(' → ')} ·{' '}
                        {transitLabel(selected)} · ± {selected.totalMinutes} menit
                      </p>
                    </div>
                  </div>
                  <ItineraryTimeline
                    itinerary={selected}
                    fromName={result.from.name}
                    toName={result.to.name}
                    landmarks={landmarks}
                  />
                </CardContent>
              </Card>
            ) : null}

            <Card className="bg-brand-strong text-white">
              <CardContent className="p-5">
                <p className="text-eyebrow text-brand-soft">Tips perjalanan</p>
                <p className="mt-2 text-sm leading-relaxed text-white/90">
                  Perhatikan nomor dan jurusan yang tertulis di kaca depan angkot. Saat transit,
                  pastikan menunggu di sisi jalan yang searah dengan tujuan Anda.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-transparent bg-white text-brand-strong hover:bg-muted"
                  asChild
                >
                  <Link to="/peta">
                    Buka peta live
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
