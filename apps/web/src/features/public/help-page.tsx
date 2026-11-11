import {
  ArrowRight,
  ChevronDown,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

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
      'Pilih Daftar lalu Pengemudi. Siapkan NIK, SIM, STNK, KIR, dan foto kendaraan. Status pemeriksaan dan alasan perbaikan tampil di halaman verifikasi.',
  },
  {
    question: 'Apakah data lokasi saya disimpan?',
    answer:
      'Lokasi membantu pencarian angkot dan perjalanan. Saat megat aktif, lokasi menunggu dapat terlihat oleh pengemudi sesuai arah dan radius. Riwayat perjalanan hanya tersedia untuk akun yang berwenang.',
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
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-strong md:text-4xl">
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
              className="group rounded-md border-[0.5px] border-line-soft bg-surface p-4 open:border-brand/30 open:bg-leaf/30"
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


        </div>
      </div>
    </div>
  )
}
