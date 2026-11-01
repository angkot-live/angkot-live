import {
  AlertTriangle,
  ArrowRight,
  BusFront,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  LogOut,
  Phone,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { useAuthStore } from '@/features/auth/auth-store'
import { cn } from '@/lib/cn'

type VerificationStatus = 'menunggu' | 'ditolak' | 'disetujui'

const statusOptions: { value: VerificationStatus; label: string }[] = [
  { value: 'menunggu', label: '1. Menunggu verifikasi' },
  { value: 'ditolak', label: '2. Ditolak / perbaikan' },
  { value: 'disetujui', label: '3. Disetujui (mitra aktif)' },
]

const documents = [
  { name: 'SIM_B1_Umum.jpg', size: '2,4 MB', status: 'valid' },
  { name: 'STNK_Armada.pdf', size: '1,1 MB', status: 'valid' },
  { name: 'Kartu_Uji_KIR.pdf', size: '890 KB', status: 'valid' },
]

const content: Record<
  VerificationStatus,
  { badge: string; title: string; description: string; tone: 'peach' | 'danger' | 'leaf' }
> = {
  menunggu: {
    badge: 'Verifikasi dokumen sedang berlangsung',
    title: 'Dokumen Anda sedang diperiksa Dishub & Koperasi',
    description:
      'Estimasi proses validasi legalitas berkas adalah 1×24 jam kerja. Notifikasi akan dikirim melalui WhatsApp resmi dan SMS ke nomor terdaftar.',
    tone: 'peach',
  },
  ditolak: {
    badge: 'Perbaikan dokumen diperlukan',
    title: 'Beberapa berkas perlu diunggah ulang',
    description:
      'Dokumen belum dapat disetujui karena kualitas foto atau masa berlaku tidak memenuhi syarat. Perbaiki berkas lalu kirim ulang.',
    tone: 'danger',
  },
  disetujui: {
    badge: 'Mitra aktif',
    title: 'Selamat, akun pengemudi Anda disetujui!',
    description:
      'Kendaraan dan dokumen sudah terverifikasi. Anda bisa mulai narik dan menerima penumpang melalui portal pengemudi.',
    tone: 'leaf',
  },
}

export function DriverVerificationPage() {
  const user = useAuthStore((state) => state.user)
  const setDriverVerification = useAuthStore((state) => state.setDriverVerification)
  const [status, setStatus] = useState<VerificationStatus>(
    user?.driverVerification ?? 'menunggu',
  )
  const current = content[status]

  const steps = [
    {
      title: 'Pendaftaran terkirim',
      detail: '24 Okt 2026, 09.30 WIB · Melalui portal registrasi mitra',
      state: 'done' as const,
    },
    {
      title: 'Dokumen diperiksa petugas',
      detail: 'Pengecekan SIM B1 Umum, STNK, KIR, dan rekomendasi koperasi.',
      state: status === 'menunggu' ? ('active' as const) : ('done' as const),
    },
    {
      title: 'Keputusan kelayakan & pengaktifan akun',
      detail: 'Pemberian nomor lambung armada dan integrasi kode trayek digital.',
      state:
        status === 'disetujui'
          ? ('done' as const)
          : status === 'ditolak'
            ? ('failed' as const)
            : ('pending' as const),
    },
  ]

  return (
    <div className="min-h-svh bg-canvas">
      <header className="border-b border-line-soft bg-surface/90 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Avatar name={user?.name ?? 'Asep Suryana'} size="sm" />
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-xs font-semibold text-ink-strong">
                {user?.name ?? 'Asep Suryana'}
              </span>
              <span className="text-[10px] text-ink-soft">ID: MITRA-2024-8812</span>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">
                <LogOut size={14} />
                Keluar
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container-page py-6 md:py-8">
        <div className="flex flex-col gap-2 rounded-md bg-muted/70 p-2 md:flex-row md:items-center">
          <p className="px-2 text-[10px] font-bold tracking-wide text-ink-soft uppercase">
            Simulasi status berkas
          </p>
          <div className="flex flex-1 flex-wrap gap-1.5">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStatus(option.value)
                  if (user?.role === 'pengemudi') setDriverVerification(option.value)
                }}
                className={cn(
                  'rounded-md px-3 py-2 text-[11px] font-semibold transition',
                  status === option.value
                    ? 'bg-brand-strong text-white'
                    : 'bg-surface text-ink hover:bg-leaf',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
          <Card>
            <CardContent className="p-5 md:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={current.tone}>{current.badge}</Badge>
                <span className="text-[11px] text-ink-soft">Masuk antrean #042</span>
              </div>
              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
                {current.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink">
                {current.description}
              </p>

              {status === 'ditolak' ? (
                <div className="mt-4 rounded-md border border-danger/30 bg-danger-bg/40 p-3">
                  <div className="flex items-center gap-2 text-danger">
                    <AlertTriangle size={15} />
                    <p className="text-xs font-bold">Alasan penolakan</p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-danger/90">
                    Foto STNK buram dan masa berlaku KIR kurang dari 3 bulan. Unggah ulang dokumen
                    yang jelas dan masih berlaku.
                  </p>
                  <Button
                    size="sm"
                    variant="danger"
                    className="mt-2"
                    onClick={() => {
                      setStatus('menunggu')
                      if (user?.role === 'pengemudi') setDriverVerification('menunggu')
                      toast.success('Slot unggah ulang dibuka')
                    }}
                  >
                    <Upload size={14} />
                    Unggah ulang dokumen
                  </Button>
                </div>
              ) : null}

              {status === 'disetujui' ? (
                <div className="mt-4 rounded-md border border-brand/30 bg-leaf/60 p-3">
                  <div className="flex items-center gap-2 text-brand-strong">
                    <CheckCircle2 size={16} />
                    <p className="text-xs font-bold">Akun mitra aktif</p>
                  </div>
                  <p className="mt-1 text-xs text-brand-strong/80">
                    Nomor lambung D 1234 AB · Trayek 08 Stasiun Hall — Dago.
                  </p>
                  <Button size="sm" className="mt-2" asChild>
                    <Link to="/pengemudi/dashboard">
                      Buka dashboard pengemudi
                      <ArrowRight size={14} />
                    </Link>
                  </Button>
                </div>
              ) : null}

              <div className="mt-5 rounded-md bg-muted p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-ink-strong">Alur pemeriksaan dokumen</p>
                  <span className="text-[10px] text-ink">Langkah 2 dari 3</span>
                </div>
                <ol className="mt-3 flex flex-col">
                  {steps.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            'grid size-7 shrink-0 place-items-center rounded-full border-2',
                            step.state === 'done' && 'border-brand bg-brand text-white',
                            step.state === 'active' && 'border-warning bg-peach text-amber-900',
                            step.state === 'failed' && 'border-danger bg-danger text-white',
                            step.state === 'pending' && 'border-line bg-surface text-ink-soft',
                          )}
                        >
                          {step.state === 'done' ? (
                            <Check size={13} />
                          ) : step.state === 'failed' ? (
                            <XCircle size={13} />
                          ) : step.state === 'active' ? (
                            <Clock3 size={13} />
                          ) : (
                            <span className="size-1.5 rounded-full bg-line" />
                          )}
                        </span>
                        {index < steps.length - 1 ? (
                          <span
                            className={cn(
                              'my-1 w-px flex-1',
                              step.state === 'done' ? 'bg-brand' : 'bg-line',
                            )}
                          />
                        ) : null}
                      </div>
                      <div className={index < steps.length - 1 ? 'pb-4' : ''}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-ink-strong">{step.title}</p>
                          {step.state === 'done' ? (
                            <Badge variant="leaf">Selesai</Badge>
                          ) : step.state === 'active' ? (
                            <Badge variant="peach">Sedang proses</Badge>
                          ) : step.state === 'failed' ? (
                            <Badge variant="danger">Perlu perbaikan</Badge>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-ink">{step.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-5">
                <p className="text-xs font-bold tracking-wide text-ink-soft uppercase">
                  Berkas yang ditinjau
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {documents.map((document) => (
                    <div
                      key={document.name}
                      className={cn(
                        'flex items-start gap-2 rounded-md border p-3',
                        status === 'ditolak' && document.name.includes('STNK')
                          ? 'border-danger/30 bg-danger-bg/30'
                          : 'border-line-soft bg-muted/60',
                      )}
                    >
                      <FileText size={15} className="mt-0.5 shrink-0 text-brand" />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-ink-strong">
                          {document.name}
                        </p>
                        <p className="text-[10px] text-ink">
                          {document.size} · Terunggah
                        </p>
                        {status === 'ditolak' && document.name.includes('STNK') ? (
                          <Badge variant="danger" className="mt-1">
                            Buram
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-brand-strong">
                  <ShieldCheck size={17} />
                  <p className="text-sm font-bold">Proses cepat & transparan</p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink">
                  Petugas verifikasi Dishub memeriksa dokumen secara seksama untuk menjamin
                  keamanan dan kenyamanan penumpang.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-md bg-leaf p-2.5">
                  <BusFront size={15} className="text-brand-strong" />
                  <p className="text-[10px] font-semibold text-brand-strong">
                    Koperasi Angkutan Bandung (Kobanter Baru)
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-bold text-ink-strong">Butuh bantuan mendesak?</p>
                <p className="mt-1 text-xs leading-relaxed text-ink">
                  Hubungi posko siaga jika ada kesalahan data identitas atau pertanyaan status
                  berkas.
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                  <a href="tel:0800123456">
                    <Phone size={14} />
                    0800-1-ANGKOT
                  </a>
                </Button>
                <Link
                  to="/bantuan"
                  className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-brand-strong hover:underline"
                >
                  Pusat bantuan mitra
                  <ArrowRight size={12} />
                </Link>
              </CardContent>
            </Card>

            <p className="px-1 text-[10px] leading-relaxed text-ink-soft">
              Kerahasiaan data dan dokumen pribadi mitra dilindungi undang-undang dan peraturan
              Dinas Perhubungan.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
