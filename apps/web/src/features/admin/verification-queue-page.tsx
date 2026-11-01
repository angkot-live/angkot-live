import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useVerificationStore } from '@/features/admin/verification-store'
import { cn } from '@/lib/cn'
import type { ApplicantStatus } from '@/mocks/admin'

const filters: { label: string; value: ApplicantStatus | 'semua' }[] = [
  { label: 'Menunggu', value: 'menunggu' },
  { label: 'Disetujui', value: 'disetujui' },
  { label: 'Ditolak / revisi', value: 'ditolak' },
  { label: 'Semua', value: 'semua' },
]

const statusMeta: Record<
  ApplicantStatus,
  { label: string; variant: 'peach' | 'leaf' | 'danger' }
> = {
  menunggu: { label: 'Menunggu tinjauan', variant: 'peach' },
  disetujui: { label: 'Disetujui', variant: 'leaf' },
  ditolak: { label: 'Ditolak / revisi', variant: 'danger' },
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function VerificationQueuePage() {
  const driverApplicants = useVerificationStore((state) => state.applicants)
  const [filter, setFilter] = useState<ApplicantStatus | 'semua'>('menunggu')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return driverApplicants.filter((applicant) => {
      const matchesStatus = filter === 'semua' || applicant.status === filter
      const matchesQuery =
        !term ||
        applicant.name.toLowerCase().includes(term) ||
        applicant.nik.includes(term) ||
        applicant.plate.toLowerCase().includes(term)
      return matchesStatus && matchesQuery
    })
  }, [driverApplicants, filter, query])

  const pending = driverApplicants.filter((item) => item.status === 'menunggu').length

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Sistem kendali perizinan angkutan</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Antrean verifikasi pengemudi
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink">
            Pemeriksaan legalitas berkas supir dan kelayakan teknis armada sebelum penerbitan
            kartu identitas resmi pengemudi.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="rounded-md border border-line-soft bg-surface px-3 py-2 shadow-soft">
            <p className="flex items-center gap-1.5 text-[10px] text-ink">
              <Clock3 size={11} className="text-warning" />
              Tenggat SLA
            </p>
            <p className="text-sm font-extrabold text-ink-strong">&lt; 24 jam kerja</p>
          </div>
          <div className="rounded-md border border-line-soft bg-surface px-3 py-2 shadow-soft">
            <p className="flex items-center gap-1.5 text-[10px] text-ink">
              <CheckCircle2 size={11} className="text-brand" />
              Tingkat lolos
            </p>
            <p className="text-sm font-extrabold text-ink-strong">91,9% disetujui</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: 'Antrean tertunda',
            value: pending.toString(),
            note: 'Perlu tinjauan',
            icon: Clock3,
            tone: 'text-warning bg-peach',
          },
          {
            label: 'Disetujui bulan ini',
            value: '182',
            note: '+18 pekan ini',
            icon: ShieldCheck,
            tone: 'text-brand-strong bg-leaf',
          },
          {
            label: 'Revisi berkas',
            value: '16',
            note: 'Uji KIR kedaluwarsa',
            icon: ShieldAlert,
            tone: 'text-danger bg-danger-bg',
          },
          {
            label: 'Rata-rata verifikasi',
            value: '4,2',
            note: 'jam per berkas',
            icon: Users,
            tone: 'text-sky-ink bg-sky',
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

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  'shrink-0 rounded-md px-3 py-2 text-[11px] font-semibold transition',
                  filter === item.value
                    ? 'bg-brand-strong text-white'
                    : 'bg-surface text-ink hover:bg-muted',
                )}
              >
                {item.label}
                {item.value === 'menunggu' ? (
                  <span className="ml-1.5 rounded-full bg-peach px-1.5 py-0.5 text-[9px] text-amber-900">
                    {pending}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download size={14} />
              Ekspor CSV
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Input
            icon={<Search size={15} />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama supir, NIK, atau plat nomor"
            aria-label="Cari pengemudi"
            className="h-11 w-full flex-1 basis-full md:basis-auto md:max-w-md"
          />
          <Button variant="outline" size="sm" className="h-11">
            Semua koperasi
          </Button>
          <Button variant="outline" size="sm" className="h-11">
            <CalendarDays size={14} />
            Tanggal daftar
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map((applicant) => {
            const meta = statusMeta[applicant.status]
            return (
              <Card key={applicant.id} className="transition hover:border-brand/40">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-leaf text-xs font-extrabold text-brand-strong">
                      {applicant.name
                        .replace(/^(Pak|Kang)\s+/i, '')
                        .split(' ')
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')}
                    </span>

                    <div className="min-w-[180px] flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-ink-strong">{applicant.name}</p>
                        {applicant.status === 'menunggu' ? (
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        ) : (
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-ink-soft">
                        NIK {applicant.nik} · WA {applicant.wa}
                      </p>
                      <p className="mt-1 text-[10px] text-ink">
                        {applicant.model} ({applicant.year}) · {applicant.color}
                      </p>
                    </div>

                    <div className="min-w-[120px]">
                      <p className="text-[10px] text-ink-soft">Kendaraan</p>
                      <p className="text-xs font-bold text-ink-strong">{applicant.plate}</p>
                    </div>

                    <div className="min-w-[150px]">
                      <p className="text-[10px] text-ink-soft">Jurusan diajukan</p>
                      <Badge variant="sky" className="mt-1">
                        <MapPin size={10} />
                        {applicant.routeCode} · {applicant.routeName}
                      </Badge>
                    </div>

                    <div className="min-w-[110px]">
                      <p className="text-[10px] text-ink-soft">Tanggal daftar</p>
                      <p className="text-[11px] font-semibold text-ink-strong">
                        {formatDate(applicant.registeredAt)}
                      </p>
                    </div>

                    <div className="min-w-[110px]">
                      <p className="text-[10px] text-ink-soft">Kelengkapan berkas</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <FileCheck2
                          size={13}
                          className={
                            applicant.docsComplete === applicant.docsTotal
                              ? 'text-brand'
                              : 'text-warning'
                          }
                        />
                        <span className="text-[11px] font-semibold text-ink-strong">
                          {applicant.docsComplete}/{applicant.docsTotal}
                        </span>
                      </div>
                      <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            applicant.docsComplete === applicant.docsTotal
                              ? 'bg-brand'
                              : 'bg-warning',
                          )}
                          style={{
                            width: `${(applicant.docsComplete / applicant.docsTotal) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <Button size="sm" variant="soft" className="ml-auto" asChild>
                      <Link to={`/admin/pengemudi/${applicant.id}`}>
                        Tinjau
                        <ArrowRight size={13} />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <ShieldCheck size={26} className="text-ink-soft" />
                <p className="text-sm font-semibold text-ink-strong">
                  Tidak ada pengemudi di antrean ini
                </p>
                <p className="text-xs text-ink">Coba ubah filter atau kata kunci pencarian.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilter('semua')
                    setQuery('')
                  }}
                >
                  Reset filter
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
