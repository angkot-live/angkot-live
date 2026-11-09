import {
  ArrowRight,
  BusFront,
  CheckCircle2,
  Clock3,
  Compass,
  MapPin,
  MessageSquareWarning,
  Radar,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { publicStats } from '@/mocks/data'

const trustBadges = ['Tanpa perlu login', 'Update tiap 3 detik', 'Data Dishub']

const metrics = [
  {
    value: `${publicStats.activeVehicles.toLocaleString('id-ID')}+`,
    label: 'Angkot terpantau aktif',
    tone: 'bg-leaf',
    icon: BusFront,
  },
  {
    value: `${publicStats.routes}`,
    label: 'Trayek terintegrasi',
    tone: 'bg-sky',
    icon: Route,
  },
  {
    value: `${publicStats.followUpRate}%`,
    label: 'Laporan ditindaklanjuti',
    tone: 'bg-peach',
    icon: ShieldCheck,
  },
]

const features = [
  {
    icon: Radar,
    tone: 'bg-brand-soft text-brand-strong',
    title: 'Posisi Realtime',
    description:
      'GPS tracking angkot dengan akurasi tinggi dan radar pergerakan armada langsung di layar tanpa jeda waktu.',
    link: 'Lihat sebaran armada',
    to: '/peta',
  },
  {
    icon: Route,
    tone: 'bg-sky text-sky-ink',
    title: 'Cari Rute & Transit',
    description:
      'Temukan jurusan terdekat menuju tujuan, lengkap dengan estimasi waktu tiba dan opsi transit antar trayek.',
    link: 'Cari rute terbaik',
    to: '/peta?tab=rute',
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
    description: 'Tahu angkot mana yang datang dan kapan tiba, tanpa menunggu buta di jalan.',
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
    description: 'Lihat penumpang yang menunggu di sepanjang rute dan atur status secara transparan.',
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
    description: 'Verifikasi pengemudi, kelola trayek, dan pantau kualitas layanan dari satu dashboard.',
    points: [
      'Verifikasi dokumen pengemudi',
      'Kelola trayek dan titik halte',
      'Tindak lanjuti laporan warga',
    ],
  },
]

function HeroMapPreview() {
  const markers = [
    { code: '08', top: '24%', left: '22%', tone: 'bg-brand-strong text-white' },
    { code: '05', top: '58%', left: '44%', tone: 'bg-sky-ink text-white' },
    { code: '02', top: '16%', left: '68%', tone: 'bg-surface text-ink-strong' },
    { code: '16', top: '70%', left: '18%', tone: 'bg-sky text-sky-ink' },
  ]

  return (
    <div className="relative rounded-xl border border-line-soft bg-surface p-3 shadow-float">
      <div className="relative aspect-[568/516] overflow-hidden rounded-lg bg-muted">
        <svg
          viewBox="0 0 568 516"
          className="absolute inset-0 size-full"
          role="img"
          aria-label="Pratinjau peta sebaran angkot"
        >
          <defs>
            <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M44 0H0V44" fill="none" stroke="#DCE5DA" strokeWidth="1" />
            </pattern>
            <pattern id="grid-lg" width="176" height="176" patternUnits="userSpaceOnUse">
              <rect width="176" height="176" fill="url(#grid)" />
              <path d="M176 0H0V176" fill="none" stroke="#CBD8C8" strokeWidth="1.4" />
            </pattern>
          </defs>
          <rect width="568" height="516" fill="#EEF3EC" />
          <rect width="568" height="516" fill="url(#grid-lg)" />
          <path
            d="M-20 380 C 90 330, 120 250, 230 250 S 400 300, 588 180"
            fill="none"
            stroke="#C3D3C0"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M-20 380 C 90 330, 120 250, 230 250 S 400 300, 588 180"
            fill="none"
            stroke="#F6FBF5"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M90 520 C 130 410, 210 380, 300 330 S 430 220, 500 -20"
            fill="none"
            stroke="#C3D3C0"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M90 520 C 130 410, 210 380, 300 330 S 430 220, 500 -20"
            fill="none"
            stroke="#F6FBF5"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M30 140 C 140 170, 220 120, 330 160 S 470 210, 560 150"
            fill="none"
            stroke="#1F5C3A"
            strokeWidth="4"
            strokeDasharray="10 8"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>

        <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-brand-strong shadow-soft backdrop-blur">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-brand" />
          </span>
          Live Bandung
        </div>
        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-medium text-ink shadow-soft backdrop-blur">
          <ShieldCheck size={13} className="text-brand" />
          GPS presisi 4 m
        </div>

        {markers.map((marker) => (
          <div
            key={marker.code}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ top: marker.top, left: marker.left }}
          >
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold shadow-float ${marker.tone}`}
            >
              {marker.code}
            </span>
            <span className="size-1.5 rounded-full bg-brand-strong/70" />
          </div>
        ))}

        <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-lg bg-white/95 p-3 shadow-float backdrop-blur">
          <span className="grid size-10 place-items-center rounded-md bg-leaf text-brand-strong">
            <Clock3 size={18} />
          </span>
          <div>
            <p className="text-[10px] font-medium text-ink-soft">Angkot 08 menuju Dago</p>
            <p className="text-sm font-bold text-ink-strong">Tiba 3 menit lagi</p>
          </div>
        </div>

        <div className="absolute right-4 bottom-4 flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 shadow-float backdrop-blur">
          <Compass size={16} className="text-brand" />
          <span className="text-[11px] font-semibold text-ink">Ikuti lokasi</span>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
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
            <Badge variant="leaf" className="gap-2 py-1.5">
              <Sparkles size={13} />
              Sistem Informasi Transportasi Publik
            </Badge>

            <h1 className="mt-6 text-4xl leading-[1.15] font-extrabold tracking-tight text-ink-strong md:text-5xl">
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
              Pantau posisi realtime, rute aktif, dan estimasi waktu tiba angkutan kota secara
              presisi tanpa repot menunggu di jalan.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link to="/peta">
                  Mulai Pantau Sekarang
                  <ArrowRight size={17} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/peta?tab=rute">
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
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center gap-4 rounded-lg bg-muted p-3 md:bg-transparent md:p-0"
            >
              <span className={`grid size-12 shrink-0 place-items-center rounded-lg ${metric.tone}`}>
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
              Efisiensi waktu perjalanan Anda dimulai dari transparansi data armada angkutan umum.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="flex flex-col rounded-lg border border-line-soft bg-surface p-6 shadow-soft"
              >
                <span className={`grid size-12 place-items-center rounded-lg ${feature.tone}`}>
                  <feature.icon size={22} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink-strong">{feature.title}</h3>
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
            <p className="text-eyebrow text-brand-strong">Ekosistem Terintegrasi</p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-ink-strong">
              Cara Kerja Angkot-Live
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink">
              Sinergi antara pengguna jalan, pengemudi angkot, dan pengawas transportasi kota.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {pillars.map((pillar) => (
              <article
                key={pillar.title}
                className="rounded-lg border border-line-soft bg-surface p-6 shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid size-9 place-items-center rounded-md text-sm font-bold ${pillar.tone}`}
                  >
                    {pillar.number}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-ink-strong">{pillar.title}</h3>
                    <p className="text-[11px] font-medium tracking-wide text-ink-soft uppercase">
                      {pillar.eyebrow}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink">{pillar.description}</p>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {pillar.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-xs text-ink-strong">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand" />
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
          <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-xl bg-brand-strong p-8 shadow-float md:flex-row md:items-center md:p-10">
            <div
              className="pointer-events-none absolute -top-16 right-24 size-80 rounded-full bg-brand/40 blur-2xl"
              aria-hidden
            />
            <div className="relative max-w-xl">
              <p className="text-eyebrow text-brand-soft">Siap berangkat sekarang?</p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-white">
                Jadikan Perjalanan Kota Lebih Pasti & Nyaman
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Tidak perlu lagi tebak-tebakan jadwal angkot. Akses seluruh armada dari genggaman
                ponsel Anda.
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
              <ShieldCheck size={14} className="text-brand" /> Terintegrasi data Dishub
            </span>
            <span className="inline-flex items-center gap-2">
              <Users size={14} className="text-brand" /> Digunakan warga harian
            </span>
          </div>
        </div>
      </section>
    </>
  )
}
