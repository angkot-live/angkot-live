import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useVerificationStore } from './verification-store'
export function VerificationQueuePage() {
  const loaded = useVerificationStore((s) => s.loaded)
  const applicants = useVerificationStore((s) => s.applicants),
    error = useVerificationStore((s) => s.error)
  const [filter, setFilter] = useState('menunggu'),
    [query, setQuery] = useState('')
  const filtered = applicants.filter(
    (a) =>
      (filter === 'semua' || a.verification_status === filter) &&
      `${a.name} ${a.onboarding.plate ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Verifikasi pengemudi</h1>
      {!loaded && !error && <p role="status">Memuat pengajuan…</p>}
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Cari pengemudi"
          className="max-w-sm"
          placeholder="Nama atau plat kendaraan"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Status berkas"
          className="rounded-md border border-line bg-surface px-3"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {['menunggu', 'disetujui', 'ditolak', 'semua'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {loaded && !error && filtered.length === 0 && (
        <p className="text-sm text-ink">Belum ada pendaftar pada filter ini.</p>
      )}
      {filtered.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-bold">{a.name}</p>
              <p className="text-sm text-ink">
                {a.onboarding.plate} · {a.verification_status} ·{' '}
                {new Date(a.submitted_at).toLocaleString('id-ID')}
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link to={`/admin/pengemudi/${a.id}`}>Periksa berkas</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
