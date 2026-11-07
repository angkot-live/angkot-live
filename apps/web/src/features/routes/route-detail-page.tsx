import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft, ArrowRight, BusFront, Clock3, MapPin, Navigation, Search } from 'lucide-react'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import { Link, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { routes, vehicles } from '@/mocks/data'
import type { RouteInfo } from '@/types'

function endpointIcon(label: string, color: string) {
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <span style="background:${color};color:#fff;border-radius:9999px;width:26px;height:26px;display:grid;place-items:center;font-size:11px;font-weight:800;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid #fff">${label}</span>
        <span style="width:2px;height:8px;background:${color}"></span>
        <span style="width:7px;height:7px;border-radius:9999px;background:${color};box-shadow:0 0 0 3px rgba(255,255,255,.7)"></span>
      </div>
    `,
  })
}

function RouteMap({ route }: { route: RouteInfo }) {
  const { polyline, color, segments, endstops } = route
  const center = polyline[Math.floor(polyline.length / 2)] ?? polyline[0]
  const first = endstops?.[0]?.position ?? polyline[0]
  const last = endstops?.[endstops.length - 1]?.position ?? polyline[polyline.length - 1]
  const lines = segments ?? [polyline]

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full min-h-[320px] w-full"
      attributionControl={false}
    >
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {lines.map((line, index) => (
        <Polyline
          key={index}
          positions={line}
          pathOptions={{ color, weight: 5, opacity: 0.9 }}
        />
      ))}
      {first ? <Marker position={first} icon={endpointIcon('A', color)} /> : null}
      {last ? <Marker position={last} icon={endpointIcon('B', color)} /> : null}
    </MapContainer>
  )
}

export function RouteDetailPage() {
  const { id } = useParams()
  const route = routes.find((item) => item.id === id)

  if (!route) {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <MapPin size={30} className="text-ink-soft" />
        <h1 className="text-xl font-bold text-ink-strong">Trayek tidak ditemukan</h1>
        <p className="text-sm text-ink">Trayek mungkin sudah tidak aktif atau kode salah.</p>
        <Button asChild>
          <Link to="/trayek">
            <ArrowLeft size={15} />
            Kembali ke daftar trayek
          </Link>
        </Button>
      </div>
    )
  }

  const activeVehicles = vehicles.filter((vehicle) => vehicle.routeId === route.id)
  const lastIndex = route.polyline.length - 1
  const stopIndexes = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(lastIndex * ratio))
  const endstops = route.endstops ?? []
  const stops =
    endstops.length > 0
      ? endstops.map((stop, index) => ({
          name: stop.name,
          position: stop.position,
          minutes: Math.round((index / Math.max(endstops.length - 1, 1)) * 16),
        }))
      : stopIndexes.map((index, position) => ({
          name: `Titik ${position + 1}`,
          position: route.polyline[index] ?? route.polyline[0],
          minutes: Math.round(position * 4),
        }))

  return (
    <div className="container-page py-6 md:py-10">
      <Link
        to="/trayek"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-brand-strong"
      >
        <ArrowLeft size={14} />
        Daftar trayek
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-md text-lg font-extrabold text-white"
            style={{ backgroundColor: route.color }}
          >
            {route.code}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
                {route.name}
              </h1>
              <Badge variant="leaf">
                <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                Aktif
              </Badge>
            </div>
            <p className="mt-1 text-sm text-ink">
              {route.origin} → {route.destination} · {activeVehicles.length} angkot beroperasi
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to="/rute">
            <Search size={15} />
            Cari rute ke sini
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="h-[340px] md:h-[440px]">
            <RouteMap route={route} />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line-soft px-4 py-3 text-[11px] text-ink">
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-brand" />
              {stops.length} titik akhir
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 size={13} className="text-brand" />
              ±16 menit perjalanan
            </span>
            <span className="flex items-center gap-1.5">
              <BusFront size={13} className="text-brand" />
              {activeVehicles.length} angkot aktif
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: route.color }} />
              Warna jalur trayek
            </span>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4 md:p-5">
              <h2 className="text-sm font-bold text-ink-strong">Titik akhir trayek</h2>
              <p className="mb-4 text-xs text-ink">Urutan perjalanan dari asal ke tujuan</p>
              <ol className="flex flex-col">
                {stops.map((stop, index) => (
                  <li key={`${stop.name}-${index}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold ${
                          index === 0 || index === stops.length - 1
                            ? 'border-transparent text-white'
                            : 'border-line bg-surface text-ink'
                        }`}
                        style={
                          index === 0 || index === stops.length - 1
                            ? { backgroundColor: route.color }
                            : undefined
                        }
                      >
                        {index + 1}
                      </span>
                      {index < stops.length - 1 ? (
                        <span className="my-1 w-px flex-1 bg-line" />
                      ) : null}
                    </div>
                    <div className={index < stops.length - 1 ? 'pb-4' : ''}>
                      <p className="text-xs font-bold text-ink-strong">{stop.name}</p>
                      <p className="text-[11px] text-ink">
                        {index === 0 ? 'Terminal asal' : `${stop.minutes} menit dari asal`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {route.streets && route.streets.length > 0 ? (
            <Card>
              <CardContent className="p-4 md:p-5">
                <h2 className="text-sm font-bold text-ink-strong">Jalan yang dilalui</h2>
                <p className="mb-3 text-xs text-ink">{route.streets.length} ruas jalan</p>
                <div className="flex flex-wrap gap-1.5">
                  {route.streets.map((street) => (
                    <Badge key={street} variant="neutral">
                      {street}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="bg-leaf">
            <CardContent className="p-4 md:p-5">
              <p className="text-eyebrow text-brand-strong">Rute ini melewati</p>
              <p className="mt-1 text-sm font-semibold text-brand-strong">
                {route.origin} sampai {route.destination}
              </p>
              <p className="mt-1 text-xs text-brand-strong/70">
                Tarif reguler Rp 5.000 · bayar tunai atau QRIS
              </p>
              <Button size="sm" className="mt-3" asChild>
                <Link to={`/peta?route=${route.id}`}>
                  <Navigation size={14} />
                  Lihat angkot live
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
