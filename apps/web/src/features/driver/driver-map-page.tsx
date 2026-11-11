import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DriverModeBadge } from '@/components/ui/badge'
import { useAuthStore } from '@/features/auth/auth-store'
import {
  dutySession,
  sendLive,
  useLiveStore,
  type Duty,
} from '@/features/tracking/live-store'
import { api, post, errorMessage } from '@/lib/api'
import { useRoutes } from '@/features/routes/use-routes'
import { DriverSimulatorControls } from '@/features/tracking/driver-simulator-controls'
import { useSimulatorStore } from '@/features/tracking/simulator-store'
import { DriverTrackingStatus } from '@/features/tracking/driver-tracking-status'
import type { DriverMode } from '@/types'
import type { Onboarding } from './driver-onboarding-page'
const vehicleIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;background:#004425;color:white;border:2px solid white;border-radius:50%;width:30px;height:30px;text-align:center;line-height:26px">🚐</span>',
  iconSize: [30, 30],
})
const passengerIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;background:#e8a943;border:2px solid white;border-radius:50%;width:22px;height:22px;text-align:center">●</span>',
  iconSize: [22, 22],
})
export function DriverMapPage() {
  const { routes } = useRoutes()
  const user = useAuthStore((s) => s.user),
    duty = useLiveStore((s) => s.duty),
    nearby = useLiveStore((s) => s.nearby),
    connection = useLiveStore((s) => s.connection),
    serverTime = useLiveStore((s) => s.serverTime),
    error = useLiveStore((s) => s.error)
  const [busy, setBusy] = useState(false)
  const assignment = useQuery({
    queryKey: ['assignment', user?.id],
    queryFn: () => api<Onboarding>('/driver/assignment'),
    refetchInterval: 5000,
  })
  const route = routes.find((r) => r.id === assignment.data?.routeId),
    own = duty.vehicle
  const ownVisible =
    connection === 'connected' &&
    ['narik', 'ngetem'].includes(duty.mode) &&
    !!own?.lastSeenAt &&
    serverTime - own.lastSeenAt <= 30000
  const center =
    (ownVisible ? own?.position : null) ??
    route?.polyline[0] ??
    ([-6.9039, 107.618] as [number, number])
  const otherSession =
    ['narik', 'ngetem'].includes(duty.mode) && duty.session !== dutySession
  async function mode(value: DriverMode) {
    setBusy(true)
    try {
      if (value === 'narik' && !['narik', 'ngetem'].includes(duty.mode))
        useSimulatorStore.setState({ paused: false, ended: false })
      const result = await post<Duty>('/driver/duty', {
        mode: value,
        session: dutySession,
        telemetrySource: ['offline', 'istirahat'].includes(value)
          ? (duty.vehicle?.telemetrySource ??
            useSimulatorStore.getState().source)
          : useSimulatorStore.getState().source,
      })
      useLiveStore.setState({ duty: result })
      toast.success(
        value === 'narik'
          ? useSimulatorStore.getState().source === 'simulation'
            ? 'Simulasi pengujian dimulai.'
            : 'Tugas dimulai. Menunggu GPS valid.'
          : `Status ${value} tersimpan.`,
      )
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  async function respond(id: string) {
    setBusy(true)
    try {
      await post('/driver/requests/respond', { id, key: `respond-${id}` })
      toast.success('Penumpang diberi tahu.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="container-page py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Mode pengemudi</p>
          <h1 className="text-2xl font-extrabold">Peta kerja</h1>
          <p className="mt-1 text-sm text-ink">
            {route ? `${route.code} · ${route.name}` : 'Memuat trayek tugas…'} ·{' '}
            {assignment.data?.vehicle?.plate}
          </p>
        </div>
        <DriverModeBadge mode={duty.mode} />
      </div>
      <Card className="mt-4">
        <CardContent className="space-y-3 p-4">
          <DriverTrackingStatus />
          {(error || assignment.error) && (
            <p role="alert" className="text-sm text-danger">
              {error ?? errorMessage(assignment.error)}
            </p>
          )}
          {otherSession && (
            <p role="alert" className="text-sm">
              Kendaraan sedang bertugas di tab/perangkat lain. Pilih Offline
              untuk mengakhiri sesi itu sebelum mulai di sini.
            </p>
          )}
          <DriverSimulatorControls route={route} busy={busy} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['narik', 'ngetem', 'istirahat', 'offline'] as const).map((m) => (
              <Button
                key={m}
                variant={duty.mode === m ? 'primary' : 'outline'}
                disabled={
                  busy ||
                  !assignment.data?.vehicleId ||
                  (connection !== 'connected' &&
                    m !== 'offline' &&
                    m !== 'istirahat') ||
                  (otherSession && m !== 'offline')
                }
                onClick={() => {
                  void mode(m)
                }}
              >
                {m[0].toUpperCase() + m.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-ink">
            GPS dibagikan selama narik atau ngetem. Izinkan lokasi, gunakan
            HTTPS, dan biarkan halaman terlihat saat bertugas.
          </p>
        </CardContent>
      </Card>
      {duty.prompt && duty.session === dutySession && (
        <Card className="mt-4 border-brand">
          <CardContent className="space-y-3 p-4">
            <h2 className="font-bold">Apakah Anda sedang ngetem?</h2>
            <p className="text-sm">
              Kendaraan diam selama 90 detik. Tanpa jawaban sampai{' '}
              {new Date(duty.prompt.deadline).toLocaleTimeString('id-ID')},
              status menjadi ngetem.
            </p>
            <div className="flex gap-2">
              {[true, false].map((yes) => (
                <Button
                  key={String(yes)}
                  variant={yes ? 'primary' : 'outline'}
                  onClick={() => {
                    if (
                      !sendLive({
                        type: 'ngetem:answer',
                        session: dutySession,
                        promptId: duty.prompt?.id,
                        yes,
                      })
                    )
                      toast.error('Koneksi terputus.')
                  }}
                >
                  {yes ? 'Ya, ngetem' : 'Tidak'}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <MapContainer
            key={route?.id ?? 'pending'}
            center={center}
            zoom={14}
            className="h-[460px] w-full"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {(route?.segments ?? [route?.polyline ?? []]).map((line, i) => (
              <Polyline
                key={i}
                positions={line}
                pathOptions={{ color: route?.color ?? '#004425', weight: 4 }}
              />
            ))}
            <FollowVehicle position={ownVisible && own ? own.position : null} />
            {ownVisible && own ? (
              <Marker position={own.position} icon={vehicleIcon}>
                <Tooltip>
                  {serverTime - (own.lastSeenAt ?? 0) > 15000
                    ? 'GPS tertunda'
                    : 'Kendaraan Anda'}
                </Tooltip>
              </Marker>
            ) : null}
            {nearby.map((r) => (
              <Marker key={r.id} position={r.pickup} icon={passengerIcon}>
                <Tooltip>Penumpang menunggu</Tooltip>
              </Marker>
            ))}
          </MapContainer>
        </Card>
        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="font-bold">Penumpang menunggu ({nearby.length})</h2>
            {nearby.length === 0 && (
              <p className="text-sm text-ink">
                Belum ada penumpang menunggu dalam area trayek Anda.
              </p>
            )}
            {nearby.map((r) => (
              <div key={r.id} className="space-y-2 border-b border-line pb-3">
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-ink">
                  Tujuan: {r.destination || 'Belum ditentukan'}
                </p>
                <p className="text-xs">
                  {r.status === 'accepted'
                    ? 'Anda sudah merespons'
                    : 'Sedang menunggu angkot'}
                </p>
                {r.status === 'searching' && (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      void respond(r.id)
                    }}
                  >
                    Saya melihat penumpang
                  </Button>
                )}
              </div>
            ))}
            <p className="text-xs text-ink">
              Megat menandai keberadaan penumpang. Respons tidak memesan
              kendaraan atau kursi.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FollowVehicle({ position }: { position: [number, number] | null }) {
  const map = useMap()
  const lat = position?.[0],
    lng = position?.[1]
  useEffect(() => {
    if (lat !== undefined && lng !== undefined)
      map.panTo([lat, lng], { animate: true })
  }, [map, lat, lng])
  return null
}
