import {
  ArrowDownUp,
  ArrowRight,
  BusFront,
  CheckCircle2,
  Clock3,
  Footprints,
  MapPin,
  Navigation,
  Search,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Badge, VehicleStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { routes, vehicles } from '@/mocks/data'

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function RouteTimeline({
  first,
  second,
  transferAt,
  from,
  to,
}: {
  first: (typeof routes)[number]
  second?: (typeof routes)[number]
  transferAt?: string
  from: string
  to: string
}) {
  const steps = [
    {
      icon: Footprints,
      title: 'Jalan kaki ke halte',
      detail: `Halte ${from} · 2 menit`,
      tone: 'bg-leaf text-brand-strong',
    },
    {
      icon: BusFront,
      title: `Naik angkot ${first.code}`,
      detail: `${first.origin} → ${transferAt ?? first.destination}`,
      tone: 'bg-brand text-white',
    },
    ...(second
      ? [
          {
            icon: ArrowDownUp,
            title: `Transit di ${transferAt}`,
            detail: 'Pindah angkot · 3 menit',
            tone: 'bg-sky text-sky-ink',
          },
          {
            icon: BusFront,
            title: `Naik angkot ${second.code}`,
            detail: `${second.origin} → ${second.destination}`,
            tone: 'bg-brand text-white',
          },
        ]
      : []),
    {
      icon: MapPin,
      title: 'Tiba di tujuan',
      detail: `${to} · 1 menit jalan kaki`,
      tone: 'bg-peach text-amber-900',
    },
  ]

  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`grid size-8 shrink-0 place-items-center rounded-md ${step.tone}`}>
              <step.icon size={15} />
            </span>
            {index < steps.length - 1 ? <span className="my-1 w-px flex-1 bg-line" /> : null}
          </div>
          <div className={index < steps.length - 1 ? 'pb-4' : ''}>
            <p className="text-xs font-bold text-ink-strong">{step.title}</p>
            <p className="text-[11px] text-ink">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function SearchRoutePage() {
  const [searchParams] = useSearchParams()
  const [from, setFrom] = useState(
    searchParams.get('from') ?? (searchParams.get('to') ? '' : 'Stasiun Hall'),
  )
  const [to, setTo] = useState(searchParams.get('to') ?? 'Dago')
  const [searched, setSearched] = useState(true)

  const fromTerm = normalize(from)
  const toTerm = normalize(to)
  const directResults = routes
    .filter((route) => {
      const haystack = normalize(`${route.name} ${route.origin} ${route.destination}`)
      const matchesFrom = !fromTerm || haystack.includes(fromTerm)
      const matchesTo = !toTerm || haystack.includes(toTerm)
      return matchesFrom && matchesTo
    })
    .map((route, index) => ({
      route,
      eta: 4 + index * 3,
      duration: 12 + index * 6,
      stops: 6 + index * 3,
      walk: 2 + index * 2,
      status: index === 0 ? ('jalan' as const) : ('merayap' as const),
      note:
        index === 0
          ? `Turun di ${route.destination}, 2 menit jalan kaki ke tujuan.`
          : `Alternatif menuju ${route.destination} jika armada pertama penuh.`,
    }))

  const fromRoute = routes.find((route) =>
    normalize(`${route.name} ${route.origin} ${route.destination}`).includes(fromTerm),
  )
  const toRoute = routes.find(
    (route) =>
      route.id !== fromRoute?.id &&
      normalize(`${route.name} ${route.origin} ${route.destination}`).includes(toTerm),
  )
  const transferOption =
    fromRoute && toRoute && fromTerm && toTerm
      ? {
          first: fromRoute,
          second: toRoute,
          transferAt: fromRoute.destination,
          duration: 24,
          walk: 5,
        }
      : null

  function handleSwap() {
    setFrom(to)
    setTo(from)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearched(true)
  }

  return (
    <div className="container-page py-8 md:py-10">
      <div className="max-w-2xl">
        <Badge variant="leaf" className="gap-1.5">
          <Sparkles size={13} />
          Rekomendasi jurusan
        </Badge>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-strong md:text-4xl">
          Cari rute menuju tujuan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          Masukkan titik asal dan tujuan. Kami carikan jurusan angkot terdekat beserta estimasi
          waktu tiba.
        </p>
      </div>

      <Card className="mt-6 max-w-4xl">
        <CardContent className="p-4 md:p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="route-from" className="text-xs font-semibold text-ink-strong">
                  Titik asal
                </label>
                <Input
                  id="route-from"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  icon={<MapPin size={16} />}
                  placeholder="Lokasi atau halte asal"
                />
              </div>

              <Button
                type="button"
                variant="soft"
                size="icon"
                className="mx-auto mb-0.5"
                aria-label="Tukar asal dan tujuan"
                onClick={handleSwap}
              >
                <ArrowDownUp size={16} />
              </Button>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="route-to" className="text-xs font-semibold text-ink-strong">
                  Tujuan
                </label>
                <Input
                  id="route-to"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  icon={<Navigation size={16} />}
                  placeholder="Lokasi tujuan"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="md:w-auto">
              <Search size={16} />
              Cari Rute
            </Button>
          </form>
        </CardContent>
      </Card>

      {searched ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink-strong">
                  {directResults.length} jurusan langsung ditemukan
                </h2>
                <p className="text-xs text-ink">
                  {from} → {to} · diurutkan berdasarkan waktu tiba tercepat
                </p>
              </div>
              <Badge variant={directResults.length > 0 ? 'leaf' : 'peach'}>
                <CheckCircle2 size={12} />
                {directResults.length > 0 ? 'Rute langsung' : 'Perlu transit'}
              </Badge>
            </div>

            {directResults.map((item, index) => (
              <Card key={item.route.id} className={index === 0 ? 'border-brand/40' : ''}>
                <CardContent className="flex flex-col gap-4 p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className="grid size-11 shrink-0 place-items-center rounded-md text-sm font-extrabold text-white"
                        style={{ backgroundColor: item.route.color }}
                      >
                        {item.route.code}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-ink-strong">
                            {item.route.name}
                          </h3>
                          {index === 0 ? <Badge variant="leaf">Tercepat</Badge> : null}
                          <VehicleStatusBadge status={item.status} />
                        </div>
                        <p className="mt-1 text-xs text-ink">{item.note}</p>
                      </div>
                    </div>
                    <div className="rounded-md bg-leaf px-3 py-2 text-center">
                      <p className="text-xl leading-none font-extrabold text-brand-strong">
                        {item.eta}
                      </p>
                      <p className="text-[10px] text-brand-strong/70">menit lagi</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line-soft pt-3 text-[11px] text-ink">
                    <span className="flex items-center gap-1.5">
                      <Clock3 size={13} className="text-brand" />
                      {item.duration} menit perjalanan
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BusFront size={13} className="text-brand" />
                      {item.stops} halte
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Footprints size={13} className="text-brand" />
                      {item.walk} menit jalan kaki
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-brand" />
                      {vehicles.filter((vehicle) => vehicle.routeId === item.route.id).length} angkot
                      aktif
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" asChild>
                      <Link to={`/peta?route=${item.route.id}`}>
                        <MapPin size={14} />
                        Lihat di peta
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/peta?route=${item.route.id}&to=${encodeURIComponent(to)}`}>
                        <Navigation size={14} />
                        Pandu ke halte
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {directResults.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                  <MapPin size={26} className="text-ink-soft" />
                  <p className="text-sm font-semibold text-ink-strong">
                    Tidak ada jurusan langsung
                  </p>
                  <p className="text-xs text-ink">
                    Coba gunakan alternatif transfer di bawah atau ubah titik tujuan.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {transferOption ? (
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-ink-strong">
                      Alternatif transfer 2 angkot
                    </h3>
                    <p className="text-xs text-ink">
                      {transferOption.first.code} → {transferOption.second.code} · transit di{' '}
                      {transferOption.transferAt}
                    </p>
                  </div>
                  <Badge variant="sky">Hemat 4 menit</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink">
                  <span className="rounded-md bg-muted px-2 py-1 font-semibold">
                    {transferOption.first.code}
                  </span>
                  <ArrowRight size={13} />
                  <span className="rounded-md bg-muted px-2 py-1 font-semibold">
                    {transferOption.second.code}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <Clock3 size={13} className="text-brand" />
                    {transferOption.duration} menit · {transferOption.walk} menit jalan kaki
                  </span>
                </div>
              </CardContent>
            </Card>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-ink-strong">Rute perjalanan</h3>
                <p className="mb-4 text-xs text-ink">
                  Rekomendasi tercepat · angkot {directResults[0]?.route.code ?? routes[0].code}
                </p>
                <RouteTimeline first={directResults[0]?.route ?? routes[0]} from={from} to={to} />
              </CardContent>
            </Card>

            <Card className="bg-brand-strong text-white">
              <CardContent className="p-5">
                <p className="text-eyebrow text-brand-soft">Tips perjalanan</p>
                <p className="mt-2 text-sm leading-relaxed text-white/90">
                  Aktifkan lokasi agar ETA lebih akurat dan pengemudi bisa melihat Anda menunggu di
                  halte.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-transparent bg-white text-brand-strong hover:bg-muted"
                  asChild
                >
                  <Link to="/peta">
                    Buka peta live
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
