import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { ReportStatusBadge } from '@/components/ui/badge'
import { useAuthStore } from '@/features/auth/auth-store'
import { useRoutes } from '@/features/routes/use-routes'
import type { PublicStatistics } from '@/features/public/use-statistics'
import { api } from '@/lib/api'
import type { ReportStatus } from '@/types'
interface Dashboard extends PublicStatistics {
  pendingDrivers: number
  queue: { id: string; name: string; routeId: string; submittedAt: string }[]
  latestReports: {
    id: string
    code: string
    subject: string
    plate_number: string | null
    status: ReportStatus
  }[]
}
export function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user),
    { routes } = useRoutes(true)
  const { data, error, isPending } = useQuery({
    queryKey: ['admin-dashboard', user?.id],
    queryFn: () => api<Dashboard>('/admin/dashboard'),
    enabled: user?.role === 'admin',
    refetchInterval: 5000,
  })
  const ranked = routes
    .map((r) => ({ ...r, active: data?.activeByDirection[r.id] ?? 0 }))
    .sort((a, b) => b.active - a.active || a.code.localeCompare(b.code))
    .slice(0, 8)
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Dashboard Analitik</h1>
      <p className="text-sm">
        Ringkasan armada, antrean verifikasi dan laporan masyarakat.
      </p>
      {isPending && <p role="status">Memuat dashboard…</p>}
      {error && <p role="alert">{error.message}</p>}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Total angkot', data.totalVehicles],
              ['Angkot aktif', data.activeVehicles],
              ['Menunggu verifikasi', data.pendingDrivers],
              ['Laporan belum diproses', data.received],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <p className="text-sm">{label}</p>
                  <p className="mt-2 text-3xl font-extrabold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="space-y-3 p-5">
                <h2 className="font-bold">Angkot aktif per arah</h2>
                {data.activeVehicles === 0 && (
                  <p className="text-sm">
                    Belum ada kendaraan dengan GPS aktif.
                  </p>
                )}
                {ranked.map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between gap-2 text-sm"
                  >
                    <span>
                      {r.code} · {r.name}
                    </span>
                    <strong>{r.active}</strong>
                  </div>
                ))}
                <Link
                  className="block text-sm text-brand"
                  to="/admin/monitoring"
                >
                  Buka monitoring →
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-5">
                <h2 className="font-bold">
                  Antrean verifikasi ({data.pendingDrivers})
                </h2>
                {data.queue.length === 0 && (
                  <p>Tidak ada pengajuan menunggu.</p>
                )}
                {data.queue.map((d) => (
                  <Link
                    key={d.id}
                    to={`/admin/pengemudi/${d.id}`}
                    className="block border-b border-line-soft py-2 text-sm"
                  >
                    <strong>{d.name}</strong>
                    <p>
                      {routes.find((r) => r.id === d.routeId)?.name ??
                        'Trayek tidak tersedia'}
                    </p>
                    <p className="text-ink-soft">
                      {new Date(d.submittedAt).toLocaleString('id-ID')}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="font-bold">Laporan terbaru</h2>
              {data.latestReports.length === 0 && <p>Belum ada laporan.</p>}
              {data.latestReports.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft py-2 text-sm"
                >
                  <Link className="text-brand" to={`/admin/laporan/${r.id}`}>
                    {r.code} · {r.subject}
                  </Link>
                  <span>{r.plate_number ?? '—'}</span>
                  <ReportStatusBadge status={r.status} />
                </div>
              ))}
              <p className="text-sm">
                Diterima {data.received} · Diproses {data.processing} · Selesai{' '}
                {data.resolved}
              </p>
            </CardContent>
          </Card>
          <p className="text-sm">
            {data.routes} arah aktif · {data.routeCodes} kode jurusan · Status
            GPS: jalan {data.vehicleStatuses.jalan ?? 0}, merayap{' '}
            {data.vehicleStatuses.merayap ?? 0}, ngetem{' '}
            {data.vehicleStatuses.ngetem ?? 0}, offline{' '}
            {data.vehicleStatuses.offline ?? 0}.
          </p>
        </>
      )}
    </div>
  )
}
