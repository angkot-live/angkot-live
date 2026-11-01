import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Flag,
  MapPin,
  MessageSquare,
  Send,
  Ticket,
  UserRound,
  Wrench,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { useMessageStore } from '@/features/messages/message-store'
import { useReportStore } from '@/features/reports/report-store'
import { cn } from '@/lib/cn'
import type { ReportCategory, ReportStatus } from '@/types'

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
  const updateReport = useReportStore((state) => state.updateReport)
  const sendMessage = useMessageStore((state) => state.sendMessage)
  const report = reports.find((item) => item.id === id)
  const [status, setStatus] = useState<ReportStatus>(report?.status ?? 'diterima')
  const [response, setResponse] = useState(report?.response ?? '')

  if (!report) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Flag size={30} className="text-ink-soft" />
        <h1 className="text-xl font-bold text-ink-strong">Laporan tidak ditemukan</h1>
        <Button asChild>
          <Link to="/admin/laporan">
            <ArrowLeft size={15} />
            Kembali ke daftar laporan
          </Link>
        </Button>
      </div>
    )
  }

  const cat = categoryMeta[report.category]
  const stat = statusMeta[status]

  function handleSend() {
    if (!report) return
    if (!response.trim()) {
      toast.error('Tulis tanggapan terlebih dahulu.')
      return
    }
    updateReport(report.id, { status, response: response.trim() })
    toast.success('Tanggapan terkirim', {
      description: `Pelapor ${report.code} akan menerima notifikasi.`,
    })
  }

  function handleContactDriver() {
    if (!report) return
    const body =
      response.trim() ||
      `Terkait laporan ${report.code} pada kendaraan ${report.plate ?? 'yang dilaporkan'}, mohon segera menghubungi petugas pengaduan Dishub Kota Bandung.`
    sendMessage({
      title: `Tindak lanjut laporan ${report.code}`,
      body,
      from: 'Petugas Pengaduan Dishub',
      role: 'Administrator',
      kind: 'report',
    })
    toast.success('Pesan terkirim ke inbox pengemudi', {
      description: 'Pengemudi terkait akan menerima tindak lanjut laporan ini.',
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/laporan"
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-muted"
        >
          <ArrowLeft size={14} />
          Kembali ke daftar laporan
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={stat.variant}>{stat.label}</Badge>
          <span className="text-[10px] text-ink-soft">Prioritas sedang</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] text-ink-soft">
            {report.code} · Masuk {formatDate(report.createdAt)}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong">
            {report.subject}
          </h1>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold',
            cat.className,
          )}
        >
          <cat.icon size={11} />
          {cat.label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-bold text-ink-strong">Isi laporan</h2>
              <p className="mt-2 text-xs leading-relaxed text-ink">{report.description}</p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-line-soft p-3">
                  <p className="text-[10px] text-ink-soft">Kendaraan dilaporkan</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-ink-strong">
                    <BusFront size={13} className="text-brand" />
                    {report.plate ?? 'Tidak diketahui'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink">Suzuki Carry · Trayek 08</p>
                </div>
                <div className="rounded-md border border-line-soft p-3">
                  <p className="text-[10px] text-ink-soft">Lokasi kejadian</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-ink-strong">
                    <MapPin size={13} className="text-brand" />
                    Jl. Ir. H. Juanda, Dago
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink">Kota Bandung, Jawa Barat</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-ink-soft">Bukti foto dari pelapor</p>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[10px] font-semibold text-brand-strong"
                    onClick={() => toast.info('Pratinjau foto dibuka')}
                  >
                    Buka ukuran penuh
                    <ExternalLink size={10} />
                  </button>
                </div>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <div className="flex h-40 items-center justify-center rounded-md bg-gradient-to-br from-slate-700 via-slate-500 to-slate-300 text-white">
                    <div className="text-center">
                      <BusFront size={34} className="mx-auto opacity-80" />
                      <p className="mt-1 text-[10px] font-semibold">Foto kendaraan · 1</p>
                    </div>
                  </div>
                  <div className="flex h-40 items-center justify-center rounded-md bg-gradient-to-br from-emerald-800 via-emerald-600 to-lime-300 text-white">
                    <div className="text-center">
                      <MapPin size={34} className="mx-auto opacity-80" />
                      <p className="mt-1 text-[10px] font-semibold">Foto lokasi · 2</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-bold text-ink-strong">Riwayat penanganan</h2>
              <ol className="mt-3 flex flex-col gap-0">
                {[
                  {
                    title: 'Laporan diterima sistem',
                    detail: 'Laporan masuk melalui aplikasi penumpang.',
                    time: formatDate(report.createdAt),
                    done: true,
                  },
                  {
                    title: 'Diverifikasi admin',
                    detail: 'Kategori dan lokasi kejadian sesuai dengan laporan.',
                    time: '28 Okt 2026, 09.12',
                    done: true,
                  },
                  {
                    title: 'Diteruskan ke petugas trayek',
                    detail: 'Menunggu konfirmasi petugas lapangan.',
                    time: '28 Okt 2026, 10.40',
                    done: report.status !== 'diterima',
                  },
                  {
                    title: 'Laporan selesai',
                    detail: 'Tanggapan akhir dikirim ke pelapor.',
                    time: report.status === 'selesai' ? '29 Okt 2026, 15.22' : 'Belum selesai',
                    done: report.status === 'selesai',
                  },
                ].map((step, index, list) => (
                  <li key={step.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'grid size-5 shrink-0 place-items-center rounded-full',
                          step.done ? 'bg-brand text-white' : 'border border-line bg-surface',
                        )}
                      >
                        {step.done ? (
                          <CheckCircle2 size={11} />
                        ) : (
                          <span className="size-1.5 rounded-full bg-ink-soft" />
                        )}
                      </span>
                      {index < list.length - 1 ? (
                        <span
                          className={cn('w-px flex-1', step.done ? 'bg-brand/40' : 'bg-line')}
                        />
                      ) : null}
                    </div>
                    <div className="pb-4">
                      <p className="text-[11px] font-semibold text-ink-strong">{step.title}</p>
                      <p className="text-[10px] text-ink">{step.detail}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[9px] text-ink-soft">
                        <Clock3 size={9} />
                        {step.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                <UserRound size={15} className="text-brand" />
                Data pelapor
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name="Sari Wulandari" />
                <div>
                  <p className="text-xs font-bold text-ink-strong">Sari Wulandari</p>
                  <p className="text-[10px] text-ink">Penumpang terverifikasi</p>
                  <p className="text-[10px] text-ink-soft">+62 812-****-2210</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-muted p-2">
                  <p className="text-sm font-extrabold text-ink-strong">14</p>
                  <p className="text-[9px] text-ink">Total laporan</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <p className="text-sm font-extrabold text-ink-strong">12</p>
                  <p className="text-[9px] text-ink">Ditindaklanjuti</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-bold text-ink-strong">Tindak lanjut</h2>
              <label htmlFor="report-status" className="mt-3 block text-[10px] font-semibold text-ink">
                Ubah status laporan
              </label>
              <select
                id="report-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as ReportStatus)}
                className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-3 text-xs font-semibold text-ink-strong outline-none focus:border-brand"
              >
                <option value="diterima">Baru / diterima</option>
                <option value="diproses">Sedang diproses</option>
                <option value="selesai">Selesai</option>
              </select>

              <label
                htmlFor="report-response"
                className="mt-3 block text-[10px] font-semibold text-ink"
              >
                Tanggapan untuk pelapor
              </label>
              <Textarea
                id="report-response"
                value={response}
                onChange={(event) => setResponse(event.target.value)}
                placeholder="Tulis tindakan yang sudah atau akan dilakukan..."
                className="mt-1 min-h-28"
              />

              <div className="mt-2 flex flex-col gap-2">
                <Button onClick={handleSend}>
                  <Send size={14} />
                  Kirim tanggapan
                </Button>
                <Button variant="outline" onClick={handleContactDriver}>
                  <MessageSquare size={14} />
                  Hubungi pengemudi
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
