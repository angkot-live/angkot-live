import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { PrivateFileButton } from '@/components/ui/private-file-button'
import { errorMessage } from '@/lib/api'
import { useVerificationStore } from './verification-store'
export function VerificationDetailPage() {
  const { id } = useParams(),
    navigate = useNavigate(),
    applicant = useVerificationStore((s) =>
      s.applicants.find((a) => a.id === id),
    ),
    error = useVerificationStore((s) => s.error),
    update = useVerificationStore((s) => s.updateStatus)
  const [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false)
  async function decide(status: 'disetujui' | 'ditolak') {
    if (!id) return
    setBusy(true)
    try {
      await update(id, status, reason)
      toast.success('Keputusan verifikasi disimpan.')
      navigate('/admin/pengemudi')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  if (!applicant)
    return (
      <div className="space-y-3">
        <p>{error ?? 'Memuat pendaftaran atau pendaftar tidak ditemukan.'}</p>
        <Link to="/admin/pengemudi">Kembali ke antrean</Link>
      </div>
    )
  return (
    <div className="space-y-5">
      <Link to="/admin/pengemudi" className="text-sm text-brand">
        ← Kembali ke antrean
      </Link>
      <h1 className="text-2xl font-extrabold">Verifikasi {applicant.name}</h1>
      <p>Status: {applicant.verification_status}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 font-bold">Identitas dan kendaraan</h2>
            <dl className="space-y-2 text-sm">
              {Object.entries(applicant.onboarding).map(([key, value]) => (
                <div className="grid grid-cols-2 gap-2" key={key}>
                  <dt className="text-ink">{key}</dt>
                  <dd className="break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-bold">Dokumen privat</h2>
            {applicant.documents.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3"
              >
                <span className="text-sm">
                  {d.document_type.toUpperCase()} · {d.file_name}
                </span>
                <PrivateFileButton bucket="driver-documents" path={d.file_path}>
                  Lihat dokumen
                </PrivateFileButton>
              </div>
            ))}
            <p className="text-xs text-ink">
              Periksa keterbacaan, kesesuaian identitas, dan masa berlaku
              sebelum menyetujui.
            </p>
          </CardContent>
        </Card>
      </div>
      {applicant.verification_status === 'menunggu' && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <label className="block text-sm">
              Alasan penolakan
              <Textarea
                className="mt-2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Jelaskan berkas yang perlu diperbaiki"
              />
            </label>
            <div className="flex gap-3">
              <Button
                disabled={busy}
                onClick={() => {
                  void decide('disetujui')
                }}
              >
                Setujui pengemudi
              </Button>
              <Button
                variant="danger"
                disabled={busy || reason.trim().length < 5}
                onClick={() => {
                  void decide('ditolak')
                }}
              >
                Tolak dan minta perbaikan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
