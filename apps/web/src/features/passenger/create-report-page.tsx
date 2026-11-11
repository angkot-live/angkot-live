import {
  AlertTriangle,
  ArrowLeft,
  BusFront,
  Camera,
  Coins,
  MoreHorizontal,
  Send,
  Wrench,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { useReportStore } from '@/features/reports/report-store'
import { useLiveVehicles } from '@/features/tracking/use-live-vehicles'
import { upload, errorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { ReportCategory } from '@/types'

const categories: {
  value: ReportCategory
  label: string
  description: string
  icon: typeof BusFront
}[] = [
  {
    value: 'pengemudi',
    label: 'Pengemudi',
    description: 'Ugal-ugalan, tidak sopan, atau menurunkan tidak di halte',
    icon: AlertTriangle,
  },
  {
    value: 'fasilitas',
    label: 'Fasilitas',
    description: 'Kebersihan, lampu, pintu, atau kondisi kabin',
    icon: Wrench,
  },
  {
    value: 'tarif',
    label: 'Tarif',
    description: 'Tarif tidak sesuai atau pungutan tambahan',
    icon: Coins,
  },
  {
    value: 'lainnya',
    label: 'Lainnya',
    description: 'Kejadian lain yang perlu ditindaklanjuti',
    icon: MoreHorizontal,
  },
]

export function CreateReportPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const vehicles = useLiveVehicles()
  const [plate, setPlate] = useState('')
  const [busy, setBusy] = useState(false)
  const reportKey = useRef(crypto.randomUUID())
  const [evidencePath, setEvidencePath] = useState<string | null>(null)
  const addReport = useReportStore((state) => state.addReport)
  const [vehicleId, setVehicleId] = useState(params.get('vehicle') ?? '')
  const [category, setCategory] = useState<ReportCategory>('pengemudi')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [evidence, setEvidence] = useState('')
  const [error, setError] = useState('')

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (description.trim().length < 20) {
      setError(
        'Ceritakan kronologi minimal 20 karakter agar petugas mudah menindaklanjuti.',
      )
      return
    }
    setError('')
    const label =
      categories.find((item) => item.value === category)?.label ?? 'Lainnya'
    setBusy(true)
    try {
      const report = await addReport({
        key: reportKey.current,
        category,
        subject: subject.trim() || `Laporan ${label}`,
        description: description.trim(),
        plate: selectedVehicle?.plate ?? plate,
        vehicleId: vehicleId || undefined,
        evidence: evidencePath ? [evidencePath] : [],
      })
      toast.success('Laporan terkirim', {
        description: `Kode tiket ${report.code} sudah masuk antrean petugas Dishub.`,
      })
      navigate('/penumpang/laporan')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="container-page py-6 md:py-10">
      <Link
        to="/penumpang/laporan"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-brand-strong"
      >
        <ArrowLeft size={14} />
        Laporan saya
      </Link>

      <div className="mt-4 max-w-2xl">
        <p className="text-eyebrow text-brand">Aduan penumpang</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
          Buat laporan baru
        </h1>
        <p className="mt-1 text-sm text-ink">
          Sertakan detail kejadian dan kendaraan. Identitas pelapor tidak
          ditampilkan ke pengemudi.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid max-w-2xl gap-4">
        <Card>
          <CardContent className="p-4 md:p-5">
            <h2 className="text-sm font-bold text-ink-strong">
              Kendaraan yang dilaporkan
            </h2>
            <p className="text-xs text-ink">
              Pilih angkot berdasarkan pelat atau jurusan.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              <label
                htmlFor="report-vehicle"
                className="text-xs font-semibold text-ink-strong"
              >
                Angkot
              </label>
              <select
                id="report-vehicle"
                value={vehicleId}
                onChange={(event) => setVehicleId(event.target.value)}
                className="h-11 w-full rounded-md border-[0.5px] border-transparent bg-muted px-3.5 text-sm text-ink-strong outline-none focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/15"
              >
                <option value="">Isi plat kendaraan secara manual</option>
                {vehicleId && !selectedVehicle && (
                  <option value={vehicleId}>Kendaraan dari perjalanan</option>
                )}
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} · Jurusan {vehicle.routeCode} (
                    {vehicle.routeName})
                  </option>
                ))}
              </select>
            </div>
            {!selectedVehicle && (
              <label className="mt-3 block text-xs">
                Plat kendaraan
                <Input
                  className="mt-1"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  placeholder="D 1234 AB"
                  required={!vehicleId}
                />
              </label>
            )}
            {selectedVehicle ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink">
                <Badge variant="leaf">{selectedVehicle.routeCode}</Badge>
                <span>{selectedVehicle.routeName}</span>
                <span className="text-ink-soft">
                  · Pengemudi {selectedVehicle.driverName}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-5">
            <h2 className="text-sm font-bold text-ink-strong">
              Kategori laporan
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {categories.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCategory(item.value)}
                  className={cn(
                    'flex items-start gap-2.5 rounded-md border p-3 text-left transition',
                    category === item.value
                      ? 'border-brand bg-leaf/50'
                      : 'border-line-soft bg-surface hover:border-brand/30',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-8 shrink-0 place-items-center rounded-md',
                      category === item.value
                        ? 'bg-brand text-white'
                        : 'bg-muted text-brand-strong',
                    )}
                  >
                    <item.icon size={15} />
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-ink-strong">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink">
                      {item.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-4 md:p-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="report-subject"
                className="text-xs font-semibold text-ink-strong"
              >
                Judul singkat{' '}
                <span className="font-normal text-ink-soft">(opsional)</span>
              </label>
              <Input
                id="report-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Contoh: Pengemudi menurunkan penumpang di tengah jalan"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="report-description"
                className="text-xs font-semibold text-ink-strong"
              >
                Kronologi kejadian
              </label>
              <Textarea
                id="report-description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                  if (error) setError('')
                }}
                placeholder="Ceritakan waktu, lokasi, dan kejadian secara singkat."
                aria-invalid={Boolean(error) || undefined}
              />
              <div className="flex items-center justify-between text-xs">
                <span
                  className={
                    error ? 'font-medium text-danger' : 'text-ink-soft'
                  }
                >
                  {error || 'Minimal 20 karakter.'}
                </span>
                <span className="text-ink-soft">
                  {description.length} karakter
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-strong">
                Bukti foto/PDF (opsional)
              </span>
              <input
                id="report-evidence"
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  setBusy(true)
                  void upload(file, 'evidence')
                    .then((result) => {
                      setEvidence(file.name)
                      setEvidencePath(result.path)
                    })
                    .catch((e) => setError(errorMessage(e)))
                    .finally(() => setBusy(false))
                }}
              />
              <label
                htmlFor="report-evidence"
                className="flex cursor-pointer items-center gap-2 rounded-md border-[0.5px] border-dashed border-line bg-muted/50 px-3 py-3 text-xs text-ink hover:border-brand/40"
              >
                <Camera size={16} className="text-brand" />
                {evidence ||
                  'Tambahkan foto kejadian, pelat kendaraan, atau PDF'}
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xs text-xs leading-relaxed text-ink-soft">
            Dengan mengirim laporan, kamu menyatakan informasi yang diberikan
            benar.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/penumpang/laporan">Batal</Link>
            </Button>
            <Button disabled={busy} type="submit">
              <Send size={15} />
              Kirim laporan
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
