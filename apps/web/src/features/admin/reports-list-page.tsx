import {
  AlertTriangle,
  ArrowRight,
  BusFront,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  Flag,
  MessageSquareWarning,
  Search,
  SlidersHorizontal,
  Ticket,
  Wrench,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useReportStore } from '@/features/reports/report-store'
import { cn } from '@/lib/cn'
import type { ReportCategory, ReportStatus } from '@/types'

const statusFilters: { label: string; value: ReportStatus | 'semua' }[] = [
  { label: 'Semua laporan', value: 'semua' },
  { label: 'Baru', value: 'diterima' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' },
]

const categoryMeta: Record<
  ReportCategory,
  { label: string; icon: typeof Flag; className: string }
> = {
  pengemudi: {
    label: 'Perilaku pengemudi',
    icon: AlertTriangle,
    className: 'bg-peach text-amber-900',
  },
  fasilitas: { label: 'Fasilitas', icon: Wrench, className: 'bg-sky text-sky-ink' },
  tarif: { label: 'Tarif', icon: Ticket, className: 'bg-leaf text-brand-strong' },
  lainnya: { label: 'Lainnya', icon: Flag, className: 'bg-muted text-ink' },
}

const statusMeta: Record<ReportStatus, { label: string; variant: 'peach' | 'sky' | 'leaf' }> = {
  diterima: { label: 'Baru', variant: 'peach' },
  diproses: { label: 'Diproses', variant: 'sky' },
  selesai: { label: 'Selesai', variant: 'leaf' },
}

const reporters = ['Sari Wulandari', 'Rina Marlina', 'Budi Hartono', 'Dewi Lestari', 'Agus Salim']

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ReportsListPage() {
  const reports = useReportStore((state) => state.reports)
  const [status, setStatus] = useState<ReportStatus | 'semua'>('semua')
  const [category, setCategory] = useState<ReportCategory | 'semua'>('semua')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return reports.filter((report) => {
      const matchesStatus = status === 'semua' || report.status === status
      const matchesCategory = category === 'semua' || report.category === category
      const matchesQuery =
        !term ||
        report.code.toLowerCase().includes(term) ||
        report.subject.toLowerCase().includes(term) ||
        (report.plate ?? '').toLowerCase().includes(term)
      return matchesStatus && matchesCategory && matchesQuery
    })
  }, [category, query, reports, status])

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Pusat pengaduan masyarakat</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Daftar laporan penumpang
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink">
            Kelola, verifikasi, dan tindak lanjuti laporan terkait pelayanan angkot di Kota
            Bandung.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download size={14} />
            Ekspor laporan
          </Button>
          <Button size="sm" asChild>
            <Link to="/admin/laporan/rep-3">
              <MessageSquareWarning size={14} />
              Tinjau laporan baru
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: 'Total laporan masuk',
            value: reports.length.toString(),
            note: '+12% dari bulan lalu',
            icon: Flag,
            tone: 'bg-leaf text-brand-strong',
          },
          {
            label: 'Menunggu tindakan',
            value: reports.filter((report) => report.status === 'diterima').length.toString(),
            note: 'Prioritas tinggi',
            icon: Clock3,
            tone: 'bg-peach text-amber-900',
          },
          {
            label: 'Sedang diproses',
            value: reports.filter((report) => report.status === 'diproses').length.toString(),
            note: 'Diteruskan ke petugas',
            icon: SlidersHorizontal,
            tone: 'bg-sky text-sky-ink',
          },
          {
            label: 'Selesai ditindaklanjuti',
            value: reports.filter((report) => report.status === 'selesai').length.toString(),
            note: 'Tingkat penyelesaian 94%',
            icon: CheckCircle2,
            tone: 'bg-brand text-white',
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold text-ink">{stat.label}</p>
                <span className={cn('grid size-8 place-items-center rounded-md', stat.tone)}>
                  <stat.icon size={15} />
                </span>
              </div>
              <p className="mt-2 text-2xl leading-none font-extrabold text-ink-strong">
                {stat.value}
              </p>
              <p className="mt-1 text-[10px] text-ink-soft">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-line-soft pb-3">
            {statusFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                className={cn(
                  'rounded-md px-3 py-2 text-[11px] font-semibold transition',
                  status === item.value
                    ? 'bg-brand-strong text-white'
                    : 'text-ink hover:bg-muted',
                )}
              >
                {item.label}
              </button>
            ))}
            <div className="ml-auto flex flex-wrap gap-2">
              <Input
                icon={<Search size={15} />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari kode, subjek, atau plat"
                aria-label="Cari laporan"
                className="h-9 md:w-64"
              />
              <div className="relative">
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as ReportCategory | 'semua')
                  }
                  aria-label="Filter kategori"
                  className="h-9 appearance-none rounded-md border border-line bg-surface pr-8 pl-3 text-xs font-semibold text-ink-strong outline-none focus:border-brand"
                >
                  <option value="semua">Semua kategori</option>
                  <option value="pengemudi">Perilaku pengemudi</option>
                  <option value="fasilitas">Fasilitas</option>
                  <option value="tarif">Tarif</option>
                  <option value="lainnya">Lainnya</option>
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-ink"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {filtered.map((report, index) => {
              const cat = categoryMeta[report.category]
              const stat = statusMeta[report.status]
              return (
                <div
                  key={report.id}
                  className="grid gap-2 rounded-md border border-line-soft p-3 transition hover:border-brand/40 hover:bg-muted/30 lg:grid-cols-[110px_1fr_150px_130px_150px_90px] lg:items-center"
                >
                  <div>
                    <p className="text-[10px] text-ink-soft">Kode</p>
                    <p className="text-xs font-extrabold text-brand-strong">{report.code}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold',
                          cat.className,
                        )}
                      >
                        <cat.icon size={9} />
                        {cat.label}
                      </span>
                      <Badge variant={stat.variant}>{stat.label}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs font-bold text-ink-strong">
                      {report.subject}
                    </p>
                    <p className="truncate text-[10px] text-ink">{report.description}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-soft">Kendaraan / trayek</p>
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-ink-strong">
                      <BusFront size={11} className="text-brand" />
                      {report.plate ?? 'Tidak diketahui'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-soft">Pelapor</p>
                    <p className="text-[11px] font-semibold text-ink-strong">
                      {reporters[index % reporters.length]}
                    </p>
                    <p className="text-[9px] text-ink-soft">{formatDate(report.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        report.status === 'diterima'
                          ? 'bg-warning'
                          : report.status === 'diproses'
                            ? 'bg-sky-ink'
                            : 'bg-brand',
                      )}
                    />
                    <span className="text-[10px] text-ink">
                      {report.status === 'diterima'
                        ? 'Belum ditugaskan'
                        : report.status === 'diproses'
                          ? 'Ditangani petugas'
                          : 'Sudah ditutup'}
                    </span>
                  </div>
                  <Button variant="soft" size="sm" asChild>
                    <Link to={`/admin/laporan/${report.id}`}>
                      Detail
                      <ArrowRight size={12} />
                    </Link>
                  </Button>
                </div>
              )
            })}
            {filtered.length === 0 ? (
              <div className="py-10 text-center">
                <Flag size={24} className="mx-auto text-ink-soft" />
                <p className="mt-2 text-sm font-semibold text-ink-strong">
                  Tidak ada laporan yang cocok
                </p>
                <p className="text-xs text-ink">Ubah filter status atau kategori.</p>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3 text-[10px] text-ink">
            <span>
              Menampilkan {filtered.length} dari {reports.length} laporan contoh
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled>
                Sebelumnya
              </Button>
              <Button variant="soft" size="sm">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                Berikutnya
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
