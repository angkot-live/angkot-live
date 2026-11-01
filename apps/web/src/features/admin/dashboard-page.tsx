import {
  ArrowUpRight,
  BusFront,
  ChevronRight,
  ClipboardCheck,
  FileWarning,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Avatar } from '@/components/ui/avatar'
import { Badge, ReportStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table'
import { reports, routes } from '@/mocks/data'

const metrics: {
  label: string
  value: string
  delta: string
  icon: LucideIcon
  tone: string
}[] = [
  {
    label: 'Total angkot',
    value: '1.240',
    delta: '+24 bulan ini',
    icon: BusFront,
    tone: 'bg-leaf text-brand-strong',
  },
  {
    label: 'Angkot aktif',
    value: '892',
    delta: '72% dari armada',
    icon: TrendingUp,
    tone: 'bg-sky text-sky-ink',
  },
  {
    label: 'Menunggu verifikasi',
    value: '12',
    delta: '4 baru hari ini',
    icon: ClipboardCheck,
    tone: 'bg-peach text-amber-900',
  },
  {
    label: 'Laporan baru',
    value: '8',
    delta: '3 prioritas tinggi',
    icon: FileWarning,
    tone: 'bg-danger-bg text-danger',
  },
]

const routeCounts = [312, 268, 190, 142, 88]

const verificationQueue = [
  { name: 'Asep Sunandar', route: '08 — Stasiun Hall / Dago', time: '12 menit lalu' },
  { name: 'Dadan Ramdani', route: '05 — Cicaheum / Ledeng', time: '48 menit lalu' },
  { name: 'Eko Saputra', route: '02 — Kalapa / Cicaheum', time: '2 jam lalu' },
  { name: 'Yayan Suryana', route: '16 — Riung Bandung / Cicaheum', time: '3 jam lalu' },
]

export function AdminDashboardPage() {
  const maxCount = Math.max(...routeCounts)

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-eyebrow text-brand">Ringkasan layanan</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong">
            Dashboard Analitik
          </h1>
          <p className="mt-1 text-sm text-ink">
            Pantau kondisi armada, antrean verifikasi, dan laporan warga.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="leaf" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-brand" />
            Data realtime
          </Badge>
          <Button variant="outline" size="sm">
            Unduh laporan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-ink">{metric.label}</p>
                <p className="mt-1 text-3xl leading-none font-extrabold tracking-tight text-ink-strong">
                  {metric.value}
                </p>
                <p className="mt-2 text-[11px] text-ink-soft">{metric.delta}</p>
              </div>
              <span className={`grid size-10 place-items-center rounded-md ${metric.tone}`}>
                <metric.icon size={19} />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Angkot aktif per jurusan</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/monitoring">
                Lihat peta
                <ArrowUpRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            {routes.map((route, index) => (
              <div key={route.id} className="flex items-center gap-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-md text-[11px] font-extrabold text-white"
                  style={{ backgroundColor: route.color }}
                >
                  {route.code}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-ink-strong">{route.name}</p>
                    <p className="text-xs font-bold text-ink-strong">{routeCounts[index]}</p>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(routeCounts[index] / maxCount) * 100}%`,
                        backgroundColor: route.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-1 flex items-center justify-between rounded-md bg-muted px-3 py-2 text-[11px] text-ink">
              <span>Total armada aktif</span>
              <span className="font-bold text-ink-strong">892 angkot</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Antrean verifikasi</CardTitle>
            <Badge variant="peach">12</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 pt-3">
            {verificationQueue.map((driver) => (
              <Link
                key={driver.name}
                to="/admin/pengemudi"
                className="flex items-center gap-3 rounded-md px-1 py-2.5 transition hover:bg-muted"
              >
                <Avatar name={driver.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-strong">{driver.name}</p>
                  <p className="truncate text-[11px] text-ink">{driver.route}</p>
                  <p className="text-[10px] text-ink-soft">{driver.time}</p>
                </div>
                <ChevronRight size={15} className="text-ink-soft" />
              </Link>
            ))}
            <Button variant="soft" size="sm" className="mt-2 w-full" asChild>
              <Link to="/admin/pengemudi">
                <ShieldCheck size={14} />
                Buka antrean verifikasi
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Laporan terbaru</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/laporan">
              Semua laporan
              <ArrowUpRight size={14} />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Kode</TableHeaderCell>
                <TableHeaderCell>Subjek</TableHeaderCell>
                <TableHeaderCell>Plat</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-semibold text-ink-strong">{report.code}</TableCell>
                  <TableCell>{report.subject}</TableCell>
                  <TableCell className="text-ink">{report.plate ?? '—'}</TableCell>
                  <TableCell>
                    <ReportStatusBadge status={report.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/laporan/${report.id}`}>Tinjau</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
