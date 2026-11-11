import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Polyline, TileLayer, CircleMarker } from 'react-leaflet'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLiveStore, type ServerTrip } from '@/features/tracking/live-store'
import { post, errorMessage } from '@/lib/api'
import { useRoutes } from '@/features/routes/use-routes'
import { pickupEta } from '@/features/tracking/eta'
export function ActiveTripPage() {
  const { routes } = useRoutes(true)
  const trip = useLiveStore((s) => s.trip),
    vehicles = useLiveStore((s) => s.vehicles),
    connection = useLiveStore((s) => s.connection)
  const [busy, setBusy] = useState(false),
    [completed, setCompleted] = useState<ServerTrip | null>(null)
  const route = routes.find((r) => r.id === (trip ?? completed)?.route_id),
    vehicle = vehicles.find((v) => v.id === trip?.vehicle_id)
  const eta = vehicle
    ? pickupEta(vehicle, trip?.destination_point ?? null, route)
    : null
  async function complete() {
    if (!trip) return
    setBusy(true)
    try {
      const result = await post<ServerTrip>('/passenger/trips/complete', {
        id: trip.id,
        key: `complete-${trip.id}`,
      })
      setCompleted(result)
      useLiveStore.setState({ trip: null })
      toast.success('Perjalanan selesai.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  if (completed)
    return (
      <div className="container-page max-w-xl space-y-4 py-8">
        <h1 className="text-2xl font-bold">Perjalanan selesai</h1>
        <p>
          {route?.code} · {route?.name}
        </p>
        {completed.telemetry_source === 'simulation' && (
          <p className="text-sm text-warning">Perjalanan simulasi pengujian</p>
        )}
        <p>Jarak tercatat {completed.distance_km.toFixed(2)} km</p>
        <p className="text-sm text-ink">
          Terima kasih sudah menggunakan angkot.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link to={`/penumpang/lapor?vehicle=${completed.vehicle_id}`}>
              Laporkan masalah
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/penumpang/riwayat">Lihat riwayat</Link>
          </Button>
        </div>
      </div>
    )
  if (!trip)
    return (
      <div className="container-page space-y-4 py-10">
        <h1 className="text-xl font-bold">
          {connection === 'connected'
            ? 'Belum ada perjalanan aktif'
            : 'Memulihkan perjalanan…'}
        </h1>
        <p className="text-sm text-ink">
          Perjalanan tercatat setelah Anda mengonfirmasi naik angkot.
        </p>
        <Button asChild>
          <Link to="/penumpang">Kembali ke peta</Link>
        </Button>
      </div>
    )
  return (
    <div className="container-page space-y-4 py-6">
      <h1 className="text-2xl font-extrabold">Perjalanan aktif</h1>
      <Card>
        <CardContent className="space-y-3 p-4">
          <h2 className="font-bold">
            {route?.code} · {route?.name}
          </h2>
          <p>Tujuan: {trip.destination_name}</p>
          {trip.telemetry_source === 'simulation' && (
            <p className="text-sm text-warning">
              Perjalanan simulasi pengujian
            </p>
          )}
          <p className="text-sm">
            {eta === null
              ? 'Estimasi tiba belum tersedia'
              : `Estimasi tiba di titik turun: ${eta} menit`}
          </p>
          <p className="text-sm">
            {vehicle
              ? `${vehicle.plate} · ${vehicle.driverName}`
              : 'GPS kendaraan terputus. Perjalanan Anda tetap tercatat.'}
          </p>
          <p className="text-sm text-ink">
            Naik pada {new Date(trip.started_at).toLocaleString('id-ID')}
          </p>
          <Button
            disabled={busy}
            onClick={() => {
              void complete()
            }}
          >
            {busy ? 'Menyimpan…' : 'Saya sudah turun — selesai'}
          </Button>
        </CardContent>
      </Card>
      <MapContainer
        center={vehicle?.position ?? route?.polyline[0] ?? [-6.9039, 107.618]}
        zoom={14}
        className="h-[400px] rounded-xl"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {(route?.segments ?? [route?.polyline ?? []]).map((line, i) => (
          <Polyline key={i} positions={line} />
        ))}
        {trip.destination_point && (
          <CircleMarker
            center={trip.destination_point}
            radius={7}
            pathOptions={{ color: '#c96a27' }}
          />
        )}
        {vehicle && (
          <CircleMarker center={vehicle.position} radius={9}>
            <span>Kendaraan Anda</span>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  )
}
