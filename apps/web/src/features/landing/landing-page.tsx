import {
  ArrowRight,
  BusFront,
  CheckCircle2,
  MapPin,
  MessageSquareWarning,
  Radar,
  Route,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { usePublicStatistics } from '@/features/public/use-statistics'
import { useRoutes } from '@/features/routes/use-routes'
import { useLiveVehicles } from '@/features/tracking/use-live-vehicles'

const trustBadges = [
  'Tanpa perlu login',
  'Update tiap 3 detik',
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
      'Tahu angkot mana yang datang dan kapan tiba, tanpa menunggu buta di jalan.',
    points: [
      'Pilih halte atau titik tujuan terdekat',
      'Pantau laju angkot dan estimasi tiba',
      'Naik tepat waktu tanpa menunggu lama',
    ],
  },
  {
    number: '2',
    tone: 'bg-sky text-sky-ink',
    eyebrow: 'Penghasilan Stabil',
    title: 'Pengemudi',
    description:
      'Lihat penumpang yang menunggu di sepanjang rute dan atur status secara transparan.',
    points: [
      'Terima informasi penumpang di area rute',
      'Atur status narik, ngetem, dan istirahat',
      'Bangun reputasi lewat layanan yang terukur',
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

function HeroMapPreview() {
  const { routes } = useRoutes(),
    vehicles = useLiveVehicles().filter((v) => !v.stale)
  const points = routes.flatMap((r) => (r.segments ?? [r.polyline]).flat())
  const minLat = points.length ? Math.min(...points.map((p) => p[0])) : -7,
    maxLat = points.length ? Math.max(...points.map((p) => p[0])) : -6.8
  const minLng = points.length ? Math.min(...points.map((p) => p[1])) : 107.5,
    maxLng = points.length ? Math.max(...points.map((p) => p[1])) : 107.8
  const project = (p: [number, number]) => [
    20 + ((p[1] - minLng) / Math.max(0.001, maxLng - minLng)) * 528,
    20 + ((maxLat - p[0]) / Math.max(0.001, maxLat - minLat)) * 476,
  ]
  return (
    <div className="relative rounded-xl border border-line-soft bg-surface p-4 shadow-float">
      <svg
        viewBox="0 0 568 516"
        role="img"
        aria-label="Trayek dan GPS angkot dari layanan"
        className="w-full rounded-lg bg-muted"
      >
        {routes.flatMap((r) =>
          (r.segments ?? [r.polyline]).map((line, i) => (
            <polyline
              key={`${r.id}-${i}`}
              points={line.map((p) => project(p).join(',')).join(' ')}
              fill="none"
              stroke={r.color}
              strokeWidth="1.5"
              opacity=".5"
            />
          )),
        )}
        {vehicles.map((v) => (
          <circle
            key={v.id}
            cx={project(v.position)[0]}
            cy={project(v.position)[1]}
            r="5"
            fill="#004425"
          />
        ))}
      </svg>
      <p className="mt-3 text-sm">
        {vehicles.length
          ? `${vehicles.length} angkot dengan GPS aktif`
          : 'Belum ada angkot dengan GPS aktif.'}
      </p>
      <Link to="/peta" className="mt-2 block text-sm font-bold text-brand">
        Buka peta langsung →
      </Link>
    </div>
  )
}

export function LandingPage() {
  const { data, error } = usePublicStatistics()
  const metrics = [
    {
      value: data ? data.activeVehicles.toLocaleString('id-ID') : '—',
      label: 'Angkot terpantau aktif',
      tone: 'bg-leaf',
      icon: BusFront,
    },
    {
      value: data ? String(data.routeCodes) : '—',
      label: 'Trayek terintegrasi',
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
              Lacak Angkot,
              <br />
              <span className="relative inline-block text-brand">
                Langsung dari Layar
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
              Pantau posisi realtime, rute aktif, dan estimasi waktu tiba
              angkutan kota secara presisi tanpa repot menunggu di jalan.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link to="/peta">
                  Mulai Pantau Sekarang
                  <ArrowRight size={17} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/peta">
                  <Route size={17} />
                  Cari Rute
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

          <HeroMapPreview />
        </div>
      </section>

      <section className="border-b border-line-soft bg-surface">
        <div className="container-page grid gap-3 py-6 md:grid-cols-3">
          {error && (
            <p role="alert" className="text-sm">
              Statistik belum dapat dimuat: {error.message}
            </p>
          )}
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

      <section className="border-b border-line-soft bg-muted py-14">
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
                Tidak perlu lagi tebak-tebakan jadwal angkot. Akses seluruh
                armada dari genggaman ponsel Anda.
              </p>
            </div>
            <Button
              size="lg"
              variant="outline"
              className="relative border-transparent bg-white text-brand-strong hover:bg-muted"
              asChild
            >
              <Link to="/peta">
                Mulai Pantau Sekarang
                <ArrowRight size={17} />
              </Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-ink-soft">
            <span className="inline-flex items-center gap-2">
              <MapPin size={14} className="text-brand" /> Bandung, Jawa Barat
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={14} className="text-brand" /> Terintegrasi data
              Dishub
            </span>
            <span className="inline-flex items-center gap-2">
              <Users size={14} className="text-brand" /> Untuk penumpang dan pengemudi
            </span>
          </div>
        </div>
      </section>
    </>
  )
}
