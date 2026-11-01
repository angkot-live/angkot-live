import { ArrowRight, Clock3, FileText, Plus, Search, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge, ReportStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useReportStore } from '@/features/reports/report-store'
import { cn } from '@/lib/cn'
import type { ReportStatus } from '@/types'

const filters: { label: string; value: ReportStatus | 'semua' }[] = [
  { label: 'Semua', value: 'semua' },
  { label: 'Diterima', value: 'diterima' },
  { label: 'Diproses', value: 'diproses' },
  { label: 'Selesai', value: 'selesai' },
]

const categoryLabel = {
  pengemudi: 'Pengemudi',
  fasilitas: 'Fasilitas',
  tarif: 'Tarif',
  lainnya: 'Lainnya',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function ReportsPage() {
  const reports = useReportStore((state) => state.reports)
  const [filter, setFilter] = useState<ReportStatus | 'semua'>('semua')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return reports.filter((report) => {
      const matchesStatus = filter === 'semua' || report.status === filter
      const matchesQuery =
        !term ||
        report.subject.toLowerCase().includes(term) ||
        report.code.toLowerCase().includes(term) ||
        report.description.toLowerCase().includes(term)
      return matchesStatus && matchesQuery
    })
  }, [filter, query, reports])

  return (
    <div className="container-page py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-eyebrow text-brand">Aduan penumpang</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Laporan saya
          </h1>
          <p className="mt-1 text-sm text-ink">
            Pantau status aduan dan tanggapan petugas dalam satu tempat.
          </p>
        </div>
        <Button asChild>
          <Link to="/penumpang/lapor">
            <Plus size={16} />
            Buat laporan
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total laporan', value: reports.length, icon: FileText },
          {
            label: 'Sedang diproses',
            value: reports.filter((report) => report.status !== 'selesai').length,
            icon: Clock3,
          },
          {
            label: 'Selesai ditindak',
            value: reports.filter((report) => report.status === 'selesai').length,
            icon: ShieldCheck,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-9 place-items-center rounded-md bg-leaf text-brand-strong">
                <stat.icon size={16} />
              </span>
              <div>
                <p className="text-lg leading-none font-extrabold text-ink-strong">{stat.value}</p>
                <p className="mt-1 text-[11px] text-ink">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                filter === item.value
                  ? 'bg-brand-strong text-white'
                  : 'bg-surface text-ink hover:bg-muted',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Input
          icon={<Search size={15} />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari kode atau topik"
          aria-label="Cari laporan"
          className="md:max-w-xs"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {filtered.map((report) => (
          <Link key={report.id} to={`/penumpang/laporan/${report.id}`} className="group">
            <Card className="transition group-hover:border-brand/40">
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-brand-strong">
                      <FileText size={16} />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-ink-strong">{report.subject}</p>
                        <Badge variant="outline">{categoryLabel[report.category]}</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-soft">
                        {report.code} · {formatDate(report.createdAt)}
                        {report.plate ? ` · ${report.plate}` : ''}
                      </p>
                    </div>
                  </div>
                  <ReportStatusBadge status={report.status} />
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-ink">
                  {report.description}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3">
                  <span className="text-[11px] text-ink">
                    {report.response ? 'Ada tanggapan petugas' : 'Menunggu tanggapan petugas'}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-brand-strong">
                    Lihat detail
                    <ArrowRight size={12} />
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <FileText size={26} className="text-ink-soft" />
              <p className="text-sm font-semibold text-ink-strong">Belum ada laporan</p>
              <p className="text-xs text-ink">Laporan dengan filter ini tidak ditemukan.</p>
              <Button size="sm" variant="outline" onClick={() => { setFilter('semua'); setQuery('') }}>
                Reset filter
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
