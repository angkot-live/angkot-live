import {
  ArrowRight,
  BusFront,
  CheckCircle2,
  MapPin,
  MessageSquareWarning,
  Radar,
  Route,
  ShieldCheck,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { usePublicStatistics } from '@/features/public/use-statistics'
import { LandingGuide } from './landing-guide'
import { LandingMapPreview } from './landing-map-preview'

const trustBadges = [
  'Tanpa perlu login',
  'ETA bila data memadai',
  'Trayek Bandung',
]

const features = [
  {
    icon: Radar,
    tone: 'bg-brand-soft text-brand-strong',
    title: 'Posisi Realtime',
    description:
      'Pantau posisi terbaru pengemudi, status kendaraan dan kesegaran sampel lokasi melalui peta realtime.',
    link: 'Lihat sebaran armada',
    to: '/peta',
  },
  {
    icon: Route,
    tone: 'bg-sky text-sky-ink',
    title: 'Cari Jurusan Langsung',
    description:
      'Temukan jurusan langsung sesuai arah trayek, titik naik/turun dan petunjuk jalan kaki.',
    link: 'Cari rute terbaik',
    to: '/peta',
  },
  {
    icon: MessageSquareWarning,
    tone: 'bg-peach text-amber-900',
    title: 'Lapor Langsung',
    description:
      'Laporkan pengemudi ugal-ugalan atau fasilitas yang tidak layak, lalu pantau status tindak lanjutnya.',
    link: 'Buat laporan',
    to: '/penumpang/lapor',
  },
]

const pillars = [
  {
    number: '1',
    tone: 'bg-leaf text-leaf-ink',
    eyebrow: 'Kemudahan Komuter',
    title: 'Penumpang',
    description:
      'Kenali jurusan, pantau lokasi segar dan beri tanda saat menunggu.',
    points: [
      'Pilih halte atau titik tujuan terdekat',
      'Pantau laju angkot dan estimasi tiba',
      'Simpan perjalanan setelah konfirmasi naik',
    ],
  },
  {
    number: '2',
    tone: 'bg-sky text-sky-ink',
    eyebrow: 'Informasi Sepanjang Trayek',
    title: 'Pengemudi',
    description:
      'Lihat penumpang yang menunggu di sepanjang rute dan atur status secara transparan.',
    points: [
      'Terima informasi penumpang di area rute',
      'Atur status narik, ngetem, dan istirahat',
      'Istirahat atau Offline saat berhenti bertugas',
    ],
  },
  {
    number: '3',
    tone: 'bg-peach text-amber-900',
    eyebrow: 'Pengawasan Cepat',
    title: 'Admin / Pengawas',
    description:
      'Verifikasi pengemudi, kelola trayek, dan pantau kualitas layanan dari satu dashboard.',
    points: [
      'Verifikasi dokumen pengemudi',
      'Kelola trayek dan titik halte',
      'Tindak lanjuti laporan warga',
    ],
  },
]

export function LandingPage() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash !== '#cara-kerja') return
    const frame = requestAnimationFrame(() => document.getElementById('cara-kerja')?.scrollIntoView())
    return () => cancelAnimationFrame(frame)
    // Key changes even when the same hash link is clicked again.
  }, [location.hash, location.key])
  const { data, error, isPending, refetch } = usePublicStatistics()
  const metrics = [
    { value: data ? data.totalVehicles.toLocaleString('id-ID') : '—', label: 'Armada terdaftar', tone: 'bg-leaf', icon: BusFront },
    {
      value: data ? data.activeVehicles.toLocaleString('id-ID') : '—',
      label: 'Armada aktif, termasuk simulasi',
      tone: 'bg-leaf',
      icon: BusFront,
    },
    {
      value: data ? String(data.routeCodes) : '—',
      label: 'Kode jurusan aktif',
      tone: 'bg-sky',
      icon: Route,
    },
    {
      value: data
        ? `${data.reports ? Math.round(((data.processing + data.resolved) / data.reports) * 100) : 0}%`
        : '—',
      label: 'Laporan ditindaklanjuti',
      tone: 'bg-peach',
      icon: ShieldCheck,
    },
  ]

  return (
    <>
      <section className="relative overflow-hidden border-b border-line-soft/60 bg-gradient-to-b from-canvas via-muted to-canvas">
        <div
          className="pointer-events-none absolute -top-24 -left-20 size-96 rounded-full bg-brand-soft/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-72 right-0 size-[500px] rounded-full bg-sky/20 blur-3xl"
          aria-hidden
        />
        <div className="container-page grid items-center gap-10 py-12 lg:grid-cols-2 lg:gap-8 lg:py-16">
          <div className="flex flex-col items-start">
            <h1 className="text-4xl leading-[1.15] font-extrabold tracking-tight text-ink-strong md:text-5xl">
              Kenali Trayeknya,
              <br />
              <span className="relative inline-block text-brand">
                Pantau Angkotnya
                <svg
                  className="absolute -bottom-2 left-0 w-full text-brand-soft"
                  viewBox="0 0 328 12"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M2 8C60 3 120 2 170 4C220 6 280 9 326 4"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-ink">
              Temukan jurusan yang sesuai, pantau posisi angkot dan beri tanda
              saat Anda menunggu. Estimasi tiba tersedia bila lokasi dan arah memadai.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link to="/peta">
                  Lihat Peta Live
                  <ArrowRight size={17} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/peta?tab=rute">
                  <Route size={17} />
                  Cari Trayek
                </Link>
              </Button>
            </div>

            <ul className="mt-6 flex flex-wrap items-center gap-2">
              {trustBadges.map((badge) => (
                <li
                  key={badge}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted-strong px-3 py-1.5 text-xs font-medium text-ink"
                >
                  <CheckCircle2 size={13} className="text-brand" />
                  {badge}
                </li>
              ))}
            </ul>
          </div>

          <LandingMapPreview />
        </div>
      </section>

      <section className="border-b border-line-soft bg-surface">
        <div className="container-page grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {error && (
            <p role="alert" className="text-sm">
              Statistik belum dapat diperbarui. Angka terakhir mungkin sudah berubah.
              <button className="ml-3 min-h-11 font-bold text-brand underline" onClick={() => void refetch()}>Muat ulang statistik</button>
            </p>
          )}
          {isPending && <p role="status">Memuat statistik layanan…</p>}
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center gap-4 rounded-lg bg-muted p-3 md:bg-transparent md:p-0"
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-lg ${metric.tone}`}
              >
                <metric.icon size={20} className="text-brand-strong" />
              </span>
              <div>
                <p className="text-2xl leading-tight font-extrabold tracking-tight text-ink-strong">
                  {metric.value}
                </p>
                <p className="text-sm font-medium text-ink">{metric.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-line-soft bg-canvas py-14">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="text-eyebrow text-brand">Keunggulan Sistem</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-ink-strong">
              Dirancang untuk Mobilitas Harian Warga
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              Efisiensi waktu perjalanan Anda dimulai dari transparansi data
              armada angkutan umum.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="flex flex-col rounded-lg border-[0.5px] border-line-soft bg-surface p-4 shadow-card"
              >
                <span
                  className={`grid size-12 place-items-center rounded-lg ${feature.tone}`}
                >
                  <feature.icon size={22} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink-strong">
                  {feature.title}
                </h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink">
                  {feature.description}
                </p>
                <Link
                  to={feature.to}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-strong transition hover:gap-2"
                >
                  {feature.link}
                  <ArrowRight size={13} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="scroll-mt-24 border-b border-line-soft bg-muted py-14">
        <div className="container-page">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-eyebrow text-brand-strong">
              Ekosistem Terintegrasi
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-ink-strong">
              Cara Kerja Angkot-Live
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              Sinergi antara pengguna jalan, pengemudi angkot, dan pengawas
              transportasi kota.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-lg border-[0.5px] border-line-soft bg-surface p-4 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-9 place-items-center rounded-md text-sm font-bold ${pillar.tone}`}
                  >
                    {pillar.number}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink-strong">
                      {pillar.title}
                    </h3>
                    <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">
                      {pillar.eyebrow}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink">
                  {pillar.description}
                </p>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {pillar.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2 text-xs text-ink-strong"
                    >
                      <CheckCircle2
                        size={14}
                        className="mt-0.5 shrink-0 text-brand"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <LandingGuide />

      <section className="bg-canvas py-14">
        <div className="container-page">
          <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-lg bg-brand-strong p-8 shadow-float md:flex-row md:items-center md:p-10">
            <div
              className="pointer-events-none absolute -top-16 right-24 size-80 rounded-full bg-brand/40 blur-2xl"
              aria-hidden
            />
            <div className="relative max-w-xl">
              <p className="text-eyebrow text-brand-soft">
                Siap berangkat sekarang?
              </p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-white">
                Jadikan Perjalanan Kota Lebih Pasti & Nyaman
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Buka peta publik, pilih arah trayek dan periksa kesegaran lokasi.
                Masuk untuk menggunakan Megat dan menyimpan perjalanan.
              </p>
            </div>
            <Button
              size="lg"
              variant="outline"
              className="relative border-transparent bg-white text-brand-strong hover:bg-muted"
              asChild
            >
              <Link to="/peta">
                Lihat Peta Live
                <ArrowRight size={17} />
              </Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-2">
              <MapPin size={14} className="text-brand" /> Bandung, Jawa Barat
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={14} className="text-brand" /> Proyek MIA 2026 · Web In Action
            </span>
            <span className="inline-flex items-center gap-2">
              <BusFront size={14} className="text-brand" /> Untuk penumpang dan pengemudi
            </span>
          </div>
        </div>
      </section>
    </>
  )
}
