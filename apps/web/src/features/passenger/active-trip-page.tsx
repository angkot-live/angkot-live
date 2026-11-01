import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ArrowLeft,
  ArrowRight,
  BusFront,
  CheckCircle2,
  Clock3,
  Flag,
  MapPin,
  MessageSquare,
  Navigation,
  Star,
  Users,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { routes, vehicles } from '@/mocks/data'
import { cn } from '@/lib/cn'

const route = routes[0]
const vehicle = vehicles[0]

const tripSummary = {
  distance: '7,4 km',
  duration: '28 menit',
  boardedAt: 'Jl. Dipatiukur No. 45',
  alightedAt: 'Terminal Dago',
  time: 'Senin, 14.32 WIB',
}

const tipOptions = ['2.000', '5.000', '10.000']

function vehicleIcon() {
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <span style="background:#004425;color:#fff;border-radius:9999px;padding:5px 10px;font-size:11px;font-weight:800;line-height:1;box-shadow:0 4px 14px rgba(0,0,0,.25);white-space:nowrap;border:2px solid #b1f1c4">
          ${vehicle?.plate ?? 'Angkot'}
        </span>
        <span style="width:2px;height:7px;background:#004425"></span>
        <span style="width:9px;height:9px;border-radius:9999px;background:#004425;box-shadow:0 0 0 4px rgba(177,241,196,.65)"></span>
      </div>
    `,
  })
}

function destinationIcon() {
  return L.divIcon({
    className: 'angkot-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
        <span style="background:#B45309;color:#fff;border-radius:9999px;width:26px;height:26px;display:grid;place-items:center;font-size:11px;font-weight:800;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid #fff">B</span>
        <span style="width:2px;height:8px;background:#B45309"></span>
        <span style="width:7px;height:7px;border-radius:9999px;background:#B45309;box-shadow:0 0 0 3px rgba(255,255,255,.7)"></span>
      </div>
    `,
  })
}

function TripComplete() {
  const navigate = useNavigate()
  const [rating, setRating] = useState(5)
  const [tip, setTip] = useState('5.000')
  const [customTip, setCustomTip] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    toast.success('Terima kasih!', {
      description: `Penilaian ${rating} bintang dan tip Rp ${customTip || tip} terkirim.`,
    })
    navigate('/penumpang/riwayat')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center p-6 text-center md:p-8">
          <span className="grid size-16 place-items-center rounded-full bg-leaf text-brand-strong ring-8 ring-leaf/40">
            <CheckCircle2 size={30} />
          </span>
          <p className="mt-4 text-eyebrow text-brand">Tiba di tujuan</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Perjalanan Anda selesai!
          </h1>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink">
            Terima kasih telah menggunakan angkutan umum kota. Perjalanan tercatat aman dan tepat
            waktu.
          </p>

          <div className="mt-5 w-full rounded-md bg-muted p-3 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="leaf">{route?.code} · {route?.name}</Badge>
              <span className="text-[11px] text-ink">{tripSummary.time}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-md bg-surface p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-ink">
                  <Navigation size={11} className="text-brand" />
                  Jarak tempuh
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink-strong">
                  {tripSummary.distance}
                </p>
              </div>
              <div className="rounded-md bg-surface p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-ink">
                  <Clock3 size={11} className="text-brand" />
                  Durasi total
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-ink-strong">
                  {tripSummary.duration}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 text-[11px]">
              <div className="flex items-start gap-2">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-sky-ink" />
                <div>
                  <p className="text-ink-soft">Titik naik</p>
                  <p className="font-semibold text-ink-strong">{tripSummary.boardedAt}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-brand" />
                <div>
                  <p className="text-ink-soft">Titik turun</p>
                  <p className="font-semibold text-ink-strong">{tripSummary.alightedAt}</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 w-full">
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-full bg-leaf text-brand-strong">
                    <BusFront size={16} />
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-ink-strong">
                      {vehicle?.driverName ?? 'Pengemudi'}
                    </p>
                    <p className="text-[10px] text-ink">Plat {vehicle?.plate}</p>
                  </div>
                </div>
                <Badge variant="peach" className="gap-1">
                  <Star size={11} className="fill-current" />
                  4.9
                </Badge>
              </div>

              <p className="mt-3 text-xs font-semibold text-ink-strong">
                Beri penilaian pengemudi
              </p>
              <div className="mt-1 flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} bintang`}
                    onClick={() => setRating(value)}
                    className="p-0.5"
                  >
                    <Star
                      size={26}
                      className={cn(
                        'transition',
                        value <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-transparent text-line',
                      )}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-1 text-center text-[10px] text-ink">
                {rating === 5 ? 'Luar biasa!' : rating >= 3 ? 'Terima kasih!' : 'Kami akan evaluasi.'}
              </p>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-ink-strong">
                  Tip sukarela untuk {vehicle?.driverName?.split(' ')[1] ?? 'pengemudi'}
                </p>
                <Badge variant="outline">100% untuk supir</Badge>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {tipOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setTip(option)
                      setCustomTip('')
                    }}
                    className={cn(
                      'rounded-md border px-2 py-2 text-[11px] font-semibold transition',
                      tip === option && !customTip
                        ? 'border-brand bg-brand text-white'
                        : 'border-line bg-surface text-ink hover:border-brand/40',
                    )}
                  >
                    Rp{option}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setTip('')}
                  className={cn(
                    'rounded-md border px-2 py-2 text-[11px] font-semibold transition',
                    customTip
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-surface text-ink hover:border-brand/40',
                  )}
                >
                  Lainnya
                </button>
              </div>
              {!tip ? (
                <input
                  value={customTip}
                  onChange={(event) => setCustomTip(event.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  placeholder="Nominal tip"
                  className="mt-2 h-9 w-full rounded-md border border-line bg-surface px-3 text-xs outline-none focus:border-brand"
                />
              ) : null}
            </div>

            <Button type="submit" size="lg" className="mt-3 w-full">
              <Wallet size={15} />
              Kirim penilaian & tip
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/penumpang/riwayat')}
              className="text-xs font-semibold text-ink hover:text-brand-strong"
            >
              Lewati
            </button>
            <Link
              to="/penumpang/lapor"
              className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:text-brand-strong"
            >
              <MessageSquare size={13} />
              Laporkan masalah
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ActiveTripPage() {
  const [completed, setCompleted] = useState(false)

  if (completed) {
    return (
      <div className="container-page py-6 md:py-10">
        <div className="mx-auto mb-4 w-full max-w-2xl">
          <Link
            to="/penumpang"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-brand-strong"
          >
            <ArrowLeft size={14} />
            Kembali ke peta
          </Link>
        </div>
        <TripComplete />
      </div>
    )
  }

  const polyline = route?.polyline ?? []
  const vehiclePosition = polyline[Math.floor(polyline.length * 0.45)] ?? polyline[0]
  const destination = polyline[polyline.length - 1]

  return (
    <div className="container-page py-6 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Perjalanan aktif</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Menuju Dago
            <Badge variant="leaf">Dalam perjalanan</Badge>
          </h1>
          <p className="mt-1 text-sm text-ink">
            Angkot {route?.code} · {route?.name}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/penumpang">
            <ArrowLeft size={14} />
            Peta
          </Link>
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="relative h-[340px] md:h-[480px]">
            <MapContainer
              center={vehiclePosition ?? [-6.9039, 107.618]}
              zoom={14}
              scrollWheelZoom={false}
              className="h-full w-full"
              attributionControl={false}
            >
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {polyline.length > 0 ? (
                <Polyline
                  positions={polyline}
                  pathOptions={{ color: route?.color ?? '#1F5C3A', weight: 5, opacity: 0.9 }}
                />
              ) : null}
              {vehiclePosition ? <Marker position={vehiclePosition} icon={vehicleIcon()} /> : null}
              {destination ? <Marker position={destination} icon={destinationIcon()} /> : null}
            </MapContainer>

            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
              <div className="rounded-md border border-line-soft bg-surface/95 px-3 py-2 shadow-soft backdrop-blur">
                <p className="text-[10px] font-semibold text-ink">Estimasi tiba</p>
                <p className="text-lg leading-none font-extrabold text-brand-strong">
                  6 <span className="text-[10px] font-medium text-ink">menit</span>
                </p>
              </div>
              <div className="rounded-md border border-line-soft bg-surface/95 px-3 py-2 text-right shadow-soft backdrop-blur">
                <p className="text-[10px] font-semibold text-ink">Sisa halte</p>
                <p className="text-lg leading-none font-extrabold text-ink-strong">
                  3 <span className="text-[10px] font-medium text-ink">halte</span>
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-md bg-leaf text-brand-strong">
                  <BusFront size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-strong">{vehicle?.plate}</p>
                  <p className="text-xs text-ink">
                    {vehicle?.driverName} · Jurusan {route?.code}
                  </p>
                </div>
                <Badge variant="peach" className="ml-auto gap-1">
                  <Star size={11} className="fill-current" />
                  4.9
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line-soft pt-3 text-xs">
                <div className="flex items-center gap-1.5 text-ink">
                  <Users size={13} className="text-brand" />
                  {vehicle?.seatsAvailable ?? 4} kursi tersedia
                </div>
                <div className="flex items-center gap-1.5 text-ink">
                  <Clock3 size={13} className="text-brand" />
                  Tiba 14.32 WIB
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-5">
              <h2 className="text-sm font-bold text-ink-strong">Progres perjalanan</h2>
              <ol className="mt-3 flex flex-col">
                {[
                  { title: 'Naik angkot', detail: 'Jl. Dipatiukur No. 45 · 14.04', done: true },
                  { title: 'Di perjalanan', detail: 'Melewati Cihampelas', done: true, active: true },
                  { title: 'Turun di tujuan', detail: 'Terminal Dago · 14.32', done: false },
                ].map((step, index, list) => (
                  <li key={step.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold',
                          step.done && 'border-brand bg-brand text-white',
                          !step.done && 'border-line bg-surface text-ink-soft',
                        )}
                      >
                        {step.done ? <CheckCircle2 size={12} /> : index + 1}
                      </span>
                      {index < list.length - 1 ? (
                        <span
                          className={cn('my-1 w-px flex-1', step.done ? 'bg-brand' : 'bg-line')}
                        />
                      ) : null}
                    </div>
                    <div className={index < list.length - 1 ? 'pb-4' : ''}>
                      <p
                        className={cn(
                          'text-xs font-bold',
                          step.done ? 'text-ink-strong' : 'text-ink-soft',
                        )}
                      >
                        {step.title}
                        {step.active ? (
                          <span className="ml-1.5 inline-block size-1.5 rounded-full bg-brand align-middle" />
                        ) : null}
                      </p>
                      <p className="text-[11px] text-ink">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="bg-leaf">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center gap-2 text-brand-strong">
                <MapPin size={15} />
                <p className="text-sm font-bold">Tujuan: Terminal Dago</p>
              </div>
              <p className="mt-1 text-xs text-brand-strong/75">
                Siapkan ongkos Rp 5.000. Tekan tombol saat sudah turun.
              </p>
              <Button className="mt-3 w-full" onClick={() => setCompleted(true)}>
                <Flag size={15} />
                Saya sudah turun
              </Button>
              <Link
                to="/penumpang/lapor"
                className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-brand-strong hover:underline"
              >
                <MessageSquare size={12} />
                Laporkan perjalanan
              </Link>
            </CardContent>
          </Card>

          <Button variant="ghost" size="sm" asChild>
            <Link to="/penumpang/riwayat">
              Lihat riwayat perjalanan
              <ArrowRight size={13} />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
