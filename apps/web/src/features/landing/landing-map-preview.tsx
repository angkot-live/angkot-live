import { Link } from 'react-router-dom'
import { useRoutes } from '@/features/routes/use-routes'
import { useLiveStore } from '@/features/tracking/live-store'
import { STALE_GPS_MS } from '@/features/tracking/tracking-state'

export function LandingMapPreview() {
  const { routes, isPending, error, refetch } = useRoutes()
  const { vehicles, connection, serverTime } = useLiveStore()
  const fresh = connection === 'connected' ? vehicles.filter((v) => !v.stale && v.lastSeenAt && serverTime - v.lastSeenAt <= STALE_GPS_MS) : []
  const simulated = fresh.filter((v) => v.telemetrySource === 'simulation').length
  const bounds = routes.flatMap((r) => (r.segments ?? [r.polyline]).flat()).reduce(
    (b, p) => [Math.min(b[0], p[0]), Math.max(b[1], p[0]), Math.min(b[2], p[1]), Math.max(b[3], p[1])],
    [Infinity, -Infinity, Infinity, -Infinity],
  )
  const project = (p: [number, number]) => [20 + ((p[1] - bounds[2]) / Math.max(.001, bounds[3] - bounds[2])) * 528, 20 + ((bounds[1] - p[0]) / Math.max(.001, bounds[1] - bounds[0])) * 376]
  return <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-float">
    <div className="flex items-center justify-between border-b border-line-soft p-5 text-sm"><span className="font-bold">Jaringan trayek Bandung</span><span className="text-xs text-ink">Pratinjau layanan</span></div>
    {isPending ? <p role="status" className="p-8">Memuat katalog trayek…</p> : !routes.length && error ? <div role="alert" className="space-y-3 p-8"><p>Katalog trayek belum dapat dimuat.</p><button className="font-bold text-brand underline" onClick={() => void refetch()}>Muat ulang trayek</button></div> : !routes.length ? <p className="p-8">Belum ada trayek aktif dalam katalog.</p> : <>
      {error && <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-3 text-xs text-ink"><span>Katalog mungkin tidak terbaru; peta memakai data terakhir yang tersedia.</span><button className="font-bold text-brand underline" onClick={() => void refetch()}>Muat ulang trayek</button></div>}
      <svg viewBox="0 0 568 416" role="img" aria-label="Geometri katalog trayek; hijau GPS perangkat, jingga simulasi" className="w-full bg-muted">
        {routes.flatMap((r) => (r.segments ?? [r.polyline]).map((line, i) => <polyline key={`${r.id}-${i}`} points={line.map((p) => project(p).join(',')).join(' ')} fill="none" stroke={r.color} strokeWidth="2" opacity=".65" />))}
        {fresh.map((v) => <circle key={v.id} cx={project(v.position)[0]} cy={project(v.position)[1]} r="6" stroke="white" strokeWidth="2" fill={v.telemetrySource === 'simulation' ? '#b45309' : '#004425'} />)}
      </svg>
    </>}
    <div className="space-y-2 p-5 text-sm"><p role="status" className="font-semibold">{fresh.length - simulated} GPS perangkat · {simulated} SIMULASI</p><p className="text-xs leading-relaxed text-ink">{connection !== 'connected' ? 'Realtime sedang menyambungkan ulang. Posisi aktif belum dapat dikonfirmasi.' : !fresh.length ? 'Belum ada posisi segar. Pengemudi perlu Narik dan mengirim lokasi valid.' : 'Hijau: GPS perangkat. Jingga: simulasi pengujian. Hanya sampel segar ditampilkan.'}</p><Link to="/peta" className="inline-flex min-h-11 items-center font-bold text-brand">Buka peta lengkap →</Link></div>
  </div>
}
