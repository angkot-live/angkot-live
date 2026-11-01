import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const faqs = [
  {
    question: 'Bagaimana cara melihat posisi angkot secara realtime?',
    answer:
      'Buka halaman Peta Live. Posisi angkot diperbarui dari GPS pengemudi setiap beberapa detik. Pilih jurusan atau ketuk marker angkot untuk melihat detail perjalanan dan ETA.',
  },
  {
    question: 'Apakah aplikasi ini gratis?',
    answer:
      'Ya. Angkot-Live gratis untuk penumpang. Tarif angkot tetap dibayarkan langsung ke pengemudi sesuai ketentuan pemerintah daerah.',
  },
  {
    question: 'Bagaimana cara melaporkan pengemudi ugal-ugalan?',
    answer:
      'Masuk sebagai penumpang, buka menu Lapor, pilih kendaraan dan kategori laporan, lalu tulis kronologi singkat. Laporan akan diteruskan ke petugas Dishub.',
  },
  {
    question: 'Kenapa angkot di peta tidak bergerak?',
    answer:
      'Pengemudi mungkin sedang ngetem, beristirahat, atau kehilangan sinyal GPS. Status kendaraan terlihat pada badge di kartu detail angkot.',
  },
  {
    question: 'Bagaimana cara mendaftar sebagai pengemudi?',
    answer:
      'Pilih Daftar lalu Pengemudi. Siapkan NIK, SIM, STNK, KIR, dan foto kendaraan. Verifikasi biasanya selesai dalam 1–3 hari kerja.',
  },
  {
    question: 'Apakah data lokasi saya disimpan?',
    answer:
      'Lokasi hanya dipakai selama perjalanan aktif untuk menghitung ETA dan menampilkan angkot terdekat. Riwayat lokasi tidak dibagikan ke pihak ketiga.',
  },
]

const contacts = [
  {
    icon: Phone,
    title: 'Call center Dishub',
    detail: '(022) 123-4567',
    note: 'Senin–Jumat, 08.00–16.00',
  },
  {
    icon: Mail,
    title: 'Email pengaduan',
    detail: 'halo@angkot-live.id',
    note: 'Dibalas maksimal 2 hari kerja',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp layanan',
    detail: '0812-3456-7890',
    note: 'Chatbot 24 jam',
  },
]

export function HelpPage() {
  const [query, setQuery] = useState('')

  const filteredFaqs = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return faqs
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(term) || faq.answer.toLowerCase().includes(term),
    )
  }, [query])

  return (
    <div className="container-page py-8 md:py-10">
      <div className="max-w-2xl">
        <Badge variant="leaf" className="gap-1.5">
          <BookOpen size={13} />
          Pusat bantuan
        </Badge>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-strong md:text-4xl">
          Ada yang bisa kami bantu?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          Temukan jawaban seputar perjalanan, laporan, dan pendaftaran pengemudi. Jika belum
          terjawab, hubungi petugas kami.
        </p>
      </div>

      <Card className="mt-6 max-w-2xl">
        <CardContent className="p-3 md:p-4">
          <Input
            icon={<Search size={16} />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari topik bantuan, misalnya “lapor” atau “tarif”"
            aria-label="Cari bantuan"
          />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ink-strong">Pertanyaan umum</h2>
          {filteredFaqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-md border border-line-soft bg-surface p-4 open:border-brand/30 open:bg-leaf/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-strong [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  size={16}
                  className="shrink-0 text-ink-soft transition group-open:rotate-180"
                />
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-ink">{faq.answer}</p>
            </details>
          ))}

          {filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                <Search size={24} className="text-ink-soft" />
                <p className="text-sm font-semibold text-ink-strong">Topik tidak ditemukan</p>
                <p className="text-xs text-ink">Coba kata kunci lain atau hubungi petugas.</p>
                <Button size="sm" variant="outline" onClick={() => setQuery('')}>
                  Reset pencarian
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-4 md:p-5">
              <h2 className="text-sm font-bold text-ink-strong">Hubungi kami</h2>
              <div className="mt-3 flex flex-col gap-3">
                {contacts.map((contact) => (
                  <div key={contact.title} className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-leaf text-brand-strong">
                      <contact.icon size={15} />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-ink-strong">{contact.title}</p>
                      <p className="text-xs text-brand-strong">{contact.detail}</p>
                      <p className="text-[10px] text-ink">{contact.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-leaf">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center gap-2 text-brand-strong">
                <ShieldCheck size={16} />
                <p className="text-sm font-bold">Lapor lewat aplikasi</p>
              </div>
              <p className="mt-1 text-xs text-brand-strong/75">
                Laporan lewat aplikasi otomatis tercatat dengan kode tiket dan bisa dilacak.
              </p>
              <Button size="sm" className="mt-3" asChild>
                <Link to="/login">
                  Masuk untuk melapor
                  <ArrowRight size={14} />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center gap-2 text-ink-strong">
                <MapPin size={15} className="text-brand" />
                <p className="text-sm font-bold">Kantor Dishub</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-ink">
                Jl. Sukajadi No. 1, Bandung
                <br />
                Senin–Jumat, 08.00–16.00 WIB
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
