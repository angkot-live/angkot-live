import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { useAuthStore } from '@/features/auth/auth-store'
import { useRoutes } from '@/features/routes/use-routes'
import { api, post, upload, errorMessage } from '@/lib/api'
import type { DriverVerificationStatus } from '@/types'

export interface Onboarding {
  id: string
  form: Record<string, string>
  status: DriverVerificationStatus
  submittedAt: string | null
  reason: string | null
  vehicleId: string | null
  routeId: string | null
  documents: { id: string; type: string; name: string; size: number }[]
  vehicle: { id: string; plate: string; capacity: number } | null
}
const currentYear = new Date().getFullYear()
const fields = [
  ['name', 'Nama lengkap'],
  ['phone', 'Nomor telepon'],
  ['nik', 'NIK (16 digit)'],
  ['sim', 'Nomor SIM'],
  ['simExpiry', 'SIM berlaku sampai'],
  ['address', 'Alamat'],
  ['plate', 'Plat kendaraan'],
  ['model', 'Model kendaraan'],
  ['year', 'Tahun kendaraan'],
  ['capacity', 'Kapasitas'],
  ['stnkExpiry', 'STNK berlaku sampai'],
  ['kirExpiry', 'KIR berlaku sampai'],
] as const
const documentTypes = [
  ['sim', 'SIM'],
  ['stnk', 'STNK'],
  ['kir', 'KIR'],
  ['foto_kendaraan', 'Foto kondisi kendaraan'],
] as const

function Registration() {
  const register = useAuthStore((s) => s.register),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    try {
      const user = await register({
        role: 'pengemudi',
        email: String(form.get('email')),
        password: String(form.get('password')),
        name: String(form.get('name')),
        phone: String(form.get('phone')),
      })
      if (!user) setSent(true)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return sent ? (
    <p role="status">
      Akun dibuat. Konfirmasi email Anda, lalu{' '}
      <Link className="text-brand" to="/login">
        login
      </Link>{' '}
      untuk melengkapi dokumen.
    </p>
  ) : (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-lg font-bold">Buat akun pengemudi</h2>
      {[
        ['name', 'Nama lengkap', 'text'],
        ['email', 'Email', 'email'],
        ['phone', 'Nomor telepon', 'tel'],
        ['password', 'Password', 'password'],
      ].map(([key, label, type]) => (
        <Field key={key} label={label}>
          <Input
            name={key}
            type={type}
            required
            minLength={key === 'password' ? 8 : undefined}
          />
        </Field>
      ))}
      <Button disabled={busy}>Daftar akun</Button>
      <p className="text-sm">
        Sudah punya akun?{' '}
        <Link className="text-brand" to="/login">
          Masuk
        </Link>
      </p>
    </form>
  )
}
function DriverForm() {
  const { routes } = useRoutes()
  const user = useAuthStore((s) => s.user)
  const data = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => api<Onboarding>('/driver/onboarding'),
    refetchOnMount: 'always',
  })
  const [form, setForm] = useState<Record<string, string> | null>(null),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState<string | null>(null)
  const values = form ?? {
    ...data.data?.form,
    name: data.data?.form.name ?? user?.name ?? '',
    phone: data.data?.form.phone ?? user?.phone ?? '',
  }
  if (data.isPending) return <p role="status">Memuat pendaftaran…</p>
  if (data.error) return <p role="alert">{errorMessage(data.error)}</p>
  if (
    !data.isFetching &&
    (data.data?.status === 'disetujui' ||
      (data.data?.submittedAt && data.data.status === 'menunggu'))
  )
    return <Navigate to="/pengemudi/verifikasi" replace />
  async function save() {
    await api('/driver/onboarding', {
      method: 'PATCH',
      body: JSON.stringify(values),
    })
    await data.refetch()
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await save()
      await post('/driver/submissions', {})
      await data.refetch()
      toast.success('Berkas dikirim untuk diperiksa admin.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  async function addFile(type: string, file?: File) {
    if (!file) return
    setUploading(type)
    try {
      await upload(file, type)
      await data.refetch()
      toast.success('Berkas tersimpan.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setUploading(null)
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {data.data?.reason && (
        <p role="alert" className="rounded-md bg-danger-bg p-3">
          Perbaikan diperlukan: {data.data.reason}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <Field key={key} label={label}>
            <Input
              type={
                key.endsWith('Expiry')
                  ? 'date'
                  : key === 'year' || key === 'capacity'
                    ? 'number'
                    : 'text'
              }
              min={key === 'capacity' ? 1 : key === 'year' ? 1950 : undefined}
              max={
                key === 'capacity'
                  ? 30
                  : key === 'year'
                    ? currentYear + 1
                    : undefined
              }
              value={values[key] ?? ''}
              required={key !== 'address'}
              minLength={key === 'nik' ? 16 : undefined}
              maxLength={key === 'nik' ? 16 : undefined}
              pattern={key === 'nik' ? '[0-9]{16}' : undefined}
              onChange={(e) => setForm({ ...values, [key]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <Field label="Jurusan dan arah tugas">
        <select
          required
          className="h-11 w-full rounded-md border border-line bg-surface px-3"
          value={values.routeId ?? ''}
          onChange={(e) => setForm({ ...values, routeId: e.target.value })}
        >
          <option value="">Pilih arah trayek</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.code} · {r.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {documentTypes.map(([type, label]) => (
          <Field key={type} label={label}>
            <Input
              aria-label={label}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              disabled={uploading !== null}
              onChange={(e) => {
                void addFile(type, e.target.files?.[0])
              }}
            />
            <p className="mt-1 text-xs text-ink">
              {uploading === type
                ? 'Mengunggah…'
                : (data.data?.documents.filter((d) => d.type === type).at(-1)
                    ?.name ?? 'Belum diunggah')}{' '}
              · maks. 5 MB
            </p>
          </Field>
        ))}
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy || !!uploading}
          onClick={() => {
            setBusy(true)
            void save()
              .then(() => toast.success('Draft disimpan.'))
              .catch((e) => toast.error(errorMessage(e)))
              .finally(() => setBusy(false))
          }}
        >
          Simpan draft
        </Button>
        <Button disabled={busy || !!uploading}>
          {busy ? 'Menyimpan…' : 'Kirim verifikasi'}
        </Button>
      </div>
    </form>
  )
}
export function DriverOnboardingPage() {
  const user = useAuthStore((s) => s.user),
    initialized = useAuthStore((s) => s.initialized)
  if (!initialized) return <p className="p-8">Memulihkan sesi…</p>
  if (user && user.role !== 'pengemudi') return <Navigate to="/" replace />
  return (
    <div className="min-h-svh bg-canvas">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link to="/login">Login</Link>
      </header>
      <main className="container-page max-w-4xl py-8">
        <h1 className="text-2xl font-extrabold">Pendaftaran pengemudi</h1>
        <p className="my-3 text-sm text-ink">
          Lengkapi identitas dan berkas kendaraan untuk diperiksa admin.
        </p>
        <Card>
          <CardContent className="p-5">
            {user ? <DriverForm /> : <Registration />}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
