import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ArrowLeft,
  BusFront,
  CheckCircle2,
  GripVertical,
  MapPin,
  Plus,
  Route,
  Save,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { routes } from '@/mocks/data'
import { cn } from '@/lib/cn'

const stopNames = [
  'Terminal Stasiun Hall',
  'Simpang Dago',
  'Halte Jl. Merdeka',
  'Halte Cihampelas',
  'Terminal Dago',
  'Halte Dipatiukur',
  'Halte Ir. H. Juanda',
  'Halte Pasar Simpang',
  'Halte Sukajadi',
  'Terminal Ledeng',
]

function stopIcon(index: number) {
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:9999px;background:#004425;color:#fff;font-size:10px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)">
        ${index + 1}
      </div>
    `,
  })
}

export function RouteEditorPage() {
  const { id } = useParams()
  const route = routes.find((item) => item.id === id)
  const [stops, setStops] = useState(
    route?.polyline.map((_, index) => ({
      id: `stop-${index}`,
      name: stopNames[index % stopNames.length],
      distance: `${(index * 1.4).toFixed(1)} km`,
    })) ?? [],
  )
  const [status, setStatus] = useState<'aktif' | 'insidental' | 'nonaktif'>('aktif')

  if (!route) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Route size={30} className="text-ink-soft" />
        <h1 className="text-xl font-bold text-ink-strong">Trayek tidak ditemukan</h1>
        <Button asChild>
          <Link to="/admin/trayek">
            <ArrowLeft size={15} />
            Kembali ke daftar trayek
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/trayek"
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-muted"
        >
          <ArrowLeft size={14} />
          Kembali ke daftar trayek
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="peach">Mode edit</Badge>
          <Button
            size="sm"
            onClick={() => toast.success('Perubahan trayek disimpan', { description: `${route.code} · ${route.name}` })}
          >
            <Save size={14} />
            Simpan perubahan
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] text-ink-soft">Manajemen trayek / editor jalur</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong">
          Editor trayek {route.code}
        </h1>
        <p className="mt-1 text-sm text-ink">
          Atur jalur, titik halte, dan status operasional trayek {route.name}.
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                <Route size={15} className="text-brand" />
                Informasi trayek
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <div>
                    <label htmlFor="route-code" className="text-[10px] font-semibold text-ink">
                      Kode
                    </label>
                    <Input id="route-code" defaultValue={route.code} className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="route-name" className="text-[10px] font-semibold text-ink">
                      Nama trayek
                    </label>
                    <Input id="route-name" defaultValue={route.name} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="route-origin" className="text-[10px] font-semibold text-ink">
                      Titik awal
                    </label>
                    <Input id="route-origin" defaultValue={route.origin} className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="route-destination" className="text-[10px] font-semibold text-ink">
                      Titik akhir
                    </label>
                    <Input id="route-destination" defaultValue={route.destination} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="route-color" className="text-[10px] font-semibold text-ink">
                      Warna jalur
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="size-9 rounded-md border border-line" style={{ backgroundColor: route.color }} />
                      <Input id="route-color" defaultValue={route.color} className="font-mono" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="route-status" className="text-[10px] font-semibold text-ink">
                      Status operasional
                    </label>
                    <select
                      id="route-status"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as typeof status)}
                      className="mt-1 h-11 w-full rounded-md border border-line bg-surface px-3 text-xs font-semibold text-ink-strong outline-none focus:border-brand"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="insidental">Insidental</option>
                      <option value="nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                  <BusFront size={15} className="text-brand" />
                  Ringkasan
                </h2>
                <Badge variant="leaf">{stops.length} halte</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-md bg-muted p-2">
                  <p className="text-[9px] text-ink-soft">Panjang jalur</p>
                  <p className="text-sm font-extrabold text-ink-strong">12,4 km</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-[9px] text-ink-soft">Estimasi tempuh</p>
                  <p className="text-sm font-extrabold text-ink-strong">38 menit</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-[9px] text-ink-soft">Armada aktif</p>
                  <p className="text-sm font-extrabold text-ink-strong">24 unit</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-[9px] text-ink-soft">Halte resmi</p>
                  <p className="text-sm font-extrabold text-ink-strong">{stops.length} titik</p>
                </div>
              </div>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-brand-strong">
                <CheckCircle2 size={11} />
                Jalur terhubung dengan 4 trayek lain
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line-soft p-3">
              <div>
                <p className="text-xs font-bold text-ink-strong">Pratinjau jalur</p>
                <p className="text-[10px] text-ink">Klik peta untuk menambah titik halte baru.</p>
              </div>
              <Badge variant="sky">OpenStreetMap</Badge>
            </div>
            <div className="h-[360px] w-full">
              <MapContainer
                bounds={route.polyline}
                boundsOptions={{ padding: [24, 24] }}
                zoomControl={false}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline
                  positions={route.polyline}
                  pathOptions={{ color: route.color, weight: 5, opacity: 0.85 }}
                />
                {route.polyline.map((position, index) => (
                  <Marker key={`${route.id}-${index}`} position={position} icon={stopIcon(index)} />
                ))}
              </MapContainer>
            </div>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-ink-strong">Urutan halte</h2>
                  <p className="text-[10px] text-ink">
                    Seret untuk mengubah urutan. Perubahan langsung terlihat di peta.
                  </p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="soft">
                      <Plus size={13} />
                      Tambah halte
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah halte baru</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label htmlFor="stop-name" className="text-[11px] font-semibold text-ink">
                          Nama halte
                        </label>
                        <Input id="stop-name" placeholder="Contoh: Halte Simpang Dago" className="mt-1" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="stop-lat" className="text-[11px] font-semibold text-ink">
                            Latitude
                          </label>
                          <Input id="stop-lat" placeholder="-6.8854" className="mt-1" />
                        </div>
                        <div>
                          <label htmlFor="stop-lng" className="text-[11px] font-semibold text-ink">
                            Longitude
                          </label>
                          <Input id="stop-lng" placeholder="107.6182" className="mt-1" />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          setStops((current) => [
                            ...current,
                            {
                              id: `stop-new-${current.length}`,
                              name: `Halte baru ${current.length + 1}`,
                              distance: `${(current.length * 1.4).toFixed(1)} km`,
                            },
                          ])
                          toast.success('Halte ditambahkan')
                        }}
                      >
                        Tambah halte
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="mt-3 flex flex-col gap-1.5">
                {stops.map((stop, index) => (
                  <div
                    key={stop.id}
                    className="flex items-center gap-2 rounded-md border border-line-soft p-2"
                  >
                    <GripVertical size={14} className="text-ink-soft" />
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-ink-strong">{stop.name}</p>
                      <p className="text-[9px] text-ink-soft">
                        {stop.distance} dari titik awal
                      </p>
                    </div>
                    <Badge variant={index === 0 || index === stops.length - 1 ? 'leaf' : 'neutral'}>
                      {index === 0 ? 'Awal' : index === stops.length - 1 ? 'Akhir' : 'Transit'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-danger"
                      aria-label={`Hapus ${stop.name}`}
                      onClick={() => {
                        setStops((current) => current.filter((item) => item.id !== stop.id))
                        toast.success('Halte dihapus dari daftar')
                      }}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-md bg-leaf/50 p-2.5 text-[10px] text-ink">
                <MapPin size={13} className="text-brand" />
                Titik halte ditampilkan sebagai penanda bernomor pada peta.
                <span className={cn('ml-auto font-semibold', status === 'aktif' ? 'text-brand-strong' : 'text-warning')}>
                  {status === 'aktif' ? 'Beroperasi normal' : 'Perlu peninjauan'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
