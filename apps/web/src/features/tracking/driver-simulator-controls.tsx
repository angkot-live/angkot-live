import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { RouteInfo } from '@/types'
import { useLiveStore } from './live-store'
import { useSimulatorStore } from './simulator-store'
import { Button } from '@/components/ui/button'

export function DriverSimulatorControls({
  route,
  busy,
}: {
  route?: RouteInfo
  busy: boolean
}) {
  const config = useQuery({
    queryKey: ['tracking-config'],
    queryFn: () => api<{ simulationEnabled: boolean }>('/tracking/config'),
    staleTime: 60000,
  })
  const settings = useSimulatorStore(),
    duty = useLiveStore((s) => s.duty)
  if (!config.data?.simulationEnabled) return null
  const active = ['narik', 'ngetem'].includes(duty.mode)
  const chains = route?.segments?.length
    ? route.segments
    : [route?.polyline ?? []]
  return (
    <div className="space-y-3 rounded-md border border-warning/40 bg-warning/5 p-3">
      <label className="block text-sm font-semibold">
        Sumber posisi pengemudi
        <select
          aria-label="Sumber posisi pengemudi"
          className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-2"
          disabled={active || busy}
          value={settings.source}
          onChange={(e) =>
            useSimulatorStore.setState({
              source: e.target.value as 'gps' | 'simulation',
              paused: false,
              ended: false,
            })
          }
        >
          <option value="gps">GPS perangkat</option>
          <option value="simulation">Simulasi pengujian lokal</option>
        </select>
      </label>
      {settings.source === 'simulation' && (
        <>
          <p className="text-xs text-warning" role="note">
            SIMULASI PENGUJIAN: posisi mengikuti trayek, bukan lokasi ponsel.
            Label simulasi terlihat oleh penumpang/publik. Pilih Narik untuk
            mulai; Offline untuk mengganti sumber atau titik mulai.
          </p>
          {chains.length > 1 && (
            <label className="block text-xs">
              Segmen simulasi
              <select
                aria-label="Segmen simulasi"
                className="ml-2 rounded border border-line bg-surface p-1"
                disabled={active}
                value={settings.chain}
                onChange={(e) =>
                  useSimulatorStore.setState({ chain: Number(e.target.value) })
                }
              >
                {chains.map((_, i) => (
                  <option key={i} value={i}>
                    Segmen {i + 1}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs">
            Titik mulai: {settings.startPercent}%
            <input
              aria-label="Titik mulai simulasi"
              className="mt-1 w-full"
              type="range"
              min="0"
              max="95"
              step="5"
              disabled={active}
              value={settings.startPercent}
              onChange={(e) =>
                useSimulatorStore.setState({
                  startPercent: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="block text-xs">
            Kecepatan simulasi: {settings.speedKph} km/jam
            <input
              aria-label="Kecepatan simulasi"
              className="mt-1 w-full"
              type="range"
              min="0"
              max="40"
              step="5"
              value={settings.speedKph}
              onChange={(e) =>
                useSimulatorStore.setState({ speedKph: Number(e.target.value) })
              }
            />
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={!active}
            onClick={() =>
              useSimulatorStore.setState({ paused: !settings.paused })
            }
          >
            {settings.paused
              ? 'Lanjutkan simulasi'
              : 'Jeda simulasi (uji GPS terputus)'}
          </Button>
          {settings.ended && (
            <p className="text-xs">
              Ujung segmen tercapai. Pilih Offline untuk mengatur titik mulai
              baru.
            </p>
          )}
        </>
      )}
    </div>
  )
}
