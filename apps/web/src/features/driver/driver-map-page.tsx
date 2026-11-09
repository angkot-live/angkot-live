import { BusFront, MapPin, Radio } from 'lucide-react'
import { useState } from 'react'
import { MapContainer, Polyline, TileLayer } from 'react-leaflet'
import { Link } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { routes } from '@/mocks/data'

export function DriverMapPage() {
  const [routeId, setRouteId] = useState(routes[0]?.id ?? '')
  const route = routes.find((item) => item.id === routeId)
  const points = route?.polyline ?? []
  const center: [number, number] = points[Math.floor(points.length / 2)] ?? [-6.9039, 107.618]

  return (
    <div className="container-page py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Mode pengemudi</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-strong">Peta kerja</h1>
        </div>
        <Badge variant="neutral" className="gap-1.5"><Radio size={13} />GPS belum terhubung</Badge>
      </div>
      <Card className="mt-5">
        <CardContent className="space-y-3 p-4">
          <p role="status" className="text-sm text-ink">Belum ada sumber lokasi pengemudi yang terhubung. Kendaraan akan tampil setelah menerima posisi GPS.</p>
          <label className="block max-w-xl space-y-1 text-xs font-semibold">
            <span>Pratinjau trayek</span>
            <select className="h-10 w-full rounded-md border border-line bg-surface px-2" value={routeId} onChange={(event) => setRouteId(event.target.value)}>
              {routes.map((item) => <option key={item.id} value={item.id}>{item.code} | {item.name}</option>)}
            </select>
          </label>
          <Button size="sm" variant="outline" asChild><Link to="/peta"><MapPin size={14} />Buka peta publik</Link></Button>
        </CardContent>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <MapContainer key={routeId} center={center} zoom={13} className="h-[420px] w-full">
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {(route?.segments ?? [points]).map((segment, index) => <Polyline key={index} positions={segment} pathOptions={{ color: route?.color ?? '#004425', weight: 4 }} />)}
          </MapContainer>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold"><BusFront size={16} />Status pengemudi</h2>
            <p className="text-xs text-ink">Belum ada kendaraan aktif. Pengiriman GPS dan perubahan status belum dihubungkan.</p>
            <div className="grid grid-cols-2 gap-2">
              {['Narik', 'Ngetem', 'Istirahat', 'Offline'].map((label) => <Button key={label} size="sm" variant="outline" disabled>{label}</Button>)}
            </div>
            <h2 className="border-t border-line-soft pt-3 text-sm font-bold">Penumpang menunggu</h2>
            <p className="text-xs text-ink">Daftar penumpang tersedia setelah kendaraan dan posisi pengemudi aktif.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
