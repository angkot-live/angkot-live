import {
  ArrowLeft,
  BusFront,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  IdCard,
  MapPin,
  MessageSquare,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { useVerificationStore } from '@/features/admin/verification-store'
import { useMessageStore } from '@/features/messages/message-store'
import { cn } from '@/lib/cn'

const checklist = [
  {
    title: 'Foto / scan dokumen terbaca jelas & tidak blur',
    detail: 'Teks nama, nomor registrasi, tanda tangan, dan cap kepolisian terlihat kontras.',
  },
  {
    title: 'Data identitas sesuai dengan data pendaftar',
    detail: 'Pencocokan nama dan tanggal lahir sesuai 100% dengan data KTP.',
  },
  {
    title: 'Masa berlaku masih aktif',
    detail: 'Masa kedaluwarsa dokumen melewati batas minimal operasional 6 bulan ke depan.',
  },
]

export function VerificationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const driverApplicants = useVerificationStore((state) => state.applicants)
  const updateStatus = useVerificationStore((state) => state.updateStatus)
  const sendMessage = useMessageStore((state) => state.sendMessage)
  const applicant = driverApplicants.find((item) => item.id === id)
  const [note, setNote] = useState('')
  const [checked, setChecked] = useState([true, true, true])

  if (!applicant) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <UserRound size={30} className="text-ink-soft" />
        <h1 className="text-xl font-bold text-ink-strong">Pendaftar tidak ditemukan</h1>
        <Button asChild>
          <Link to="/admin/pengemudi">
            <ArrowLeft size={15} />
            Kembali ke antrean
          </Link>
        </Button>
      </div>
    )
  }

  const validCount = checked.filter(Boolean).length
  const allValid = validCount === checklist.length

  function handleApprove() {
    if (!applicant) return
    updateStatus(applicant.id, 'disetujui')
    sendMessage({
      title: 'Verifikasi akun disetujui',
      body: `Selamat, ${applicant.name}! Berkas dan kendaraan ${applicant.plate} telah disetujui. Kamu dapat mulai menerima penumpang melalui aplikasi Angkot-Live. Pastikan GPS selalu aktif saat bertugas.`,
      from: 'Dishub Kota Bandung',
      role: 'Administrator',
      kind: 'system',
    })
    toast.success('Pengemudi disetujui', {
      description: `${applicant.name} sekarang aktif sebagai mitra pengemudi.`,
    })
    navigate('/admin/pengemudi')
  }

  function handleReject() {
    if (!applicant) return
    if (!note.trim()) {
      toast.error('Tulis alasan penolakan terlebih dahulu.')
      return
    }
    updateStatus(applicant.id, 'ditolak')
    sendMessage({
      title: 'Berkas verifikasi perlu revisi',
      body: `Halo ${applicant.name}, berkas verifikasi kendaraan ${applicant.plate} belum dapat disetujui. Alasan: ${note.trim()}. Silakan perbaiki berkas lalu ajukan verifikasi ulang.`,
      from: 'Dishub Kota Bandung',
      role: 'Administrator',
      kind: 'admin',
    })
    toast.success('Berkas dikembalikan untuk revisi', {
      description: 'Pengemudi akan menerima notifikasi dan alasan penolakan.',
    })
    navigate('/admin/pengemudi')
  }

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/pengemudi"
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-muted"
        >
          <ArrowLeft size={14} />
          Kembali ke antrean
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="peach">Sedang ditinjau</Badge>
          <span className="flex items-center gap-1.5 text-[11px] text-ink">
            <Clock3 size={12} />
            Masuk 24 Okt, 09.42 WIB
          </span>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] text-ink-soft">Antrean verifikasi / #{applicant.id.toUpperCase()}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong">
          Verifikasi {applicant.name}
        </h1>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                  <UserRound size={15} className="text-brand" />
                  Data diri calon mitra
                </h2>
                <Badge variant="leaf">Terverifikasi NIK</Badge>
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-md bg-muted p-3">
                <Avatar name={applicant.name} size="lg" />
                <div>
                  <p className="text-sm font-bold text-ink-strong">{applicant.name}</p>
                  <p className="text-[10px] text-ink">Supir Utama Trayek Kota</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-soft">
                    <MapPin size={10} />
                    Pengalaman {applicant.experience}
                  </p>
                </div>
              </div>
              <dl className="mt-3 flex flex-col gap-2 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-soft">NIK Kependudukan</dt>
                  <dd className="font-semibold text-ink-strong">
                    {applicant.nik.slice(0, 4)}••••••••{applicant.nik.slice(-2)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-soft">Nomor handphone</dt>
                  <dd className="font-semibold text-ink-strong">{applicant.wa}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-soft">Koperasi</dt>
                  <dd className="font-semibold text-ink-strong">{applicant.koperasi}</dd>
                </div>
              </dl>
              <div className="mt-3 rounded-md border border-line-soft p-2.5">
                <p className="flex items-center gap-1 text-[10px] text-ink-soft">
                  <MapPin size={10} />
                  Alamat domisili
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-ink-strong">
                  {applicant.address}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                  <BusFront size={15} className="text-brand" />
                  Identitas kendaraan
                </h2>
                <Badge variant="sky">Angkot kota</Badge>
              </div>
              <div className="mt-3 flex h-32 items-center justify-center rounded-md bg-gradient-to-br from-leaf via-muted to-sky">
                <div className="text-center">
                  <BusFront size={40} className="mx-auto text-brand-strong/70" />
                  <p className="mt-1 text-xs font-extrabold text-brand-strong">{applicant.plate}</p>
                  <p className="text-[9px] text-ink">{applicant.color}</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <dt className="text-ink-soft">Merek / model</dt>
                  <dd className="font-semibold text-ink-strong">
                    {applicant.model} ({applicant.year})
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Jurusan diajukan</dt>
                  <dd className="font-semibold text-ink-strong">
                    {applicant.routeCode} · {applicant.routeName}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Kapasitas kursi</dt>
                  <dd className="font-semibold text-ink-strong">12 kursi</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Status tilang</dt>
                  <dd className="flex items-center gap-1 font-semibold text-brand-strong">
                    <CheckCircle2 size={11} />
                    Bersih
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-ink-strong">Dokumen SIM B1 Umum</h2>
                <Badge variant="leaf">Berlaku s/d {applicant.simExpiry}</Badge>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  { label: 'KTP Elektronik', valid: true },
                  { label: 'SIM B1 Umum', valid: applicant.simValid },
                  { label: 'STNK Kendaraan', valid: applicant.stnkValid },
                  { label: 'Buku Uji KIR', valid: applicant.kirValid },
                ].map((doc) => (
                  <div
                    key={doc.label}
                    className={cn(
                      'flex items-center gap-2 rounded-md border p-2.5',
                      doc.valid
                        ? 'border-brand/25 bg-leaf/40'
                        : 'border-danger/25 bg-danger-bg/30',
                    )}
                  >
                    {doc.valid ? (
                      <CheckCircle2 size={14} className="text-brand" />
                    ) : (
                      <XCircle size={14} className="text-danger" />
                    )}
                    <div>
                      <p className="text-[10px] font-semibold text-ink-strong">{doc.label}</p>
                      <p className="text-[9px] text-ink">{doc.valid ? 'Valid' : 'Perlu revisi'}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-md bg-muted p-4">
                <div className="flex items-center gap-2">
                  <IdCard size={18} className="text-brand" />
                  <div>
                    <p className="text-[10px] font-bold tracking-wide text-ink-soft uppercase">
                      Kepolisian Negara Republik Indonesia
                    </p>
                    <p className="text-sm font-extrabold text-ink-strong">
                      Surat Izin Mengemudi · B1 Umum
                    </p>
                  </div>
                </div>
                <dl className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                  <div>
                    <dt className="text-ink-soft">Nama</dt>
                    <dd className="font-semibold text-ink-strong">{applicant.name}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Nomor SIM</dt>
                    <dd className="font-semibold text-ink-strong">{applicant.sim}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Masa berlaku</dt>
                    <dd className="font-semibold text-ink-strong">{applicant.simExpiry}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Pekerjaan</dt>
                    <dd className="font-semibold text-ink-strong">Pengemudi angkutan umum</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[9px] text-ink-soft">
                  Dukcapil & Korlantas Polri sync valid · Security chip OK · Hologram reflective OK
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
                  <ShieldCheck size={15} className="text-brand" />
                  Lembar verifikasi SIM B1 Umum
                </h2>
                <Badge variant={allValid ? 'leaf' : 'peach'}>
                  {validCount}/{checklist.length} parameter terpenuhi
                </Badge>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {checklist.map((item, index) => (
                  <label
                    key={item.title}
                    className="flex cursor-pointer items-start gap-2 rounded-md border border-line-soft p-3"
                  >
                    <input
                      type="checkbox"
                      checked={checked[index]}
                      onChange={(event) =>
                        setChecked((current) =>
                          current.map((value, position) =>
                            position === index ? event.target.checked : value,
                          ),
                        )
                      }
                      className="mt-0.5 size-4 accent-[#004425]"
                    />
                    <span>
                      <span className="block text-[11px] font-semibold text-ink-strong">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-relaxed text-ink">
                        {item.detail}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-3">
                <label
                  htmlFor="verification-note"
                  className="text-[11px] font-semibold text-ink-strong"
                >
                  Catatan verifikator (opsional)
                </label>
                <Textarea
                  id="verification-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Tulis catatan atau alasan penolakan..."
                  className="mt-1 min-h-20"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-surface/95 px-4 py-3 backdrop-blur-xl lg:left-72">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-ink">
            <FileText size={14} className="text-brand" />
            {validCount} dari {checklist.length} dokumen tervalidasi
            <Badge variant="leaf">{Math.round((validCount / checklist.length) * 100)}% selesai</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={handleReject}>
              <XCircle size={14} />
              Tolak berkas
            </Button>
            <Button size="sm" onClick={handleApprove} disabled={!allValid}>
              <Check size={14} />
              Terima & terbitkan akun
            </Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => toast.info('Pesan ke pengemudi dibuka')}
        className="sr-only"
      >
        <MessageSquare size={14} />
      </button>
    </div>
  )
}
