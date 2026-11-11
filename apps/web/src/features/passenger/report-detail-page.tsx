import {
  ArrowLeft,
  BusFront,
  Check,
  CircleDot,
  Clock3,
  FileText,
  MessageSquare,
  Plus,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { Badge, ReportStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useReportStore } from '@/features/reports/report-store'
import { cn } from '@/lib/cn'
import { PrivateFileButton } from '@/components/ui/private-file-button'
import type { ReportStatus } from '@/types'

const steps: { status: ReportStatus; title: string; detail: string }[] = [
  {
    status: 'diterima',
    title: 'Laporan diterima',
    detail: 'Tiket dibuat dan masuk antrean petugas',
  },
  {
    status: 'diproses',
    title: 'Sedang diproses',
    detail: 'Petugas memverifikasi kronologi dan kendaraan',
  },
  {
    status: 'selesai',
    title: 'Selesai',
    detail: 'Tindakan selesai dan tanggapan dikirim',
  },
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
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ReportDetailPage() {
  const { id } = useParams()
  const reports = useReportStore((state) => state.reports)
  const loadError = useReportStore((state) => state.error)
  const report = reports.find((item) => item.id === id)

  if (!report) {
    return (
      <div className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <FileText size={30} className="text-ink-soft" />
        {loadError && (
          <p role="alert" className="text-danger">
            {loadError}
          </p>
        )}
        <h1 className="text-xl font-bold text-ink-strong">
          Laporan tidak ditemukan
        </h1>
        <p className="text-sm text-ink">
          Kode laporan mungkin salah atau sudah dihapus.
        </p>
        <Button asChild>
          <Link to="/penumpang/laporan">
            <ArrowLeft size={15} />
            Kembali ke laporan
          </Link>
        </Button>
      </div>
    )
  }

  const currentIndex = steps.findIndex((step) => step.status === report.status)
  const activeIndex = currentIndex < 0 ? 0 : currentIndex

  return (
    <div className="container-page py-6 md:py-10">
      <Link
        to="/penumpang/laporan"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-brand-strong"
      >
        <ArrowLeft size={14} />
        Laporan saya
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
              {report.subject}
            </h1>
            <ReportStatusBadge status={report.status} />
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            {report.code} · {formatDate(report.createdAt)}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/penumpang/lapor">
            <Plus size={15} />
            Buat laporan baru
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4 md:p-5">
              <h2 className="text-sm font-bold text-ink-strong">
                Status penanganan
              </h2>
              {report.updates.map((u) => (
                <div
                  key={u.id}
                  className="mb-3 border-l-2 border-brand pl-3 text-sm"
                >
                  <p className="text-xs text-ink">
                    {u.status} · {formatDate(u.created_at)}
                  </p>
                  <p>{u.notes}</p>
                </div>
              ))}
              <ol className="mt-4 flex flex-col">
                {steps.map((step, index) => {
                  const done = index < activeIndex
                  const active = index === activeIndex
                  return (
                    <li key={step.status} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            'grid size-7 shrink-0 place-items-center rounded-full border-2',
                            done && 'border-brand bg-brand text-white',
                            active && 'border-brand bg-leaf text-brand-strong',
                            !done &&
                              !active &&
                              'border-line bg-surface text-ink-soft',
                          )}
                        >
                          {done ? (
                            <Check size={13} />
                          ) : active ? (
                            <CircleDot size={13} />
                          ) : (
                            <span className="size-1.5 rounded-full bg-line" />
                          )}
                        </span>
                        {index < steps.length - 1 ? (
                          <span
                            className={cn(
                              'my-1 w-px flex-1',
                              index < activeIndex ? 'bg-brand' : 'bg-line',
                            )}
                          />
                        ) : null}
                      </div>
                      <div className={index < steps.length - 1 ? 'pb-5' : ''}>
                        <p
                          className={cn(
                            'text-xs font-bold',
                            active || done
                              ? 'text-ink-strong'
                              : 'text-ink-soft',
                          )}
                        >
                          {step.title}
                        </p>
                        <p className="text-xs text-ink">{step.detail}</p>
                        {active ? (
                          <Badge variant="leaf" className="mt-1.5">
                            Tahap saat ini
                          </Badge>
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-strong">
                  Detail laporan
                </h2>
                {report.evidence.map((path, i) => (
                  <PrivateFileButton
                    key={path}
                    bucket="report-evidence"
                    path={path}
                  >
                    Lihat bukti {i + 1}
                  </PrivateFileButton>
                ))}
                <Badge variant="outline">
                  {categoryLabel[report.category]}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                {report.description}
              </p>

              <div className="mt-4 rounded-md bg-muted p-3">
                <p className="text-xs font-semibold text-ink-strong">
                  Kendaraan terkait
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-md bg-surface text-brand-strong">
                    <BusFront size={15} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink-strong">
                      {report.plate ?? 'Tidak dicantumkan'}
                    </p>
                    <p className="text-xs text-ink">
                      Dilaporkan lewat aplikasi penumpang
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {report.updates.length > 0 && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <h2 className="font-bold text-sm">Riwayat tanggapan</h2>
                {report.updates.map((u) => (
                  <div
                    key={u.id}
                    className="border-l-2 border-brand pl-3 text-xs"
                  >
                    <p>
                      {u.status} ·{' '}
                      {new Date(u.created_at).toLocaleString('id-ID')}
                    </p>
                    <p className="mt-1">{u.notes}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {report.response ? (
            <Card className="border-brand/30 bg-leaf/40">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center gap-2 text-brand-strong">
                  <MessageSquare size={15} />
                  <h2 className="text-sm font-bold">Tanggapan petugas</h2>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-brand-strong/80">
                  {report.response}
                </p>
                <p className="mt-2 text-xs text-brand-strong/60">
                  Admin aplikasi ·{' '}
                  {formatDate(
                    report.updates.at(-1)?.created_at ?? report.createdAt,
                  )}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Clock3 size={18} className="text-ink-soft" />
                <div>
                  <p className="text-xs font-semibold text-ink-strong">
                    Menunggu tanggapan
                  </p>
                  <p className="text-xs text-ink">
                    Tanggapan akan tampil pada timeline setelah petugas
                    menindaklanjuti.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4 md:p-5">
              <h2 className="text-sm font-bold text-ink-strong">Ringkasan</h2>
              <dl className="mt-3 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-ink">Kode tiket</dt>
                  <dd className="font-semibold text-ink-strong">
                    {report.code}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink">Kategori</dt>
                  <dd className="font-semibold text-ink-strong">
                    {categoryLabel[report.category]}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink">Tanggal</dt>
                  <dd className="font-semibold text-ink-strong">
                    {formatDate(report.createdAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink">Status</dt>
                  <dd>
                    <ReportStatusBadge status={report.status} />
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="bg-brand-strong text-white">
            <CardContent className="p-5">
              <p className="text-eyebrow text-brand-soft">
                Butuh bantuan lain?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/90">
                Lihat pusat bantuan untuk panduan laporan dan penggunaan
                aplikasi.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-transparent bg-white text-brand-strong hover:bg-muted"
                asChild
              >
                <Link to="/bantuan">Buka pusat bantuan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
