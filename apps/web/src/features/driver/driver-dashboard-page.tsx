import {
  ArrowRight,
  BusFront,
  Clock3,
  Gauge,
  Inbox,
  MapPin,
  Navigation,
  Radio,
  Route,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge, DriverModeBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/features/auth/auth-store'
import { routes, vehicles } from '@/mocks/data'
import { cn } from '@/lib/cn'
import type { DriverMode } from '@/types'

const vehicle = vehicles[0]
const route = routes[0]

const modes: { value: DriverMode; label: string; icon: typeof Navigation }[] = [
  { value: 'narik', label: 'Narik', icon: Navigation },
  { value: 'ngetem', label: 'Ngetem', icon: Clock3 },
  { value: 'istirahat', label: 'Istirahat', icon: BusFront },
  { value: 'offline', label: 'Offline', icon: Radio },
]

export function DriverDashboardPage() {
  const user = useAuthStore((state) => state.user)
  const [mode, setMode] = useState<DriverMode>('narik')

  return (
    <div className="container-page py-6 md:py-8">
      <Card className="overflow-hidden border-brand/20 bg-gradient-to-br from-leaf/80 via-surface to-surface">
        <CardContent className="p-5 md:p-8">
          <p className="text-sm text-ink">Selamat bertugas,</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-brand-strong md:text-4xl">
            Halo, {user?.name?.split(' ').slice(0, 2).join(' ') ?? 'Pak Asep'}!
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="leaf" className="gap-1.5">
              <Route size={12} />
              {route?.code} · {route?.name}
            </Badge>
            <Badge variant="outline">{vehicle?.plate}</Badge>
          </div>
          <p className="mt-2 text-xs text-ink">
            Koperasi Angkutan Bandung · Shift pagi · Jurusan {route?.code}
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-eyebrow text-ink-soft">Status operasional angkot</p>
              <p className="mt-1 text-sm font-bold text-ink-strong">Pilih mode kerja sekarang</p>
            </div>
            <DriverModeBadge mode={mode} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {modes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setMode(item.value)
                  toast.info(`Mode ${item.label} aktif`)
                }}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-md border px-3 py-3 text-xs font-bold transition',
                  mode === item.value
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-muted text-ink hover:border-brand/40',
                )}
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-ink">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-brand" />
              GPS aktif
            </span>
            <span>Telemetri terkirim 2 detik lalu</span>
            <span>Sinyal 4G kuat</span>
            <span className="ml-auto flex items-center gap-1">
              <MapPin size={11} className="text-brand" />
              Akurasi ±3 meter
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <span className="grid size-9 place-items-center rounded-md bg-leaf text-brand-strong">
                <Gauge size={17} />
              </span>
              <Badge variant="neutral">Ritase 4</Badge>
            </div>
            <p className="mt-4 text-xs text-ink">Jarak hari ini</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink-strong">
              42 <span className="text-sm font-semibold text-ink">km</span>
            </p>
            <p className="mt-1 text-[11px] text-ink-soft">Target harian 55 km</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[76%] rounded-full bg-brand" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <span className="grid size-9 place-items-center rounded-md bg-leaf text-brand-strong">
                <Clock3 size={17} />
              </span>
              <Badge variant="leaf">Aktif</Badge>
            </div>
            <p className="mt-4 text-xs text-ink">Jam narik</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink-strong">
              6 <span className="text-sm font-semibold text-ink">j</span> 20{' '}
              <span className="text-sm font-semibold text-ink">m</span>
            </p>
            <p className="mt-1 text-[11px] text-ink-soft">Mulai 06.00 WIB · shift pagi</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="transition hover:border-brand/40">
          <Link to="/pengemudi">
            <CardContent className="flex items-center gap-3 p-4 md:p-5">
              <span className="grid size-10 place-items-center rounded-md bg-muted text-brand-strong">
                <MapPin size={18} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink-strong">Pantau titik penumpang</p>
                <p className="text-xs text-ink">Peta live Bandung Kota · {3} penumpang megat</p>
              </div>
              <ArrowRight size={16} className="text-ink-soft" />
            </CardContent>
          </Link>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4 md:p-5">
            <span className="grid size-10 place-items-center rounded-md bg-muted text-brand-strong">
              <Inbox size={18} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink-strong">Inbox pengemudi</p>
              <p className="text-xs text-ink">2 pesan belum dibaca</p>
            </div>
            <Badge variant="sky">2</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Trip selesai', value: '8', icon: BusFront },
          { label: 'Penumpang', value: '34', icon: Navigation },
          { label: 'Tip diterima', value: 'Rp 15k', icon: Wallet },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-8 place-items-center rounded-md bg-leaf text-brand-strong">
                <stat.icon size={15} />
              </span>
              <div>
                <p className="text-base leading-none font-extrabold text-ink-strong">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] text-ink">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="ghost" size="sm" className="mt-4" asChild>
        <Link to="/pengemudi/profil">
          Lihat profil & dokumen kendaraan
          <ArrowRight size={13} />
        </Link>
      </Button>
    </div>
  )
}
