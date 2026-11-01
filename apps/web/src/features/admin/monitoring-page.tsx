import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  BusFront,
  Crosshair,
  Gauge,
  History,
  LocateFixed,
  MessageSquare,
  Search,
  Signal,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge, VehicleStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLiveVehicles } from '@/features/tracking/use-live-vehicles'
import { routes, vehicles } from '@/mocks/data'
import { cn } from '@/lib/cn'
import { distanceKm } from '@/lib/geo'
import type { Vehicle } from '@/types'

const center: [number, number] = [-6.9039, 107.618]

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
        <span style="background:${color};color:#fff;border-radius:9999px;padding:4px 8px;font-size:10px;font-weight:700;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.22);white-space:nowrap;border:2px solid ${selected ? '#fff' : 'transparent'}">
          ${vehicle.plate.replace('D ', '')}
        </span>
        <span style="width:2px;height:6px;background:${color}"></span>
        <span style="width:7px;height:7px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(255,255,255,.6)"></span>
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
    map.flyTo(positionRef.current, Math.max(map.getZoom(), 14), { duration: 0.6 })
  }, [focusKey, map])

  return null
}

export function MonitoringPage() {
  const [selectedId, setSelectedId] = useState(vehicles[0]?.id ?? '')
  const [routeFilter, setRouteFilter] = useState('semua')
  const [statusFilter, setStatusFilter] = useState<'semua' | Vehicle['status']>('semua')
  const [query, setQuery] = useState('')
  const [radiusKm, setRadiusKm] = useState(5)

  const liveVehicles = useLiveVehicles(vehicles)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return liveVehicles.filter((vehicle) => {
      const matchesRoute = routeFilter === 'semua' || vehicle.routeId === routeFilter
      const matchesStatus = statusFilter === 'semua' || vehicle.status === statusFilter
      const matchesQuery =
        !term ||
        vehicle.plate.toLowerCase().includes(term) ||
        vehicle.driverName.toLowerCase().includes(term) ||
        vehicle.routeName.toLowerCase().includes(term)
      const matchesRadius = distanceKm(center, vehicle.position) <= radiusKm
      return matchesRoute && matchesStatus && matchesQuery && matchesRadius
    })
  }, [liveVehicles, query, radiusKm, routeFilter, statusFilter])

  const selected = liveVehicles.find((vehicle) => vehicle.id === selectedId) ?? liveVehicles[0]

  const counts = {
    jalan: liveVehicles.filter((item) => item.status === 'jalan').length,
    ngetem: liveVehicles.filter((item) => item.status === 'ngetem').length,
    merayap: liveVehicles.filter((item) => item.status === 'merayap').length,
    offline: liveVehicles.filter((item) => item.status === 'offline').length,
  }

  return (
    <div className="grid gap-3 xl:h-[calc(100svh-8rem)] xl:grid-cols-[320px_minmax(0,1fr)_340px]">
      <aside className="order-2 flex flex-col gap-3 overflow-y-auto rounded-lg border border-line-soft bg-surface p-3 shadow-soft xl:order-1">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
            <Crosshair size={15} className="text-brand" />
            Filter pemantauan
          </h1>
          <Badge variant="leaf">{liveVehicles.length} unit</Badge>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-ink">Jurusan trayek aktif</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setRouteFilter('semua')}
              className={cn(
                'rounded-md px-2 py-1.5 text-[10px] font-bold transition',
                routeFilter === 'semua'
                  ? 'bg-brand text-white'
                  : 'bg-muted text-ink hover:bg-muted-strong',
              )}
            >
              Semua
            </button>
            {routes.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => setRouteFilter(route.id)}
                className={cn(
                  'rounded-md px-2 py-1.5 text-[10px] font-bold transition',
                  routeFilter === route.id
                    ? 'bg-brand text-white'
                    : 'bg-muted text-ink hover:bg-muted-strong',
                )}
              >
                {route.code} · {route.origin.slice(0, 4).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-ink">Status operasional</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {[
              { key: 'jalan', label: 'Jalan', tone: 'bg-leaf text-brand-strong', value: counts.jalan },
              { key: 'ngetem', label: 'Ngetem', tone: 'bg-sky text-sky-ink', value: counts.ngetem },
              { key: 'merayap', label: 'Merayap', tone: 'bg-peach text-amber-900', value: counts.merayap },
              { key: 'offline', label: 'Offline', tone: 'bg-muted text-ink', value: counts.offline },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    statusFilter === item.key ? 'semua' : (item.key as Vehicle['status']),
                  )
                }
                className={cn(
                  'flex items-center justify-between rounded-md px-2.5 py-2 text-[10px] font-semibold transition',
                  item.tone,
                  statusFilter === item.key ? 'ring-2 ring-brand-strong ring-offset-1' : '',
                )}
              >
                {item.label}
                <span className="font-extrabold">{item.value}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-ink">Radius pantauan</p>
            <span className="text-[10px] font-bold text-brand-strong">
              {radiusKm.toFixed(1).replace('.', ',')} km
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5}
            step={0.5}
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
            className="mt-2 w-full accent-[#004425]"
            aria-label="Radius pantauan"
          />
          <div className="flex justify-between text-[9px] text-ink-soft">
            <span>0,5 km</span>
            <span>5,0 km</span>
          </div>
        </div>

        <Input
          icon={<Search size={14} />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari plat atau nama driver..."
          aria-label="Cari armada"
          className="h-9"
        />

        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-ink">
            Hasil pencarian ({filtered.length})
          </p>
          <span className="text-[9px] text-ink-soft">Urut: kecepatan</span>
        </div>

        <div className="flex flex-col gap-1.5">
          {filtered.slice(0, 12).map((vehicle) => (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => setSelectedId(vehicle.id)}
              className={cn(
                'flex items-center gap-2 rounded-md border p-2 text-left transition',
                selected?.id === vehicle.id
                  ? 'border-brand bg-leaf/50'
                  : 'border-line-soft hover:border-brand/40',
              )}
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-md text-[10px] font-extrabold text-white"
                style={{ backgroundColor: statusColor[vehicle.status] }}
              >
                <BusFront size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold text-ink-strong">
                  {vehicle.plate}
                </span>
                <span className="block truncate text-[9px] text-ink">
                  {vehicle.driverName} · {vehicle.routeCode}
                </span>
              </span>
              <span className="flex flex-col items-end">
                <VehicleStatusBadge status={vehicle.status} />
                <span className="text-[9px] font-semibold text-ink">
                  {vehicle.speedKph} km/j
                </span>
              </span>
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-[10px] text-ink">Tidak ada armada cocok.</p>
          ) : null}
        </div>
      </aside>

      <div className="relative order-1 h-[52svh] min-h-[320px] overflow-hidden rounded-lg border border-line-soft shadow-soft xl:order-2 xl:h-full">
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
                weight: 3,
                opacity: routeFilter === 'semua' || routeFilter === route.id ? 0.65 : 0.12,
              }}
            />
          ))}
          {filtered.map((vehicle) => (
            <Marker
              key={vehicle.id}
              position={vehicle.position}
              icon={markerIcon(vehicle, vehicle.id === selected?.id)}
              eventHandlers={{ click: () => setSelectedId(vehicle.id) }}
            />
          ))}
          <MapController position={selected?.position ?? null} focusKey={selectedId} />
        </MapContainer>

        <div className="pointer-events-none absolute inset-x-3 top-3 z-[400] flex items-center justify-between">
          <Badge className="pointer-events-auto bg-surface/95 text-ink shadow-soft backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-brand" />
            Simulasi GPS — update tiap 3 detik · {liveVehicles.length} unit
          </Badge>
          <div className="pointer-events-auto flex gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="size-9 bg-surface/95 backdrop-blur"
              aria-label="Pusatkan peta"
              onClick={() => toast('Peta dipusatkan', { description: 'Koridor Bandung Utara' })}
            >
              <LocateFixed size={15} />
            </Button>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[400] flex items-center justify-between rounded-md border border-line-soft bg-surface/90 px-3 py-2 shadow-float backdrop-blur">
          <span className="text-[10px] text-ink">
            Kecepatan rata-rata koridor:{' '}
            <strong className="text-ink-strong">24,6 km/jam</strong>
          </span>
          <span className="hidden text-[10px] text-ink-soft sm:block">Bandung Utara</span>
        </div>
      </div>

      <aside className="order-3 flex flex-col gap-3 overflow-y-auto rounded-lg border border-line-soft bg-surface p-3 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold tracking-wider text-ink-soft uppercase">
              Telemetri unit
            </p>
            <h2 className="text-sm font-bold text-ink-strong">Detail armada terpilih</h2>
          </div>
          <Badge variant="leaf">Live</Badge>
        </div>

        {selected ? (
          <>
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center gap-2">
                <span className="grid size-12 place-items-center rounded-md bg-gradient-to-br from-brand to-lime-400 text-white">
                  <BusFront size={24} />
                </span>
                <div>
                  <p className="text-base font-extrabold text-ink-strong">{selected.plate}</p>
                  <p className="text-[10px] text-ink">{selected.driverName}</p>
                  <p className="text-[9px] text-ink-soft">
                    Trayek {selected.routeCode} · {selected.routeName}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-md border border-line-soft p-2.5">
                <p className="text-[9px] text-ink-soft">Status operasi</p>
                <div className="mt-1">
                  <VehicleStatusBadge status={selected.status} />
                </div>
              </div>
              <div className="rounded-md border border-line-soft p-2.5">
                <p className="text-[9px] text-ink-soft">Kecepatan terkini</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm font-extrabold text-ink-strong">
                  <Gauge size={12} className="text-brand" />
                  {selected.speedKph} km/j
                </p>
              </div>
            </div>

            <div className="rounded-md border border-brand/20 bg-leaf/50 p-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-brand-strong">
                <Signal size={12} />
                Sinyal GPS optimal
              </p>
              <p className="mt-0.5 text-[9px] text-ink">
                Update terakhir: 2 detik lalu · Akurasi ±3 meter
              </p>
            </div>

            <div className="rounded-md border border-line-soft p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-ink">Permintaan penumpang</p>
                <Badge variant="sky">Potensi tinggi</Badge>
              </div>
              <p className="mt-2 flex items-center gap-2 text-[11px] font-bold text-ink-strong">
                <Users size={16} className="text-brand" />
                3 calon penumpang terdeteksi
              </p>
              <p className="text-[9px] text-ink">Menunggu di halte sekitar radius 300 m.</p>
            </div>

            <div className="rounded-md border border-line-soft p-2.5">
              <div className="flex items-center justify-between text-[9px]">
                <span className="font-semibold text-ink">Progres trayek aktif</span>
                <span className="font-bold text-brand-strong">Rit ke-4 · 65%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[65%] rounded-full bg-brand" />
              </div>
              <div className="mt-1.5 flex justify-between text-[8px] text-ink-soft">
                <span>Stasiun Hall</span>
                <span>Jl. Merdeka</span>
                <span>Dago</span>
              </div>
            </div>

            <div className="rounded-md border border-line-soft p-2.5">
              <p className="text-[9px] font-semibold text-ink">Identifikasi teknis</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[9px]">
                <div>
                  <p className="text-ink-soft">Merk / model</p>
                  <p className="font-semibold text-ink-strong">Suzuki Carry 2021</p>
                </div>
                <div>
                  <p className="text-ink-soft">Kapasitas</p>
                  <p className="font-semibold text-ink-strong">12 penumpang</p>
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-1.5">
              <Button size="sm" asChild>
                <Link to="/admin/pesan">
                  <MessageSquare size={13} />
                  Kirim pesan ke pengemudi
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Riwayat perjalanan dibuka')}
              >
                <History size={13} />
                Lihat riwayat perjalanan
              </Button>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-xs text-ink">
            Pilih armada dari peta untuk melihat detail.
          </p>
        )}
      </aside>
    </div>
  )
}
