import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Footprints,
  LayoutDashboard,
  Route,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { trips } from '@/mocks/passenger'
import { cn } from '@/lib/cn'

const filters = [
  { label: 'Semua', value: 'semua' },
  { label: 'Selesai', value: 'selesai' },
  { label: 'Dibatalkan', value: 'dibatalkan' },
] as const

type Filter = (typeof filters)[number]['value']

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function HistoryPage() {
  const [filter, setFilter] = useState<Filter>('semua')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(
    () => trips.filter((trip) => filter === 'semua' || trip.status === filter),
    [filter],
  )

  const completed = trips.filter((trip) => trip.status === 'selesai')
  const totalDistance = completed.reduce((total, trip) => total + trip.distanceKm, 0)
  const totalFare = completed.reduce((total, trip) => total + trip.fare, 0)

  return (
    <div className="container-page py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-eyebrow text-brand">Aktivitas</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Riwayat perjalanan
          </h1>
          <p className="mt-1 text-sm text-ink">
            Semua perjalanan angkot yang tercatat di akunmu.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/penumpang/dashboard">
              <LayoutDashboard size={15} />
              Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/penumpang">
              <Route size={15} />
              Buka peta
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Perjalanan selesai', value: completed.length.toString(), icon: Route },
          {
            label: 'Total jarak',
            value: `${totalDistance.toFixed(1)} km`,
            icon: Footprints,
          },
          {
            label: 'Total tarif',
            value: `Rp ${totalFare.toLocaleString('id-ID')}`,
            icon: Wallet,
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

      <div className="mt-5 flex flex-wrap gap-1.5">
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

      <div className="mt-4 flex flex-col gap-3">
        {filtered.map((trip) => {
          const expanded = expandedId === trip.id
          const legs = trip.legs ?? [
            {
              routeCode: trip.routeCode,
              routeName: trip.routeName,
              from: trip.from,
              to: trip.to,
              durationMinutes: trip.durationMinutes,
              fare: trip.fare,
              boardAt: trip.from,
              alightAt: trip.to,
            },
          ]

          return (
          <Card key={trip.id}>
            <CardContent className="p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-strong text-xs font-extrabold text-white">
                    {trip.routeCode}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink-strong">{trip.routeName}</p>
                    <p className="text-[11px] text-ink">
                      {trip.from} → {trip.to}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-soft">
                      <CalendarDays size={11} />
                      {formatDate(trip.date)} · {formatTime(trip.date)}
                    </p>
                  </div>
                </div>
                <Badge variant={trip.status === 'selesai' ? 'leaf' : 'neutral'}>
                  {trip.status === 'selesai' ? 'Selesai' : 'Dibatalkan'}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft pt-3 text-[11px] text-ink">
                <span className="flex items-center gap-1.5">
                  <Clock3 size={12} className="text-brand" />
                  {trip.status === 'selesai' ? `${trip.durationMinutes} menit` : 'Tidak berjalan'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Footprints size={12} className="text-brand" />
                  {trip.distanceKm.toFixed(1)} km
                </span>
                <span className="flex items-center gap-1.5">
                  <Wallet size={12} className="text-brand" />
                  Rp {trip.fare.toLocaleString('id-ID')}
                </span>
                <span className="ml-auto text-ink-soft">{trip.code}</span>
              </div>

              {expanded ? (
                <div className="mt-3 rounded-md border border-line-soft bg-muted/40 p-3">
                  <p className="text-[10px] font-semibold text-ink-strong">Rincian perjalanan</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {legs.map((leg, index) => (
                      <div
                        key={`${leg.routeCode}-${index}`}
                        className="flex flex-wrap items-start gap-2 rounded-md bg-surface p-2.5"
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded bg-brand-strong text-[10px] font-extrabold text-white">
                          {leg.routeCode}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-ink-strong">
                            {leg.routeName}
                          </p>
                          <p className="text-[10px] text-ink">
                            Naik di {leg.boardAt} -&gt; turun di {leg.alightAt}
                          </p>
                        </div>
                        <div className="text-right text-[10px] text-ink">
                          <p className="font-semibold text-ink-strong">
                            {leg.durationMinutes} menit
                          </p>
                          <p>Rp {leg.fare.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedId(expanded ? null : trip.id)}
                >
                  {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {expanded ? 'Tutup detail' : 'Detail perjalanan'}
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/penumpang/lapor">
                    Laporkan perjalanan ini
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
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <Route size={26} className="text-ink-soft" />
              <p className="text-sm font-semibold text-ink-strong">Belum ada perjalanan</p>
              <p className="text-xs text-ink">Coba pilih filter lain atau mulai naik angkot.</p>
              <Button size="sm" variant="outline" onClick={() => setFilter('semua')}>
                Reset filter
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
