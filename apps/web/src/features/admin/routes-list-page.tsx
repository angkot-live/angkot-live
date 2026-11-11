import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useRoutes } from '@/features/routes/use-routes'
import { RouteLoadState } from '@/features/routes/route-load-state'
import { api, errorMessage } from '@/lib/api'
import type { RouteInfo } from '@/types'

export function RoutesListPage() {
  const { routes, isPending, error } = useRoutes(true)
  const client = useQueryClient()
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('semua'),
    [busy, setBusy] = useState('')
  const [deleting, setDeleting] = useState<RouteInfo | null>(null)
  const filtered = routes.filter(
    (r) =>
      (status === 'semua' || r.isActive === (status === 'aktif')) &&
      `${r.code} ${r.name} ${r.origin} ${r.destination}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  async function remove(route: RouteInfo) {
    setBusy(route.id)
    try {
      await api(`/admin/routes/${route.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ updatedAt: route.updatedAt }),
      })
      await client.invalidateQueries({ queryKey: ['route-catalog'] })
      await client.invalidateQueries({ queryKey: ['public-stats'] })
      setDeleting(null)
      toast.success('Trayek dihapus.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy('')
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Manajemen trayek angkot</h1>
          <p className="mt-2 text-sm">
            Kelola arah perjalanan, jalur, halte dan status operasional.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/trayek/baru">Tambah trayek</Link>
        </Button>
      </div>
      <RouteLoadState pending={isPending} error={error} />
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Cari trayek"
          placeholder="Kode, nama, atau tujuan"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
        <select
          aria-label="Filter status trayek"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-line p-2"
        >
          <option value="semua">Semua status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
      </div>
      <p className="text-sm">
        {routes.length} arah · {new Set(routes.map((r) => r.code)).size} kode ·{' '}
        {routes.filter((r) => r.isActive).length} arah aktif
      </p>
      <Card>
        <CardContent className="overflow-x-auto p-3">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2">Kode / arah</th>
                <th>Jarak</th>
                <th>Halte</th>
                <th>Armada terdaftar</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-line-soft">
                  <td className="p-2">
                    <strong>{r.code}</strong> · {r.name}
                  </td>
                  <td>{r.lengthKm?.toFixed(1)} km</td>
                  <td>{r.endstops?.length ?? 0}</td>
                  <td>{r.registeredVehicles ?? 0}</td>
                  <td>{r.isActive ? 'Aktif' : 'Nonaktif'}</td>
                  <td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/admin/trayek/${r.id}`}>Edit</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleting(r)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isPending && !error && filtered.length === 0 && (
            <p className="p-3">Tidak ada trayek sesuai pencarian.</p>
          )}
        </CardContent>
      </Card>
      {deleting && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h2 className="font-bold">
              Hapus {deleting.code} · {deleting.name}?
            </h2>
            <p className="text-sm">
              Penghapusan permanen hanya tersedia jika tidak ada kendaraan,
              assignment, request atau histori yang merujuk trayek. Gunakan
              status nonaktif untuk mempertahankan histori.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)}>
                Batal
              </Button>
              <Button
                variant="danger"
                disabled={!!busy}
                onClick={() => void remove(deleting)}
              >
                Hapus permanen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
