import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { useAuthStore } from '@/features/auth/auth-store'
import { api, errorMessage } from '@/lib/api'
import type { Onboarding } from './driver-onboarding-page'
export function DriverProfilePage() {
  const user = useAuthStore((s) => s.user),
    save = useAuthStore((s) => s.updateProfile)
  const [name, setName] = useState(user?.name ?? ''),
    [phone, setPhone] = useState(user?.phone ?? ''),
    [busy, setBusy] = useState(false)
  const data = useQuery({
    queryKey: ['onboarding', user?.id],
    queryFn: () => api<Onboarding>('/driver/onboarding'),
  })
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await save({ name, phone })
      toast.success('Profil tersimpan.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="container-page max-w-3xl space-y-5 py-8">
      <h1 className="text-2xl font-extrabold">Profil dan kendaraan</h1>
      <Card>
        <CardContent className="p-5">
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Nama">
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Telepon">
              <Input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <p className="text-sm text-ink">Email: {user?.email}</p>
            <Button disabled={busy}>Simpan profil</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-bold">
            Kendaraan: {data.data?.vehicle?.plate ?? 'Belum ditugaskan'}
          </h2>
          {data.error && <p role="alert">{errorMessage(data.error)}</p>}
          <p className="text-sm">
            Status verifikasi: {data.data?.status ?? 'Memuat…'}
          </p>
          <p className="text-sm">
            STNK: {data.data?.form.stnkExpiry ?? '—'} · KIR:{' '}
            {data.data?.form.kirExpiry ?? '—'}
          </p>
          <ul className="space-y-1 text-sm">
            {data.data?.documents.map((d) => (
              <li key={d.id}>
                {d.type.toUpperCase()} · {d.name}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
