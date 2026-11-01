import {
  ArrowLeft,
  ArrowRight,
  BusFront,
  CheckCircle2,
  Info,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

const roles = [
  {
    id: 'penumpang',
    icon: UserRound,
    tone: 'bg-leaf text-brand-strong',
    pill: 'Untuk warga',
    title: 'Penumpang',
    tagline: 'Lacak angkot, cari rute, lapor langsung',
    benefits: [
      'Pantau posisi dan ETA angkot realtime',
      'Cari jurusan terdekat menuju tujuan',
      'Laporkan layanan dan pantau tindak lanjut',
    ],
    action: 'Daftar sebagai Penumpang',
    to: '/register/penumpang',
    variant: 'primary' as const,
  },
  {
    id: 'pengemudi',
    icon: BusFront,
    tone: 'bg-sky text-sky-ink',
    pill: 'Untuk pengemudi',
    title: 'Pengemudi',
    tagline: 'Kelola status, lihat penumpang di rute',
    benefits: [
      'Bagikan posisi dan status kendaraan',
      'Lihat penumpang menunggu di area rute',
      'Kelola profil, dokumen, dan pendapatan',
    ],
    action: 'Daftar sebagai Pengemudi',
    to: '/pengemudi/daftar',
    variant: 'secondary' as const,
    note: 'Akun pengemudi diverifikasi admin sebelum tampil di peta publik.',
  },
]

export function RegisterRolePage() {
  return (
    <div className="min-h-svh bg-canvas">
      <div className="container-page py-8">
        <header className="flex items-center justify-between border-b border-line pb-4">
          <Logo />
          <Button variant="soft" size="sm" asChild>
            <Link to="/">
              <ArrowLeft size={15} />
              Kembali ke beranda
            </Link>
          </Button>
        </header>

        <section className="mx-auto flex max-w-3xl flex-col items-center py-10 text-center">
          <Badge variant="leaf">Pendaftaran akun</Badge>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-strong md:text-4xl">
            Pilih jenis akun Anda
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink">
            Setiap peran punya fitur yang berbeda. Pilih sesuai kebutuhan Anda sebagai penumpang
            atau pengemudi angkot terverifikasi.
          </p>
        </section>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {roles.map((role) => (
            <article
              key={role.id}
              className="flex flex-col rounded-lg border border-line-soft bg-surface p-7 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className={`grid size-14 place-items-center rounded-lg ${role.tone}`}>
                  <role.icon size={26} />
                </span>
                <Badge variant="outline">{role.pill}</Badge>
              </div>

              <div className="mt-5">
                <h2 className="text-2xl font-extrabold tracking-tight text-ink-strong">
                  {role.title}
                </h2>
                <p className="mt-1 text-sm font-medium text-brand">{role.tagline}</p>
              </div>

              <div className="my-5 h-px bg-line-soft" />

              <ul className="flex flex-1 flex-col gap-3">
                {role.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm text-ink-strong">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
                    {benefit}
                  </li>
                ))}
              </ul>

              {role.note ? (
                <div className="mt-5 flex items-start gap-2 rounded-md bg-peach/60 p-3 text-[11px] leading-relaxed text-amber-900">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  {role.note}
                </div>
              ) : null}

              <Button
                variant={role.variant}
                size="lg"
                className={
                  role.id === 'pengemudi'
                    ? 'mt-5 w-full bg-sky-ink hover:bg-[#274c7a]'
                    : 'mt-5 w-full'
                }
                asChild
              >
                <Link to={role.to}>
                  {role.action}
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 text-sm text-ink">
          <p>
            Sudah punya akun?{' '}
            <Link to="/login" className="font-semibold text-brand-strong hover:underline">
              Masuk di sini
            </Link>
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-ink-soft">
            <ShieldCheck size={13} className="text-brand" />
            Pendaftaran gratis dan data Anda dilindungi.
          </p>
        </div>
      </div>
    </div>
  )
}
