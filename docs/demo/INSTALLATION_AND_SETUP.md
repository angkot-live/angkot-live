# Instalasi dan setup

Semua perintah dari root repo kecuali dinyatakan berbeda. Dibutuhkan Node.js 24+, npm, Go 1.24+, Git, Docker aktif, OpenSSL dan ruang untuk image Supabase serta Chromium. Referensi lengkap: [SETUP](../setup/SETUP.md).

## Sekali saat instalasi

```bash
git clone https://github.com/angkot-live/angkot-live.git
cd angkot-live
npm ci --include=dev
npm --prefix apps/web ci --include=dev
npm --prefix apps/web exec -- playwright install chromium
npm run local:start
npm run db:migrate
npm run demo:seed
```

`local:start` menjalankan Supabase lokal, membuat konfigurasi koneksi privat di `.local/`, environment API dan environment web. Jika perintah instalasi browser dari root tidak cocok dengan versi npm Anda, jalankan `npx playwright install chromium` dari `apps/web`.

`demo:seed` membuat akun contoh, berkas sintetis dan data dasar; seed mengembalikan data contoh ke kondisi awal. Jalankan sebelum sesi demo, bukan saat perjalanan berlangsung. Jangan menjalankan seed terhadap database operasional. Helper koneksi menolak Supabase selain loopback lokal.

Environment tidak perlu disalin manual untuk workflow lokal. Jika stack sudah aktif tetapi environment hilang:

```bash
npm run local:env
```

Jangan salin service-role key ke variabel `VITE_*`, chat, screenshot atau Git. `.env.example` menunjukkan nama variabel, bukan kredensial siap pakai.

## Setiap hari

```bash
npm run local:start
```

Jalankan `npm run db:migrate` bila ada migration baru. Buka dua terminal tambahan:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Lalu dari terminal lain:

```bash
npm run local:status
npm run demo:preflight
```

Preflight hanya membaca kesehatan Auth, API/katalog dan frontend. Preflight bukan pengujian transaksi atau bukti perangkat. Backend langsung default `http://127.0.0.1:8080/api/health`; frontend default `http://localhost:5173`; Studio `http://localhost:54323`. Ikuti URL terminal jika konfigurasi berbeda.

API mereset duty aktif dan lokasi live saat mulai karena tracker MVP memakai memori satu proses. Setelah restart backend, pengemudi harus mulai Narik kembali. Riwayat perjalanan tidak dihapus oleh reset runtime tersebut.

## Akun dan sesi

Buka `/login`. Bagian **Masuk cepat demo lokal** dengan tombol Penumpang, Pengemudi, dan Admin hanya tersedia bila flag demo frontend dan backend aktif pada lingkungan lokal.

| Role | Email | URL setelah login |
|---|---|---|
| Penumpang | penumpang@demo.angkot.local | /penumpang |
| Pengemudi | pengemudi@demo.angkot.local | /pengemudi |
| Admin | admin@demo.angkot.local | /admin |

Password seed: `AngkotDemo123!`. Gunakan dua profil browser berbeda agar Supabase Auth tidak berbagi sesi. Akun driver seed disetujui dan mendapat assignment. Akun driver baru memerlukan onboarding dan persetujuan admin.

## HTTPS dan Android

Pada Wi-Fi yang sama, tentukan IP LAN komputer, misalnya `192.168.1.7`:

```bash
npm run local:cert -- --host 192.168.1.7 --port 5180
npm run local:stop
npm run local:start
npm run local:env
```

Restart API dan web setelah konfigurasi berubah. Percayai **hanya** `.local/tls/ca.crt` sebagai CA pada perangkat demo; jangan membagikan private key. Buka `https://192.168.1.7:5180` dari HP, bukan localhost. Pastikan firewall mengizinkan port web pada jaringan privat. Backend dan Supabase diproxy melalui origin web.

Untuk preflight HTTPS dengan CA lokal yang belum dipercaya Node, jalankan:

```bash
NODE_EXTRA_CA_CERTS=.local/tls/ca.crt npm run demo:preflight
```

Perintah ini mempercayai CA demo secara eksplisit tanpa mematikan verifikasi TLS. Untuk HTTP localhost cukup `npm run demo:preflight`.

GPS browser umumnya memerlukan secure context. HTTP localhost pada komputer dapat digunakan untuk rehearsal browser. Pada HP LAN gunakan HTTPS dengan CA yang dipercaya. Prosedur OS/browser berbeda; lihat [panduan perangkat kedua](../setup/SETUP.md#https-dan-perangkat-kedua).

Instalasi CA tidak membuktikan GPS, wake lock, WSS atau tracking layar terkunci berfungsi. Catat hasil perangkat fisik secara terpisah.

## Shutdown dan menjalankan kembali

1. Selesaikan perjalanan penumpang dan pilih Offline pada driver.
2. Hentikan fleet dengan Ctrl+C jika aktif; tunggu cleanup.
3. Hentikan terminal web dan API dengan Ctrl+C.
4. Jalankan `npm run local:stop`; data lokal tetap tersimpan.
5. Pada startup berikutnya jalankan urutan harian. Seed tidak perlu diulang kecuali sengaja menyiapkan ulang contoh.

Jangan memakai `demo:reset` sebagai recovery presentasi: perintah tersebut menghancurkan database lokal dan membuat seed ulang.
