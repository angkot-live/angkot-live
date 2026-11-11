import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Megaphone,
  MessageSquare,
  Send,
  Smartphone,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { useMessageStore } from '@/features/messages/message-store'
import { cn } from '@/lib/cn'

const recipients = [
  { id: 'semua', label: 'Semua pengemudi aktif', detail: '124 pengemudi' },
  { id: 'r-08', label: 'Pengemudi trayek 08', detail: '24 pengemudi' },
  { id: 'r-05', label: 'Pengemudi trayek 05', detail: '18 pengemudi' },
  { id: 'verifikasi', label: 'Pengemudi menunggu verifikasi', detail: '4 pengemudi' },
  { id: 'dokumen', label: 'Dokumen hampir kedaluwarsa', detail: '12 pengemudi' },
]

const templates = [
  {
    title: 'Pengingat uji KIR',
    body: 'Yth. Pengemudi, masa berlaku uji KIR kendaraan Anda akan berakhir dalam 14 hari. Mohon segera melakukan uji ulang di Dishub Kota Bandung.',
    tone: 'bg-peach text-amber-900',
  },
  {
    title: 'Pembinaan trayek',
    body: 'Diberitahukan bahwa akan dilaksanakan pembinaan pengemudi trayek pada Jumat, 6 November 2026 pukul 09.00 di Kantor Dishub Kota Bandung.',
    tone: 'bg-sky text-sky-ink',
  },
  {
    title: 'Peringatan pelanggaran',
    body: 'Berdasarkan laporan penumpang, terdapat indikasi pelanggaran trayek. Mohon mematuhi jalur resmi dan tidak mengetem di luar halte.',
    tone: 'bg-danger-bg text-danger',
  },
]

export function MessagesPage() {
  const sendMessage = useMessageStore((state) => state.sendMessage)
  const [recipient, setRecipient] = useState('semua')
  const [title, setTitle] = useState('Pengingat uji KIR kendaraan')
  const [body, setBody] = useState(
    'Yth. Pengemudi Angkot-Live, masa berlaku uji KIR kendaraan Anda akan berakhir dalam 14 hari. Mohon segera melakukan uji ulang di Dishub Kota Bandung.',
  )
  const [channels, setChannels] = useState({ app: true, sms: false })

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-eyebrow text-brand">Komunikasi operator</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            Kirim pesan & siaran
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink">
            Kirim pengumuman, pengingat dokumen, atau peringatan resmi kepada pengemudi angkot.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Terkirim bulan ini', value: '1.284', note: '94% dibaca', icon: Send },
          { label: 'Pengemudi terhubung', value: '124', note: 'Aktif dalam 7 hari', icon: Users },
          { label: 'Siaran berjalan', value: '3', note: '1 menunggu jadwal', icon: Megaphone },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-10 place-items-center rounded-md bg-leaf text-brand-strong">
                <stat.icon size={17} />
              </span>
              <div>
                <p className="text-xs text-ink">{stat.label}</p>
                <p className="text-xl leading-none font-extrabold text-ink-strong">{stat.value}</p>
                <p className="text-xs text-ink-soft">{stat.note}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_400px]">
        <Card>
          <CardContent className="p-4">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink-strong">
              <MessageSquare size={15} className="text-brand" />
              Tulis pesan
            </h2>

            <div className="mt-3">
              <p className="text-xs font-semibold text-ink">Penerima</p>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {recipients.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md border p-2.5 transition',
                      recipient === item.id
                        ? 'border-brand bg-leaf/40'
                        : 'border-line-soft hover:border-brand/30',
                    )}
                  >
                    <input
                      type="radio"
                      name="recipient"
                      checked={recipient === item.id}
                      onChange={() => setRecipient(item.id)}
                      className="size-3.5 accent-[#004425]"
                    />
                    <span className="flex-1 text-xs font-semibold text-ink-strong">
                      {item.label}
                    </span>
                    <span className="text-xs text-ink-soft">{item.detail}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="message-title" className="text-xs font-semibold text-ink">
                Judul pesan
              </label>
              <Input
                id="message-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1"
              />
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label htmlFor="message-body" className="text-xs font-semibold text-ink">
                  Isi pesan
                </label>
                <span className="text-xs text-ink-soft">{body.length}/320 karakter</span>
              </div>
              <Textarea
                id="message-body"
                value={body}
                onChange={(event) => setBody(event.target.value.slice(0, 320))}
                className="mt-1 min-h-32"
              />
            </div>

            <div className="mt-3">
              <p className="text-xs font-semibold text-ink">Template cepat</p>
              <div className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
                {templates.map((template) => (
                  <button
                    key={template.title}
                    type="button"
                    onClick={() => {
                      setTitle(template.title)
                      setBody(template.body)
                    }}
                    className="rounded-md border-[0.5px] border-line-soft p-2 text-left transition hover:border-brand/40 hover:bg-muted/40"
                  >
                    <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-xs font-bold', template.tone)}>
                      Template
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-ink-strong">
                      {template.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={channels.app}
                  onChange={(event) => setChannels((current) => ({ ...current, app: event.target.checked }))}
                  className="size-3.5 accent-[#004425]"
                />
                <BellRing size={12} className="text-brand" />
                Notifikasi aplikasi
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={channels.sms}
                  onChange={(event) => setChannels((current) => ({ ...current, sms: event.target.checked }))}
                  className="size-3.5 accent-[#004425]"
                />
                <Smartphone size={12} className="text-brand" />
                SMS gateway
              </label>
            </div>

            <Button
              className="mt-3 w-full sm:w-auto"
              onClick={() => {
                if (!title.trim() || !body.trim()) {
                  toast.error('Judul dan isi pesan wajib diisi.')
                  return
                }
                sendMessage({
                  title: title.trim(),
                  body: body.trim(),
                  from: 'Dishub Kota Bandung',
                  role: 'Administrator',
                  kind: 'admin',
                })
                toast.success('Pesan berhasil dikirim', {
                  description: `${recipients.find((item) => item.id === recipient)?.label} A� ${channels.app ? 'Aplikasi' : ''}${channels.app && channels.sms ? ' + ' : ''}${channels.sms ? 'SMS' : ''}`,
                })
              }}
            >
              <Send size={14} />
              Kirim pesan sekarang
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-bold text-ink-strong">Pratinjau pesan</p>
              <div className="mt-2 rounded-lg bg-muted p-3">
                <div className="flex items-center gap-2 border-b border-line-soft pb-2">
                  <span className="grid size-8 place-items-center rounded-full bg-brand text-white">
                    <BellRing size={14} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink-strong">Angkot-Live</p>
                    <p className="text-xs text-ink-soft">Sekarang · notifikasi</p>
                  </div>
                </div>
                <p className="mt-2 text-xs font-bold text-ink-strong">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink">{body}</p>
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs text-ink-soft">
                <CheckCircle2 size={10} className="text-brand" />
                Pesan akan tampil di inbox pengemudi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-bold text-ink-strong">Riwayat siaran</p>
              <div className="mt-2 flex flex-col gap-2">
                {[
                  { title: 'Pembinaan trayek 08', date: '29 Okt 2026', count: '24 penerima' },
                  { title: 'Pengingat KIR', date: '25 Okt 2026', count: '12 penerima' },
                  { title: 'Perubahan tarif resmi', date: '18 Okt 2026', count: '124 penerima' },
                ].map((item) => (
                  <div key={item.title} className="rounded-md border-[0.5px] border-line-soft p-2.5">
                    <p className="text-xs font-semibold text-ink-strong">{item.title}</p>
                    <p className="text-xs text-ink-soft">
                      {item.date} · {item.count}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 rounded-md border-[0.5px] border-warning/30 bg-peach/40 p-3 text-xs text-ink">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
            Pesan peringatan resmi akan tercatat pada riwayat pembinaan pengemudi.
          </div>
        </div>
      </div>
    </div>
  )
}
