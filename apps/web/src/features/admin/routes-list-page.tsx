import {
  AlertTriangle,
  ArrowRight,
  BusFront,
  CheckCircle2,
  Download,
  MapPinned,
  Pencil,
  Plus,
  Route,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { routes } from '@/mocks/data'
import { cn } from '@/lib/cn'
import type { RouteInfo } from '@/types'

const routeMeta: Record<
  string,
  { length: string; stops: number; vehicles: number; status: 'aktif' | 'insidental' | 'nonaktif'; onTime: number }
> = {
  'r-08': { length: '12,4 km', stops: 18, vehicles: 24, status: 'aktif', onTime: 96 },
  'r-05': { length: '14,1 km', stops: 21, vehicles: 18, status: 'aktif', onTime: 94 },
  'r-02': { length: '10,8 km', stops: 16, vehicles: 22, status: 'aktif', onTime: 91 },
  'r-16': { length: '15,6 km', stops: 23, vehicles: 12, status: 'insidental', onTime: 88 },
  'r-23': { length: '9,7 km', stops: 14, vehicles: 9, status: 'nonaktif', onTime: 82 },
}

const statusMeta = {
  aktif: { label: 'Aktif', variant: 'leaf' as const },
  insidental: { label: 'Insidental', variant: 'peach' as const },
  nonaktif: { label: 'Nonaktif', variant: 'neutral' as const },
}

function getRouteMeta(route: RouteInfo) {
  return (
    routeMeta[route.id] ?? {
      length: `${(route.polyline.length * 0.02).toFixed(1)} km`,
      stops: route.endstops?.length ?? 0,
      vehicles: 0,
      status: 'aktif' as const,
      onTime: 90,
    }
  )
}

export function RoutesListPage() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'semua' | 'aktif' | 'insidental' | 'nonaktif'>('semua')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return routes.filter((route) => {
      const meta = getRouteMeta(route)
      const matchesStatus = status === 'semua' || meta?.status === status
      const matchesQuery =
        !term ||
        route.code.includes(term) ||
        route.name.toLowerCase().includes(term) ||
        route.origin.toLowerCase().includes(term) ||
        route.destination.toLowerCase().includes(term)
      return matchesStatus && matchesQuery
    })
  }, [query, status])

  const deleting = routes.find((route) => route.id === deleteId)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Perizinan trayek angkutan kota</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Manajemen trayek angkot
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink">
            Kelola data jalur, titik halte, armada terdaftar, dan status operasional seluruh trayek
            angkutan kota Bandung.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download size={14} />
            Ekspor data
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus size={14} />
                Tambah trayek baru
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah trayek baru</DialogTitle>
                <DialogDescription>
                  Daftarkan jalur angkot baru. Data dapat disunting setelah trayek dibuat.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="new-route-code" className="text-[11px] font-semibold text-ink">
                    Kode trayek
                  </label>
                  <Input id="new-route-code" placeholder="Contoh: 31" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="new-route-origin" className="text-[11px] font-semibold text-ink">
                      Titik awal
                    </label>
                    <Input id="new-route-origin" placeholder="Terminal" className="mt-1" />
                  </div>
                  <div>
                    <label htmlFor="new-route-dest" className="text-[11px] font-semibold text-ink">
                      Titik akhir
                    </label>
                    <Input id="new-route-dest" placeholder="Terminal" className="mt-1" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => toast.success('Trayek baru ditambahkan', { description: 'Lengkapi titik halte pada editor trayek.' })}
                >
                  Simpan trayek
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Total trayek', value: '34', note: '5 trayek contoh ditampilkan', icon: Route, tone: 'bg-leaf text-brand-strong' },
          { label: 'Trayek aktif', value: '32', note: '2 trayek nonaktif', icon: CheckCircle2, tone: 'bg-brand text-white' },
          { label: 'Armada terdaftar', value: '186', note: '124 unit beroperasi', icon: BusFront, tone: 'bg-sky text-sky-ink' },
          { label: 'Ketepatan jadwal', value: '94,8%', note: '+2,1% dari bulan lalu', icon: TrendingUp, tone: 'bg-peach text-amber-900' },
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

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-line-soft pb-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Semua trayek', value: 'semua' },
                { label: 'Aktif', value: 'aktif' },
                { label: 'Insidental', value: 'insidental' },
                { label: 'Nonaktif', value: 'nonaktif' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatus(item.value as typeof status)}
                  className={cn(
                    'rounded-md px-3 py-2 text-[11px] font-semibold transition',
                    status === item.value ? 'bg-brand-strong text-white' : 'text-ink hover:bg-muted',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <Input
                icon={<Search size={14} />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari kode atau nama trayek"
                aria-label="Cari trayek"
                className="h-9 md:w-64"
              />
            </div>
          </div>

          <div className="mt-3 hidden grid-cols-[70px_1fr_150px_90px_90px_110px_100px_70px] gap-2 px-2 text-[9px] font-bold tracking-wide text-ink-soft uppercase lg:grid">
            <span>Kode</span>
            <span>Nama trayek</span>
            <span>Rute</span>
            <span>Panjang</span>
            <span>Halte</span>
            <span>Armada</span>
            <span>Status</span>
            <span>Aksi</span>
          </div>

          <div className="mt-1 flex flex-col gap-1.5">
            {filtered.map((route) => {
              const meta = getRouteMeta(route)
              const stat = statusMeta[meta.status]
              return (
                <div
                  key={route.id}
                  className="grid gap-2 rounded-md border border-line-soft p-3 transition hover:border-brand/40 hover:bg-muted/30 lg:grid-cols-[70px_1fr_150px_90px_90px_110px_100px_70px] lg:items-center"
                >
                  <div>
                    <span
                      className="inline-grid min-w-9 place-items-center rounded-md px-1.5 py-1 text-[11px] font-extrabold text-white"
                      style={{ backgroundColor: route.color }}
                    >
                      {route.code}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-ink-strong">{route.name}</p>
                    <p className="text-[9px] text-ink-soft">Diperbarui 2 hari lalu</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-soft">Arah perjalanan</p>
                    <p className="text-[10px] font-semibold text-ink-strong">
                      {route.origin} → {route.destination}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-soft">Panjang</p>
                    <p className="text-[11px] font-semibold text-ink-strong">{meta.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-soft">Halte</p>
                    <p className="text-[11px] font-semibold text-ink-strong">{meta.stops} titik</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-soft">Armada</p>
                    <p className="text-[11px] font-semibold text-ink-strong">{meta.vehicles} unit</p>
                    <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${meta.onTime}%` }} />
                    </div>
                  </div>
                  <div>
                    <Badge variant={stat.variant}>{stat.label}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit trayek ${route.code}`} asChild>
                      <Link to={`/admin/trayek/${route.id}`}>
                        <Pencil size={13} />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-danger"
                      aria-label={`Hapus trayek ${route.code}`}
                      onClick={() => setDeleteId(route.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink">Tidak ada trayek yang cocok.</p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3 text-[10px] text-ink">
            <span>Menampilkan {filtered.length} dari {routes.length} trayek contoh</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled>Sebelumnya</Button>
              <Button variant="soft" size="sm">1</Button>
              <Button variant="outline" size="sm">2</Button>
              <Button variant="outline" size="sm">Berikutnya</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-ink-strong">
              <MapPinned size={14} className="text-brand" />
              Peta sebaran trayek
            </p>
            <div className="mt-2 h-24 overflow-hidden rounded-md bg-gradient-to-br from-leaf via-muted to-sky p-2">
              <div className="flex h-full flex-wrap content-center justify-center gap-1">
                {routes.map((route) => (
                  <span key={route.id} className="rounded-full px-2 py-1 text-[9px] font-bold text-white" style={{ backgroundColor: route.color }}>
                    {route.code}
                  </span>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
              <Link to="/admin/monitoring">
                Buka monitoring
                <ArrowRight size={12} />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold text-ink-strong">Armada per status</p>
            <div className="mt-2 flex flex-col gap-2">
              {[
                { label: 'Jalan', value: 78, tone: 'bg-brand' },
                { label: 'Ngetem', value: 21, tone: 'bg-info' },
                { label: 'Merayap', value: 15, tone: 'bg-warning' },
                { label: 'Offline', value: 34, tone: 'bg-ink-soft' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[10px] text-ink">
                    <span>{item.label}</span>
                    <span className="font-bold text-ink-strong">{item.value}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full rounded-full', item.tone)} style={{ width: `${(item.value / 148) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-ink-strong">
              <AlertTriangle size={14} className="text-warning" />
              Perlu perhatian
            </p>
            <ul className="mt-2 flex flex-col gap-2 text-[10px] text-ink">
              <li className="rounded-md bg-peach/50 p-2">
                <strong className="text-ink-strong">Trayek 23</strong> nonaktif sejak 2 minggu.
              </li>
              <li className="rounded-md bg-peach/50 p-2">
                <strong className="text-ink-strong">Trayek 16</strong> hanya beroperasi saat jam sibuk.
              </li>
              <li className="rounded-md bg-leaf/50 p-2">
                <strong className="text-ink-strong">Trayek 08</strong> ketepatan jadwal tertinggi.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-md bg-danger-bg text-danger">
                <AlertTriangle size={18} />
              </span>
              Hapus trayek {deleting?.code}?
            </DialogTitle>
            <DialogDescription>
              Tindakan ini berdampak operasional luas. Pindahkan{' '}
              {deleting ? getRouteMeta(deleting).vehicles : 0}{' '}
              armada ke trayek lain sebelum menghapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button
              variant="danger"
              onClick={() => {
                toast.success('Trayek dihapus', { description: `Trayek ${deleting?.code} dinonaktifkan.` })
                setDeleteId(null)
              }}
            >
              <Trash2 size={14} />
              Pindahkan armada & hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
