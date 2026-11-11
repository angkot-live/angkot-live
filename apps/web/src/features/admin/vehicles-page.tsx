import {
  AlertTriangle,
  BusFront,
  CalendarClock,
  CheckCircle2,
  Download,
  FileCheck2,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge, VehicleStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useMessageStore } from '@/features/messages/message-store'
import { vehicles } from '@/mocks/data'
import { cn } from '@/lib/cn'
import type { Vehicle } from '@/types'

type DocState = 'layak' | 'hampir' | 'perbaikan'

const docMeta: Record<DocState, { label: string; variant: 'leaf' | 'peach' | 'danger' }> = {
  layak: { label: 'Layak jalan', variant: 'leaf' },
  hampir: { label: 'Dokumen hampir habis', variant: 'peach' },
  perbaikan: { label: 'Perlu perbaikan', variant: 'danger' },
}

const models = [
  'Suzuki Carry 1.5 Futura',
  'Daihatsu Gran Max 1.3',
  'Mitsubishi Colt T120SS',
  'Suzuki Carry Futura 1.5',
]

function docState(index: number): DocState {
  if (index % 7 === 0) return 'perbaikan'
  if (index % 5 === 0) return 'hampir'
  return 'layak'
}

export function VehiclesPage() {
  const sendMessage = useMessageStore((state) => state.sendMessage)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'semua' | DocState>('semua')
  const [selected, setSelected] = useState<Vehicle | null>(null)

  const rows = useMemo(
    () =>
      vehicles.map((vehicle, index) => ({
        vehicle,
        model: models[index % models.length],
        state: docState(index),
        stnk: index % 5 === 0 ? '12 Nov 2026' : '18 Agu 2027',
        kir: index % 7 === 0 ? '02 Okt 2026' : '14 Des 2027',
        lastCheck: index % 3 === 0 ? '12 Okt 2026' : '24 Sep 2026',
      })),
    [],
  )

  const filtered = rows.filter((row) => {
    const term = query.trim().toLowerCase()
    const matchesFilter = filter === 'semua' || row.state === filter
    const matchesQuery =
      !term ||
      row.vehicle.plate.toLowerCase().includes(term) ||
      row.vehicle.driverName.toLowerCase().includes(term) ||
      row.vehicle.routeName.toLowerCase().includes(term)
    return matchesFilter && matchesQuery
  })

  const selectedRow = rows.find((row) => row.vehicle.id === selected?.id)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Inventaris armada angkutan kota</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Kendaraan & dokumen
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink">
            Pantau kelayakan teknis, masa berlaku STNK/KIR, dan hasil uji kendaraan seluruh armada
            angkot terdaftar.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download size={14} />
          Ekspor inventaris
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Total kendaraan', value: '186', note: '14 unit contoh', icon: BusFront, tone: 'bg-leaf text-brand-strong' },
          { label: 'Layak jalan', value: '168', note: '90,3% armada', icon: CheckCircle2, tone: 'bg-brand text-white' },
          { label: 'Dokumen hampir habis', value: '12', note: 'Dalam 30 hari', icon: CalendarClock, tone: 'bg-peach text-amber-900' },
          { label: 'Perlu perbaikan', value: '6', note: 'Uji KIR tidak lolos', icon: Wrench, tone: 'bg-danger-bg text-danger' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold text-ink">{stat.label}</p>
                <span className={cn('grid size-8 place-items-center rounded-md', stat.tone)}>
                  <stat.icon size={15} />
                </span>
              </div>
              <p className="mt-2 text-2xl leading-none font-extrabold text-ink-strong">{stat.value}</p>
              <p className="mt-1 text-xs text-ink-soft">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-line-soft pb-3">
            {[
              { label: 'Semua', value: 'semua' },
              { label: 'Layak jalan', value: 'layak' },
              { label: 'Hampir habis', value: 'hampir' },
              { label: 'Perlu perbaikan', value: 'perbaikan' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value as typeof filter)}
                className={cn(
                  'rounded-md px-3 py-2 text-xs font-semibold transition',
                  filter === item.value ? 'bg-brand-strong text-white' : 'text-ink hover:bg-muted',
                )}
              >
                {item.label}
              </button>
            ))}
            <div className="ml-auto">
              <Input
                icon={<Search size={14} />}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari plat, pengemudi, atau trayek"
                aria-label="Cari kendaraan"
                className="h-9 md:w-64"
              />
            </div>
          </div>

          <div className="mt-3 hidden grid-cols-[120px_1fr_150px_110px_110px_130px_110px_90px] gap-2 px-2 text-xs font-bold tracking-wide text-ink-soft uppercase lg:grid">
            <span>Plat nomor</span>
            <span>Kendaraan / pengemudi</span>
            <span>Trayek</span>
            <span>STNK</span>
            <span>Uji KIR</span>
            <span>Status dokumen</span>
            <span>Operasional</span>
            <span>Aksi</span>
          </div>

          <div className="mt-1 flex flex-col gap-1.5">
            {filtered.map((row) => {
              const meta = docMeta[row.state]
              return (
                <div
                  key={row.vehicle.id}
                  className="grid gap-2 rounded-md border-[0.5px] border-line-soft p-3 transition hover:border-brand/40 hover:bg-muted/30 lg:grid-cols-[120px_1fr_150px_110px_110px_130px_110px_90px] lg:items-center"
                >
                  <div>
                    <p className="text-xs font-extrabold text-ink-strong">{row.vehicle.plate}</p>
                    <p className="text-xs text-ink-soft">Angkot kota</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink-strong">{row.model}</p>
                    <p className="truncate text-xs text-ink">{row.vehicle.driverName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft">Trayek</p>
                    <p className="text-xs font-semibold text-ink-strong">
                      {row.vehicle.routeCode} · {row.vehicle.routeName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft">STNK</p>
                    <p className={cn('text-xs font-semibold', row.state === 'hampir' ? 'text-warning' : 'text-ink-strong')}>
                      {row.stnk}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft">Uji KIR</p>
                    <p className={cn('text-xs font-semibold', row.state === 'perbaikan' ? 'text-danger' : 'text-ink-strong')}>
                      {row.kir}
                    </p>
                  </div>
                  <div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  <div>
                    <VehicleStatusBadge status={row.vehicle.status} />
                  </div>
                  <Button variant="soft" size="sm" onClick={() => setSelected(row.vehicle)}>
                    Dokumen
                  </Button>
                </div>
              )
            })}
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink">Tidak ada kendaraan yang cocok.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BusFront size={18} className="text-brand" />
              Dokumen {selected?.plate}
            </DialogTitle>
            <DialogDescription>
              {selectedRow?.model} · Pengemudi {selected?.driverName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex h-36 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 via-slate-500 to-lime-300 text-white">
            <div className="text-center">
              <BusFront size={42} className="mx-auto opacity-90" />
              <p className="mt-1 text-sm font-extrabold">{selected?.plate}</p>
              <p className="text-xs text-white/80">{selectedRow?.model}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {[
              { label: 'STNK kendaraan', value: selectedRow?.stnk ?? '-', icon: FileCheck2 },
              { label: 'Buku uji KIR', value: selectedRow?.kir ?? '-', icon: ShieldCheck },
              { label: 'Pemeriksaan terakhir', value: selectedRow?.lastCheck ?? '-', icon: CalendarClock },
            ].map((doc) => (
              <div key={doc.label} className="flex items-center gap-2 rounded-md border-[0.5px] border-line-soft p-3">
                <span className="grid size-8 place-items-center rounded-md bg-leaf text-brand-strong">
                  <doc.icon size={15} />
                </span>
                <div className="flex-1">
                  <p className="text-xs text-ink-soft">{doc.label}</p>
                  <p className="text-xs font-semibold text-ink-strong">{doc.value}</p>
                </div>
                <Badge variant={selectedRow?.state === 'perbaikan' ? 'danger' : 'leaf'}>
                  {selectedRow?.state === 'perbaikan' ? 'Perlu tindakan' : 'Valid'}
                </Badge>
              </div>
            ))}

            {selectedRow?.state !== 'layak' ? (
              <div className="flex items-start gap-2 rounded-md bg-peach/50 p-3 text-xs text-ink">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                Kendaraan perlu melengkapi dokumen sebelum dapat beroperasi kembali. Kirim pengingat
                kepada pengemudi melalui menu pesan.
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Tutup
            </Button>
            <Button
              onClick={() => {
                if (!selected) return
                sendMessage({
                  title: `Pengingat dokumen ${selected.plate}`,
                  body: `Yth. ${selected.driverName}, dokumen kendaraan ${selected.plate} perlu dilengkapi. STNK berlaku sampai ${selectedRow?.stnk ?? '-'} dan uji KIR sampai ${selectedRow?.kir ?? '-'}. Mohon segera melakukan pembaruan.`,
                  from: 'Dishub Kota Bandung',
                  role: 'Administrator',
                  kind: 'admin',
                })
                toast.success('Pengingat dokumen dikirim ke pengemudi')
              }}
            >
              Kirim pengingat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
