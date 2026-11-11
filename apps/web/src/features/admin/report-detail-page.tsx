import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { useReportStore } from '@/features/reports/report-store'
import { PrivateFileButton } from '@/components/ui/private-file-button'
import { errorMessage } from '@/lib/api'
import type { ReportStatus } from '@/types'
export function ReportDetailPage() {
  const { id } = useParams(),
    report = useReportStore((s) => s.reports.find((r) => r.id === id)),
    error = useReportStore((s) => s.error),
    update = useReportStore((s) => s.updateReport)
  const mutationKey = useRef(crypto.randomUUID())
  const [selected, setSelected] = useState<ReportStatus | null>(null),
    [response, setResponse] = useState(''),
    [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!report) return
    setBusy(true)
    try {
      await update(
        report.id,
        { status: selected ?? report.status, response },
        `report-${report.id}-${mutationKey.current}`,
      )
      mutationKey.current = crypto.randomUUID()
      setSelected(null)
      setResponse('')
      toast.success('Tanggapan dan status disimpan.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  if (!report)
    return (
      <p role="status">
        {error ?? 'Memuat laporan atau laporan tidak ditemukan.'}
      </p>
    )
  return (
    <div className="space-y-5">
      <Link className="text-sm text-brand" to="/admin/laporan">
        ← Kembali ke laporan
      </Link>
      <h1 className="text-2xl font-extrabold">{report.subject}</h1>
      <p className="text-sm text-ink">
        {report.code} · {report.status} ·{' '}
        {new Date(report.createdAt).toLocaleString('id-ID')}
      </p>
      <Card>
        <CardContent className="space-y-3 p-5">
          <p>
            Kategori: {report.category} · Plat:{' '}
            {report.plate ?? 'Tidak dicantumkan'}
          </p>
          <p className="whitespace-pre-wrap text-sm">{report.description}</p>
          {report.evidence.map((path, i) => (
            <PrivateFileButton key={path} bucket="report-evidence" path={path}>
              Bukti {i + 1}
            </PrivateFileButton>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-bold">Riwayat tindak lanjut</h2>
          {report.updates.map((u) => (
            <div key={u.id} className="border-l-2 border-brand pl-3">
              <p className="text-xs text-ink">
                {u.status} · {new Date(u.created_at).toLocaleString('id-ID')}
              </p>
              <p className="text-sm">{u.notes}</p>
            </div>
          ))}
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm">
              Status
              <select
                aria-label="Status laporan"
                className="mt-1 block h-10 rounded-md border border-line bg-surface px-3"
                value={selected ?? report.status}
                onChange={(e) => setSelected(e.target.value as ReportStatus)}
              >
                {(['diterima', 'diproses', 'selesai'] as const).map((s) => (
                  <option
                    key={s}
                    disabled={
                      ['diterima', 'diproses', 'selesai'].indexOf(s) <
                        ['diterima', 'diproses', 'selesai'].indexOf(
                          report.status,
                        ) ||
                      (report.status === 'diterima' && s === 'selesai')
                    }
                  >
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Tanggapan
              <Textarea
                required
                minLength={3}
                className="mt-1"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
            </label>
            <Button disabled={busy}>Simpan tindak lanjut</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
