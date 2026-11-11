import { Link } from 'react-router-dom'

const journeys = [
  { title: 'Perjalanan penumpang', steps: ['Buka peta dan pilih asal serta tujuan.', 'Pilih jurusan dan arah; pantau posisi angkot.', 'Aktifkan Megat. Dekati titik naik bila masih berjalan.', 'Pilih Saya naik saat kendaraan dekat dan Anda benar-benar naik.', 'Selesaikan perjalanan dan lihat riwayat.'], to: '/penumpang', action: 'Buka peta penumpang' },
  { title: 'Ruang kerja pengemudi', steps: ['Masuk dengan akun yang disetujui admin.', 'Periksa kendaraan, arah trayek dan izin lokasi.', 'Pilih Narik untuk membagikan GPS perangkat.', 'Respons sinyal Megat bila Anda melihat penumpang.', 'Pilih Istirahat atau Offline saat berhenti bertugas.'], to: '/pengemudi', action: 'Buka peta kerja' },
]
const questions = [
  ['Apakah Angkot Live gratis?', 'Demo aplikasi dapat diakses tanpa biaya. Tarif perjalanan angkot tetap berlaku; pembayaran tidak diproses aplikasi.'],
  ['Apakah peta perlu login?', 'Peta, katalog trayek dan statistik terbuka untuk publik. Megat, riwayat dan pelaporan memerlukan akun penumpang.'],
  ['Apa itu Megat?', 'Megat menandakan Anda menunggu angkot. Lokasi segar hanya ditampilkan kepada pengemudi yang memenuhi aturan trayek, arah dan kedekatan.'],
  ['Apakah ini aplikasi pemesanan angkot?', 'Tidak. Respons pengemudi berarti sinyal Anda terlihat, bukan jaminan penjemputan atau reservasi kursi.'],
  ['Mengapa tidak ada kendaraan?', 'Pengemudi mungkin belum bertugas, GPS tidak segar, filter terlalu sempit atau koneksi terputus. Periksa status koneksi dan pilihan trayek.'],
  ['Bagaimana membedakan GPS dan simulasi?', 'Kendaraan pengujian memiliki label SIMULASI. Simulasi armada tidak memindahkan GPS penumpang. ETA hanya tersedia saat data lokasi dan arah memadai.'],
  ['Bagaimana melaporkan masalah?', 'Masuk sebagai penumpang, buka Laporan, tulis kejadian dan sertakan bukti bila tersedia. Pantau tanggapan admin pada detail laporan.'],
]
export function LandingGuide() {
  return <>
    <section className="container-page py-14">
      <h2 className="text-3xl font-bold">Dari mencari jurusan sampai selesai perjalanan</h2>
      <div className="mt-8 grid gap-6 md:grid-cols-2">{journeys.map((j) => <article key={j.title} className="rounded-xl border border-line-soft bg-surface p-6 md:p-8"><h3 className="text-xl font-bold">{j.title}</h3><ol className="mt-6 space-y-5">{j.steps.map((step, i) => <li key={step} className="flex gap-3 text-sm leading-relaxed"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand-strong">{i + 1}</span><span>{step}</span></li>)}</ol><Link to={j.to} className="mt-6 inline-flex min-h-11 items-center font-bold text-brand">{j.action} →</Link></article>)}</div>
      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink">Megat memberi informasi penumpang menunggu. Respons pengemudi tidak menjamin penjemputan. Konfirmasi naik tetap diperiksa server. Statistik berasal dari API aplikasi; armada aktif dapat mencakup simulasi.</p>
    </section>
    <section className="border-y border-line-soft bg-muted py-14"><div className="container-page grid gap-8 md:grid-cols-[1fr_2fr]"><div><h2 className="text-2xl font-bold">Informasi terbuka, layanan lebih mudah dipahami.</h2><p className="mt-4 text-sm leading-relaxed text-ink">Pengemudi diverifikasi admin aplikasi. Laporan dan tanggapannya dapat ditelusuri pelapor. Proyek kompetisi ini tidak mengklaim kemitraan resmi pemerintah.</p></div><div><h2 className="mb-5 text-2xl font-bold">Pertanyaan yang sering muncul</h2>{questions.map(([q, a]) => <details key={q} className="border-b border-line py-3"><summary className="cursor-pointer py-2 font-semibold focus-visible:outline-2 focus-visible:outline-brand">{q}</summary><p className="mt-3 pb-2 text-sm leading-relaxed text-ink">{a}</p></details>)}</div></div></section>
  </>
}
