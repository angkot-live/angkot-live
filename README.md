# Angkot-Live

Platform pelacakan angkot realtime dan transparansi layanan transportasi publik.

Angkot-Live adalah aplikasi web (PWA) yang menampilkan posisi angkot secara realtime di peta, membantu penumpang menemukan angkot dan jurusan yang tepat, serta memberi pengemudi dan instansi alat untuk memantau dan mempertanggungjawabkan kualitas layanan. Aplikasi ini bukan ride-hailing, fokusnya pada informasi keberadaan angkot dan transparansi layanan publik.

**Event:** Multimedia In Action (MIA) 2026, Web In Action (WIA)
**Subtema:** Public Service Tracking
**Tim:** unjuk kebolehan
**Tahap:** First Draft Submission

---

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React + Vite (SPA/PWA), Leaflet / MapLibre |
| Backend | Go + Fiber (modular monolith) |
| Realtime | WebSocket (hub per jurusan) |
| Database | Supabase (PostgreSQL + PostGIS), Supabase Auth + RLS |

---

## Fitur Utama

- **Penumpang:** peta angkot realtime, status angkot (`ngetem` / `jalan` / `merayap`), rekomendasi jurusan, megat angkot, hotline pelaporan.
- **Pengemudi:** kirim GPS berkala, atur status, lihat penumpang di sekitar rute.
- **Admin / instansi:** verifikasi pengemudi, kelola trayek, monitoring realtime, tindak lanjut laporan.
- **Publik:** peta tanpa login dan halaman statistik transparansi layanan.

---

## Cara menjalankan

Prasyarat: **Node.js 24+, Go 1.24+, Docker aktif**, serta OpenSSL untuk HTTPS. Docker hanya dipakai untuk Supabase lokal; backend dan frontend berjalan langsung di komputer. Semua perintah berikut dijalankan dari **root proyek**.

**1. Setup pertama kali**

```bash
npm ci --include=dev
npm --prefix apps/web ci --include=dev
npm run local:start
npm run db:migrate
npm run demo:seed
```

Untuk pemakaian berikutnya, cukup `npm run local:start`; jalankan `npm run db:migrate` jika ada migration baru. Instalasi dan seed tidak perlu diulang. Seed mengembalikan data akun demo ke contoh awal; jalankan sebelum memulai sesi demo.

**2. Backend — terminal pertama**

```bash
npm run dev:api
```

**3. Frontend — terminal kedua**

```bash
npm run dev:web
```

Buka URL yang dicetak frontend. Default instalasi baru: **http://localhost:5173**. Jika memakai konfigurasi HTTPS demo yang sudah disiapkan: **https://localhost:5180**. Database dapat dilihat melalui Supabase Studio di **http://localhost:54323**.

## Demo aplikasi

**Gerakkan seluruh armada — terminal ketiga:**

```bash
npm run demo:fleet
```

Seluruh **14 angkot seeder** bergerak mengikuti trayek melalui backend/WebSocket dan tampil berlabel **SIMULASI**. Kendaraan yang sedang dikendalikan manual dilewati. Pilih semua jurusan/perluas radius jika marker tidak terlihat.

Buka `/login`, lalu pilih tombol **Quick Login**. Gunakan browser/profil berbeda atau incognito agar sesi antar-role terpisah.

| Role | Email | Halaman |
|---|---|---|
| Penumpang | `penumpang@demo.angkot.local` | `/penumpang` |
| Pengemudi | `pengemudi@demo.angkot.local` | `/pengemudi` |
| Admin | `admin@demo.angkot.local` | `/admin` |

Password ketiganya: **`AngkotDemo123!`**.

Alur demo singkat:

1. **Publik:** buka `/peta`, pilih jurusan, lihat pergerakan dan detail angkot.
2. **Penumpang:** izinkan GPS → pilih jurusan → Megat → Saya naik → Selesai → lihat riwayat. GPS penumpang harus dekat trayek/kendaraan; simulasi armada tidak memindahkan lokasi penumpang.
3. **Laporan:** penumpang buat laporan beserta bukti → admin buka `/admin/laporan` → ubah status dan beri tanggapan → penumpang cek timeline/notifikasi.
4. **Pengemudi manual:** di Peta Kerja pilih Offline untuk melepas kendaraan dari fleet, pilih sumber **Simulasi pengujian lokal**, lalu Narik. Kendaraan demo utama: **D 1000 AB**.

Pengujian demo otomatis: `npm run demo:verify:fleet` saat armada aktif. Untuk rehearsal tiga perjalanan dengan GPS penumpang terkontrol, hentikan fleet terlebih dahulu, lalu jalankan `npm run demo:rehearse`. Pengujian browser memerlukan Chromium Playwright; instal sekali dengan `cd apps/web` lalu `npx playwright install chromium`, setelah itu kembali ke root proyek.

## Akses dari HP

Gunakan Wi-Fi yang sama dan IP LAN komputer, **bukan localhost**. Untuk konfigurasi HTTPS demo port 5180, contoh alamatnya **`https://192.168.1.7:5180`**; sesuaikan dengan IP komputer. Instal `.local/tls/ca.crt` sebagai CA terpercaya di HP agar GPS dapat digunakan. Konfigurasi sertifikat/IP dan firewall dijelaskan di [panduan HTTPS perangkat kedua](docs/setup/SETUP.md#https-dan-perangkat-kedua).

## Menghentikan aplikasi

Tekan **Ctrl+C** di terminal fleet terlebih dahulu agar akun/sesi sementara dibersihkan, kemudian di terminal frontend dan backend. Hentikan Supabase dengan `npm run local:stop`; data lokal tetap tersimpan. Jika fleet sebelumnya dimatikan paksa, jalankan `npm run demo:fleet:cleanup` setelah prosesnya berhenti.

Panduan lengkap: [setup lokal](docs/setup/SETUP.md), [skenario demo](docs/setup/SETUP.md#demo-aplikasi), [PRD](docs/resource/PRD.md), [status fitur dan roadmap](ROADMAP.md), dan [rencana integrasi MVP](docs/planning/MVP_INTEGRATION_PLAN.md). Tip/pembayaran dan perjalanan transfer beberapa angkot masih di luar MVP; uji GPS/layar terkunci pada HP fisik tetap perlu dilakukan.

---

## Tim

| Nama Lengkap | Peran |
|---|---|
| Raditya Rizki R | Fullstack |
| Ridwan Hakim R | Fullstack |
| WIldan Satya N | Frontend |

---

## Lisensi

Hak cipta karya tetap milik peserta sesuai ketentuan MIA 2026.
