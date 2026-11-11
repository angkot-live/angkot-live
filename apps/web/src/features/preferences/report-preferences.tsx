import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, errorMessage } from '@/lib/api'
import { useAuthStore } from '@/features/auth/auth-store'
import { Button } from '@/components/ui/button'
export function ReportPreferences() {
  const user = useAuthStore((s) => s.user),
    client = useQueryClient()
  const query = useQuery({
    queryKey: ['preferences', user?.id],
    queryFn: () => api<{ report_updates: boolean }>('/preferences'),
    enabled: user?.role === 'penumpang',
  })
  const [draft, setDraft] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    try {
      const value = await api<{ report_updates: boolean }>('/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          report_updates: draft ?? query.data?.report_updates ?? true,
        }),
      })
      client.setQueryData(['preferences', user?.id], value)
      setDraft(null)
      toast.success('Preferensi notifikasi tersimpan.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3">
      {query.isPending && (
        <p role="status" className="text-xs">
          Memuat preferensi…
        </p>
      )}
      {query.error && (
        <p role="alert" className="text-xs text-danger">
          {errorMessage(query.error)}
        </p>
      )}
      {query.data && (
        <>
          <label className="flex items-start gap-3 py-3 text-xs">
            <input
              className="mt-1 accent-brand"
              type="checkbox"
              checked={draft ?? query.data.report_updates}
              onChange={(e) => setDraft(e.target.checked)}
              disabled={busy}
            />
            <span>
              <span className="block font-semibold">Status laporan</span>Terima
              notifikasi dalam aplikasi untuk tanggapan laporan berikutnya.
              Timeline laporan tetap tersedia meskipun notifikasi dimatikan.
            </span>
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || draft === null}
            onClick={() => void save()}
          >
            {busy ? 'Menyimpan…' : 'Simpan preferensi'}
          </Button>
        </>
      )}
    </div>
  )
}
