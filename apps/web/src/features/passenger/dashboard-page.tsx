import {
  ArrowRight,
  Bell,
  BusFront,
  CalendarDays,
  Clock3,
  FileWarning,
  Footprints,
  MapPin,
  Navigation,
  Route,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/features/auth/auth-store'
import { notifications, trips } from '@/mocks/passenger'
import { cn } from '@/lib/cn'

const today = new Date()

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

export function PassengerDashboardPage() {
  const user = useAuthStore((state) => state.user)
  const completed = trips.filter((trip) => trip.status === 'selesai')
  const totalDistance = completed.reduce((total, trip) => total + trip.distanceKm, 0)
  const totalFare = completed.reduce((total, trip) => total + trip.fare, 0)
  const lastTrip = completed[0]
  const unread = notifications.filter((item) => item.unread).length

  const routeCounts = completed.reduce<Record<string, number>>((counts, trip) => {
    counts[trip.routeCode] = (counts[trip.routeCode] ?? 0) + 1
    return counts
  }, {})
  const favoriteCode = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '08'

  return (
    <div className="container-page py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand">
            <CalendarDays size={12} />
            {formatDate(today.toISOString())}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Selamat pagi, {user?.name.split(' ')[0] ?? 'Penumpang'}
          </h1>
          <p className="mt-1 text-sm text-ink">
            Ringkasan perjalanan dan aktivitas angkotmu hari ini.
          </p>
        </div>
        <Button asChild>
          <Link to="/penumpang">
            <Navigation size={15} />
            Mulai perjalanan
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Perjalanan selesai', value: completed.length.toString(), note: 'Total sepanjang waktu', icon: Route, tone: 'bg-leaf text-brand-strong' },
          { label: 'Total jarak', value: `${totalDistance.toFixed(1)} km`, note: 'Naik angkot', icon: Footprints, tone: 'bg-sky text-sky-ink' },
          { label: 'Trayek favorit', value: favoriteCode, note: 'Sering dinaiki', icon: BusFront, tone: 'bg-peach text-amber-900' },
          { label: 'Total tarif', value: `Rp ${(totalFare / 1000).toFixed(0)}rb`, note: 'Perjalanan selesai', icon: Wallet, tone: 'bg-brand text-white' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold text-ink">{stat.label}</p>
                <span className={cn('grid size-8 place-items-center rounded-md', stat.tone)}>
                  <stat.icon size={15} />
                </span>
              </div>
              <p className="mt-2 text-2xl leading-none font-extrabold text-ink-strong">{stat.value}</p>
              <p className="mt-1 text-[10px] text-ink-soft">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-brand-strong via-brand to-emerald-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <Badge className="bg-white/20 text-white">
                    <Sparkles size={10} />
                    Perjalanan terakhir
                  </Badge>
                  <span className="text-[10px] text-white/75">
                    {lastTrip ? formatDate(lastTrip.date) : '-'}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-white/70">
                      Trayek {lastTrip?.routeCode} · {lastTrip ? formatTime(lastTrip.date) : '-'}
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold">{lastTrip?.routeName}</h2>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-white/80">
                      <MapPin size={11} />
                      {lastTrip?.from} → {lastTrip?.to}
                    </p>
                  </div>
                  <div className="rounded-md bg-white/15 px-3 py-2 text-center backdrop-blur">
                    <p className="text-lg leading-none font-extrabold">{lastTrip?.durationMinutes ?? 0}</p>
                    <p className="text-[9px] text-white/75">menit</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-line-soft">
                {[
                  { label: 'Jarak', value: `${lastTrip?.distanceKm ?? 0} km` },
                  { label: 'Tarif', value: `Rp ${(lastTrip?.fare ?? 0).toLocaleString('id-ID')}` },
                  { label: 'Status', value: 'Selesai' },
                ].map((item) => (
                  <div key={item.label} className="p-3 text-center">
                    <p className="text-[9px] text-ink-soft">{item.label}</p>
                    <p className="text-xs font-bold text-ink-strong">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { title: 'Cari rute', detail: 'Rekomendasi jurusan + ETA', icon: Route, to: '/rute', tone: 'bg-leaf text-brand-strong' },
              { title: 'Buka peta', detail: 'Lihat angkot sekitar', icon: MapPin, to: '/penumpang', tone: 'bg-sky text-sky-ink' },
              { title: 'Buat laporan', detail: 'Laporkan masalah angkot', icon: FileWarning, to: '/penumpang/lapor', tone: 'bg-peach text-amber-900' },
            ].map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-surface p-3 shadow-soft transition hover:border-brand/40 hover:bg-muted/30"
              >
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-md', action.tone)}>
                  <action.icon size={16} />
                </span>
                <span>
                  <span className="block text-[11px] font-bold text-ink-strong">{action.title}</span>
                  <span className="block text-[9px] text-ink">{action.detail}</span>
                </span>
              </Link>
            ))}
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-ink-strong">Perjalanan terbaru</h2>
                <Link
                  to="/penumpang/riwayat"
                  className="flex items-center gap-1 text-[10px] font-semibold text-brand-strong hover:underline"
                >
                  Lihat semua
                  <ArrowRight size={11} />
                </Link>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                {completed.slice(0, 3).map((trip) => (
                  <Link
                    key={trip.id}
                    to="/penumpang/riwayat"
                    className="flex items-center gap-3 rounded-md border border-line-soft p-2.5 transition hover:border-brand/40 hover:bg-muted/30"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-leaf text-[11px] font-extrabold text-brand-strong">
                      {trip.routeCode}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-ink-strong">{trip.routeName}</p>
                      <p className="text-[9px] text-ink">
                        {trip.from} → {trip.to} · {trip.distanceKm} km
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold text-ink-strong">
                        {formatTime(trip.date)}
                      </p>
                      <p className="text-[9px] text-ink-soft">{formatDate(trip.date).split(',')[0]}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                  <Bell size={14} className="text-brand" />
                  Notifikasi
                </h2>
                {unread > 0 ? <Badge variant="danger">{unread} baru</Badge> : null}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {notifications.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    to="/penumpang/notifikasi"
                    className="rounded-md border border-line-soft p-2.5 transition hover:border-brand/40 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-1.5">
                      {item.unread ? <span className="size-1.5 rounded-full bg-brand" /> : null}
                      <p className="text-[10px] font-bold text-ink-strong">{item.title}</p>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[9px] text-ink">{item.body}</p>
                    <p className="mt-1 flex items-center gap-1 text-[8px] text-ink-soft">
                      <Clock3 size={8} />
                      {item.time}
                    </p>
                  </Link>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                <Link to="/penumpang/notifikasi">Buka semua notifikasi</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-leaf/50">
            <CardContent className="p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-brand-strong">
                <BusFront size={14} />
                Trayek favoritmu
              </p>
              <p className="mt-1 text-2xl font-extrabold text-ink-strong">Trayek {favoriteCode}</p>
              <p className="mt-0.5 text-[10px] text-ink">
                Kamu paling sering naik trayek ini. Lihat jadwal dan halte terdekat.
              </p>
              <Button size="sm" className="mt-2 w-full" asChild>
                <Link to={`/trayek`}>
                  Lihat detail trayek
                  <ArrowRight size={12} />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
