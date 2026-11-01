import { Activity, BusFront, CheckCircle2, FileWarning, Route, TrendingUp } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useReportStore } from '@/features/reports/report-store'
import { publicStats, routes, vehicles } from '@/mocks/data'
import { Link } from 'react-router-dom'

export function StatisticsPage() {
  const reports = useReportStore((state) => state.reports)
  const routeStats = routes
    .map((route) => ({
      route,
      count: vehicles.filter(
        (vehicle) => vehicle.routeId === route.id && vehicle.driverVerified !== false,
      ).length,
    }))
    .sort((a, b) => b.count - a.count)
  const maxCount = Math.max(...routeStats.map((item) => item.count), 1)
  const totalReports = reports.length
  const reportSummary = [
    {
      status: 'Diterima',
      value: reports.filter((report) => report.status === 'diterima').length,
      color: 'bg-warning',
    },
    {
      status: 'Diproses',
      value: reports.filter((report) => report.status === 'diproses').length,
      color: 'bg-info',
    },
    {
      status: 'Selesai',
      value: reports.filter((report) => report.status === 'selesai').length,
      color: 'bg-brand',
    },
  ]
  const followUpRate = totalReports
    ? Math.round(
        (reports.filter((report) => report.status !== 'diterima').length / totalReports) * 100,
      )
    : 0

  const metrics = [
    {
      label: 'Angkot aktif',
      value: publicStats.activeVehicles.toLocaleString('id-ID'),
      detail: 'terpantau hari ini',
      icon: BusFront,
    },
    {
      label: 'Trayek beroperasi',
      value: publicStats.routes.toString(),
      detail: 'jurusan aktif',
      icon: Route,
    },
    {
      label: 'Laporan bulan ini',
      value: totalReports.toString(),
      detail: 'dari penumpang',
      icon: FileWarning,
    },
    {
      label: 'Tindak lanjut',
      value: `${followUpRate}%`,
      detail: 'laporan diproses',
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="container-page py-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <Badge variant="leaf" className="gap-1.5">
            <TrendingUp size={13} />
            Transparansi publik
          </Badge>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-strong md:text-4xl">
            Statistik layanan angkot
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink">
            Data agregat armada, trayek, dan aduan warga. Diperbarui berkala oleh petugas Dishub.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 self-start">
          <Activity size={12} className="text-brand" />
          Data demo · 01 Nov 2026
        </Badge>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-ink">{metric.label}</p>
                <span className="grid size-8 place-items-center rounded-md bg-leaf text-brand-strong">
                  <metric.icon size={16} />
                </span>
              </div>
              <p className="mt-3 text-3xl leading-none font-extrabold tracking-tight text-ink-strong">
                {metric.value}
              </p>
              <p className="mt-1 text-[11px] text-ink">{metric.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-ink-strong">Armada per trayek</h2>
                <p className="text-xs text-ink">Sampel monitoring armada yang sedang beroperasi</p>
              </div>
              <Badge variant="neutral">14 unit</Badge>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {routeStats.map(({ route, count }) => (
                <div key={route.id}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-ink-strong">
                      <span
                        className="grid size-5 place-items-center rounded text-[9px] font-extrabold text-white"
                        style={{ backgroundColor: route.color }}
                      >
                        {route.code}
                      </span>
                      {route.name}
                    </span>
                    <span className="text-ink">{count} unit</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max((count / maxCount) * 100, 8)}%`,
                        backgroundColor: route.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4 md:p-5">
              <h2 className="text-sm font-bold text-ink-strong">Status aduan</h2>
              <p className="text-xs text-ink">{totalReports} laporan sampel bulan ini</p>
              <div className="mt-4 flex flex-col gap-3">
                {reportSummary.map((item) => (
                  <div key={item.status} className="flex items-center gap-3">
                    <span className={`size-2.5 rounded-full ${item.color}`} />
                    <span className="flex-1 text-xs text-ink">{item.status}</span>
                    <span className="text-sm font-bold text-ink-strong">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
                {reportSummary.map((item) => (
                  <span
                    key={item.status}
                    className={item.color}
                    style={{ width: `${(item.value / Math.max(totalReports, 1)) * 100}%` }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-brand-strong text-white">
            <CardContent className="p-5">
              <p className="text-eyebrow text-brand-soft">Partisipasi warga</p>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                Temukan angkot ugal-ugalan atau fasilitas rusak? Laporkan langsung dari aplikasi.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-transparent bg-white text-brand-strong hover:bg-muted"
                asChild
              >
                <Link to="/login">Laporkan masalah</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
