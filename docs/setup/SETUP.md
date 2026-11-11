# Panduan setup dan demo Angkot-Live

Panduan ini mencakup clone repository, instalasi dependency, Supabase lokal, menjalankan aplikasi, demo tiga role, akses HP, pengujian, serta troubleshooting.

Lingkungan MVP memakai **Docker hanya untuk Supabase lokal**. Backend Go dan frontend React/Vite berjalan langsung di komputer. Tidak diperlukan proyek Supabase cloud, Docker aplikasi, atau deployment.

## Daftar isi

1. [Prasyarat](#prasyarat)
2. [Clone dan instalasi dependency](#clone-dan-instalasi-dependency)
3. [Setup Supabase dan data demo](#setup-supabase-dan-data-demo)
4. [Menjalankan aplikasi](#menjalankan-aplikasi)
5. [Akun demo dan quick login](#akun-demo-dan-quick-login)
6. [Demo aplikasi](#demo-aplikasi)
7. [HTTPS dan perangkat kedua](#https-dan-perangkat-kedua)
8. [Pemakaian harian dan pengelolaan database](#pemakaian-harian-dan-pengelolaan-database)
9. [Pengujian](#pengujian)
10. [Konfigurasi environment](#konfigurasi-environment)
11. [Troubleshooting](#troubleshooting)
12. [Ringkasan perintah](#ringkasan-perintah)

## Prasyarat

| Tool | Kebutuhan |
|---|---|
| Git | Untuk clone dan memperbarui source |
| Node.js | Versi **24 atau lebih baru**, beserta npm |
| Go | Versi **1.24 atau lebih baru** |
| Docker | Engine/Desktop aktif dan dapat diakses dari terminal pengguna |
| OpenSSL | Untuk membuat sertifikat HTTPS lokal |
| Browser | Browser modern; gunakan Chrome Android untuk skenario pengujian HP |
| Internet | Untuk unduhan dependency/image awal serta layanan peta, pencarian tempat dan jalur jalan kaki |

Pasang tool yang belum tersedia melalui installer atau package manager sistem Anda, lalu periksa:

```bash
git --version
node --version
npm --version
go version
docker --version
docker info
openssl version
```

`docker info` harus berhasil sebelum memulai Supabase. Supabase CLI sudah dikunci sebagai dependency root; tidak perlu menginstalnya secara global atau menjalankan `supabase init` lagi.

Contoh perintah menggunakan shell Bash di Linux/macOS. Untuk Windows, gunakan lingkungan WSL2 dengan tool proyek dan akses Docker tersedia dari terminal WSL yang sama. Panduan ini tidak mengasumsikan perintah Bash dapat langsung disalin ke PowerShell.

## Clone dan instalasi dependency

Clone repository, lalu masuk ke root proyek:

```bash
git clone https://github.com/angkot-live/angkot-live.git
cd angkot-live
```

Jika repository sudah tersedia di komputer, cukup masuk ke folder tersebut. Semua perintah berikut dijalankan dari **root `angkot-live`**, kecuali dinyatakan berbeda.

Pasang dependency root, frontend, dan backend:

```bash
npm ci --include=dev
npm --prefix apps/web ci --include=dev
go -C apps/api mod download
```

Dependency root menyediakan Supabase CLI; dependency frontend dipasang terpisah karena aplikasi web memiliki `package-lock.json` sendiri. `go mod download` menyiapkan module backend; `dev:api` juga dapat mengunduh module yang belum ada saat dijalankan.

Tidak perlu menyalin `.env.example` untuk workflow lokal ini. Environment akan dibuat oleh command Supabase pada langkah berikutnya.

## Setup Supabase dan data demo

Pastikan Docker aktif, lalu jalankan:

```bash
npm run local:start
npm run db:migrate
npm run demo:seed
npm run local:status
```

Start pertama mengunduh image Supabase dan dapat memerlukan beberapa menit. `local:start` memakai konfigurasi proyek `angkot-live`, menerapkan migration pada database baru, dan membuat environment lokal. `db:migrate` memastikan migration yang belum terpasang ikut diterapkan pada database yang sudah ada.

`local:status` memeriksa Auth, REST dan Storage. Ketiganya harus mengembalikan status berhasil, umumnya `200`. Command ini tidak memulai backend/frontend.

File yang dibuat secara otomatis dan tidak dimasukkan ke Git:

| File | Isi/kegunaan |
|---|---|
| `apps/api/.env` | Koneksi Supabase dan konfigurasi backend lokal |
| `apps/web/.env.local` | Konfigurasi frontend, proxy, port dan demo login |
| `.local/connection.json` | Kredensial lokal untuk tool seed/pengujian |
| `.local/seed-manifest.json` | Mapping ID dan catatan normalisasi data demo |

Kunci service role hanya digunakan backend dan tool lokal. Jangan menyalin file kredensial ke frontend atau membagikannya saat mengirim log.

### Data yang disiapkan seeder

Seeder memakai fixture dari mock frontend, dataset trayek, Supabase Auth dan Storage nyata. Baseline sebelum ada aktivitas pengguna:

| Data | Jumlah awal |
|---|---|
| Akun/profil | 10 |
| Profil pengemudi | 7 |
| Arah trayek / kode jurusan | 82 / 37 |
| Segmen trayek | 104 |
| Halte/terminal | 172 |
| Kendaraan | 14, semuanya offline |
| Dokumen pengemudi privat | 29 |
| Riwayat perjalanan selesai | 4 |
| Laporan | 7 |

Dokumen adalah **contoh demo**, bukan identitas nyata. Seeder tidak membuat GPS aktif, duty terbuka, atau penumpang menunggu. Peta tanpa marker setelah seed adalah kondisi awal yang benar.

`demo:seed` memakai ID stabil dan dapat diulang tanpa menggandakan fixture. Namun, field akun/data demo akan dikembalikan ke contoh awal. Jalankan seed saat belum ada sesi operasional; tidak perlu menjalankannya setiap kali membuka aplikasi.

## Menjalankan aplikasi

Setelah Supabase siap, gunakan terminal terpisah dari root proyek. Biarkan proses backend/frontend tetap berjalan selama aplikasi digunakan.

### Terminal 1: backend

```bash
npm run dev:api
```

Backend membaca `apps/api/.env` dan menjalankan Go API. Secara default API mendengarkan di `127.0.0.1:8080`.

### Terminal 2: frontend

```bash
npm run dev:web
```

Frontend membaca `apps/web/.env.local`, menerima koneksi jaringan melalui Vite, dan meneruskan `/api`, WebSocket serta `/supabase` ke layanan lokal.

### Alamat aplikasi dan layanan

| Layanan | Alamat default |
|---|---|
| Frontend baru, HTTP | `http://localhost:5173` |
| Frontend jika mengikuti setup HTTPS di bawah | `https://localhost:5180` |
| Health backend | `http://127.0.0.1:8080/api/health` |
| Supabase API internal | `http://127.0.0.1:54321` |
| PostgreSQL lokal | `127.0.0.1:54322` |
| Supabase Studio | `http://127.0.0.1:54323` |
| Inbox email lokal | `http://127.0.0.1:54324` |

Gunakan **URL yang dicetak terminal frontend** sebagai acuan. Pengaturan HTTPS/port yang pernah dibuat disimpan di `.local/settings.json` dan dipakai kembali. Port 5180 bukan default instalasi baru.

Periksa backend dari terminal lain:

```bash
curl http://127.0.0.1:8080/api/health
```

Contoh respons untuk dataset awal:

```json
{"ok":true,"routes":82}
```

Peta publik tersedia di `/peta`, daftar trayek di `/trayek`, statistik di `/statistik`, dan login di `/login` pada origin frontend yang sama. Restart backend mengakhiri runtime duty lama; mulai ulang sesi pengemudi atau simulator setelah restart API.

## Akun demo dan quick login

Buka `/login`, lalu gunakan tombol **Penumpang**, **Pengemudi**, atau **Admin** pada bagian quick login. Tombol memakai Supabase Auth nyata; role diambil dari backend.

| Role | Email | Halaman setelah login |
|---|---|---|
| Penumpang | `penumpang@demo.angkot.local` | `/penumpang` |
| Pengemudi | `pengemudi@demo.angkot.local` | `/pengemudi` |
| Admin | `admin@demo.angkot.local` | `/admin` |

Password ketiganya: **`AngkotDemo123!`**.

Gunakan browser, profil browser, atau perangkat terpisah untuk tiga role. Tab biasa dalam profil yang sama berbagi sesi login. Satu jendela normal dan satu incognito dapat dipakai untuk dua role; gunakan profil/browser tambahan untuk role ketiga.

Pengemudi demo utama sudah disetujui dan memakai kendaraan **D 1000 AB**, arah **01A Abdul Muis → Cicaheum via Binong**. Akun contoh `app-1@demo.angkot.local` masih menunggu verifikasi dan `app-5@demo.angkot.local` ditolak, dengan password demo yang sama.

## Demo aplikasi

### Opsi A: seluruh armada berjalan sekaligus

Dengan backend/frontend aktif, buka **terminal ketiga**:

```bash
npm run demo:fleet
```

Command menggerakkan **14 kendaraan seeder** mengikuti trayek dari database. Tidak perlu login manual untuk setiap kendaraan. Buka `/peta`, `/penumpang`, atau `/admin/monitoring` untuk melihat hasilnya.

- Posisi dikirim sekitar setiap 3 detik melalui Auth, API duty, dan WebSocket nyata; semua perangkat menerima stream backend yang sama.
- Marker/detail diberi label **SIMULASI**. Kendaraan mengikuti satu segmen dalam arah trayek, berhenti 12 detik di ujung, lalu memulai duty baru pada segmen berikutnya atau mengulang segmen.
- Kendaraan dengan trayek nonaktif, pengemudi lain, atau sesi manual aktif dilewati. Jumlah yang bergerak dapat kurang dari 14 jika baseline telah berubah.
- Filter jurusan/radius tetap berlaku. Pilih jurusan dan perluas radius jika tidak semua kendaraan terlihat pada peta.
- Pengemudi utama memakai akun demo yang tersedia jika offline. Kendaraan tanpa pengemudi memakai akun/assignment sementara khusus simulasi lokal; tidak ada dokumen verifikasi buatan.
- Simulasi armada memerlukan API HTTP loopback, Supabase lokal, dan flag demo aktif. Posisi bukan fallback animasi frontend.

Tekan **Ctrl+C pada terminal fleet** untuk menghentikan simulasi. Sesi miliknya diakhiri dan akun pengemudi sementara dibersihkan. Data seed, laporan, dan perjalanan pengguna dipertahankan. Perjalanan tetap berlabel `simulation`; referensi ke pengemudi sementara menjadi null setelah akunnya dihapus. Duty/snapshot pengemudi utama tetap sebagai riwayat simulasi, terpisah dari ringkasan GPS operasional.

Jika proses dimatikan paksa, startup berikutnya membersihkan run lama. Untuk cleanup tanpa memulai armada:

```bash
npm run demo:fleet:cleanup
```

Cleanup menolak berjalan selama proses fleet sebelumnya masih hidup. Jangan menjalankan seed/reset atau suite baseline ketika fleet aktif.

### Opsi B: kendalikan satu pengemudi dari browser

1. Login sebagai **Pengemudi** dan buka **Peta Kerja** (`/pengemudi`).
2. Jika kendaraan sedang dikelola fleet, pilih **Offline** terlebih dahulu. Fleet akan melepas kendaraan itu dan tidak mengambilnya kembali.
3. Pilih sumber posisi **Simulasi pengujian lokal**.
4. Atur segmen, titik mulai dan kecepatan, lalu pilih **Narik**.
5. Lihat kendaraan yang sama dari Penumpang/peta publik di browser atau HP lain.
6. Gunakan **Istirahat** atau **Offline** untuk menghentikan publikasi posisi.

Simulator satu pengemudi berhenti di ujung segmen. Pilih Offline untuk mengatur titik mulai baru. Tombol jeda dapat dipakai untuk menguji GPS terputus. Ini berbeda dengan fleet yang mengulang perjalanan otomatis.

Untuk GPS asli, pilih **GPS perangkat**, izinkan lokasi, kemudian Narik. Saat berganti sumber, pilih Offline dahulu. Wake lock diupayakan selama bertugas; perilaku layar terkunci/latar belakang tetap harus diuji pada perangkat fisik.

### Alur penumpang: megat sampai selesai

1. Login **Penumpang**, buka `/penumpang`, dan izinkan lokasi.
2. Pilih tujuan/jurusan yang sesuai arah trayek.
3. Tekan **Megat**. Jika belum dekat jalur, status walking memandu ke titik naik; saat GPS mencapai area trayek status berubah searching.
4. Tunggu kendaraan mendekat. Pengemudi dapat merespons, tetapi respons tidak wajib untuk konfirmasi naik.
5. Saat dekat kendaraan, tekan **Saya naik**. Aplikasi membuka perjalanan aktif.
6. Reload halaman untuk memeriksa pemulihan perjalanan, lalu selesaikan perjalanan.
7. Buka `/penumpang/riwayat`; tarif dan sumber simulasi tersimpan pada perjalanan.

**GPS penumpang harus benar-benar dekat trayek/kendaraan.** Mengetik asal pencarian atau menjalankan fleet tidak memindahkan GPS HP. Jika penguji berada jauh dari Bandung/trayek seed, gunakan rehearsal browser dengan koordinat terkontrol pada bagian pengujian untuk membuktikan flow lengkap.

### Alur laporan dan admin

1. Penumpang membuka `/penumpang/lapor`, memilih kendaraan, mengisi laporan dan mengunggah bukti.
2. Admin membuka `/admin/laporan`, memilih laporan, mengubah status **diterima → diproses → selesai**, dan memberi tanggapan.
3. Penumpang membuka `/penumpang/laporan` untuk melihat timeline serta `/penumpang/notifikasi` untuk pesan terkait.
4. Buka file bukti untuk memeriksa akses Storage privat. File tidak menjadi URL publik permanen.

### Alur verifikasi pengemudi

Gunakan akun pending/rejected atau daftar pengemudi baru untuk menguji onboarding. Pengemudi mengisi data dan mengunggah SIM, STNK, KIR serta foto kendaraan. Admin membuka `/admin/pengemudi`, memeriksa berkas, lalu menyetujui atau menolak dengan alasan. Pengemudi yang ditolak dapat merevisi dan mengirim ulang. Pengemudi belum disetujui tidak bisa mempublikasikan kendaraan.

Berkas mendukung JPEG/PNG/PDF dengan batas 5 MiB per file; foto kendaraan harus berupa gambar. Dokumen seed diberi label contoh demo. Jika ingin mengembalikan status akun contoh setelah mengujinya, hentikan sesi dahulu, lalu seed ulang.

## HTTPS dan perangkat kedua

`localhost` di HP menunjuk HP itu sendiri. Gunakan IP LAN komputer dan HTTPS terpercaya untuk menguji GPS. Contoh di bagian ini memakai **192.168.1.7**, subnet **192.168.1.0/24**, dan port frontend **5180**; ganti IP/subnet sesuai jaringan Anda.

### 1. Cari IP LAN komputer

Pada Linux:

```bash
ip -brief -4 address
```

Pilih alamat Wi-Fi/Ethernet yang digunakan HP, misalnya `192.168.1.7`; abaikan `127.0.0.1` dan interface bridge Docker. Pada macOS/Windows, alamat yang sama dapat dilihat melalui pengaturan jaringan sistem.

### 2. Buat sertifikat dan sinkronkan origin

Hentikan fleet, frontend dan backend dengan Ctrl+C, lalu jalankan dari root proyek:

```bash
npm run local:cert -- --host 192.168.1.7 --port 5180
npm run local:stop
npm run local:start
npm run local:status
```

`local:cert` membuat CA/server certificate, menyimpan `.local/settings.json`, dan menyesuaikan origin Auth. Restart Supabase memuat redirect baru; `local:start` menulis ulang environment frontend/backend. Data database tidak dihapus. Tidak perlu seed ulang.

Jalankan kembali `npm run dev:api` dan `npm run dev:web` di terminal terpisah. Mulai `npm run demo:fleet` lagi jika dibutuhkan.

Untuk HTTPS hanya pada komputer tanpa HP, gunakan `--host localhost --port 5180` dengan urutan restart yang sama.

### 3. Percayai CA pada perangkat

File sertifikat berada di `.local/tls/`. Salin **hanya `ca.crt`** ke HP, lalu cari pengaturan Android **Instal sertifikat → Sertifikat CA**. Nama menu berbeda menurut perangkat. Tutup dan buka kembali browser setelah instalasi jika diperlukan. Percayai CA pada komputer/browser host juga bila mengakses HTTPS dari komputer.

Private key `ca.key` dan `server.key` tetap di komputer. Vite memblokir akses HTTP ke `.local/`; pindahkan `ca.crt` lewat transfer file, bukan dengan mengharapkan sertifikat tersedia sebagai halaman frontend.

Buka dari HP dengan Wi-Fi yang sama:

```text
https://192.168.1.7:5180/login
```

Pastikan halaman bebas peringatan sertifikat, GPS dapat diizinkan, quick login berfungsi, marker bergerak, dan dokumen privat dapat dibuka. Melewati peringatan sertifikat saja belum membuktikan origin dipercaya untuk GPS.

### 4. Firewall dan koneksi LAN

Vite sudah bind ke `0.0.0.0`. Akses HP masuk lewat port frontend; API Go tetap loopback. Proxy Vite meneruskan Auth/Storage/API/WSS sehingga HP tidak perlu mengakses port 8080 atau Supabase secara langsung.

Jika menggunakan UFW dan jaringan contoh di atas:

```bash
sudo ufw status
sudo ufw allow from 192.168.1.0/24 to any port 5180 proto tcp
```

Sesuaikan subnet/port jika berbeda. Hindari Guest Wi-Fi atau pengaturan **AP/client isolation** yang memblokir komunikasi antarperangkat. Matikan VPN sementara saat mendiagnosis koneksi lokal.

Jika IP LAN komputer berubah, ulangi langkah sertifikat dengan IP baru dan restart layanan. CA yang sama biasanya dipakai kembali selama file `.local/tls/ca.key` masih tersedia.

## Pemakaian harian dan pengelolaan database

### Menjalankan kembali setelah komputer dimatikan

1. Aktifkan Docker.
2. Jalankan `npm run local:start` dan, bila diperlukan, `npm run db:migrate`.
3. Jalankan `npm run dev:api` dan `npm run dev:web` pada terminal terpisah.
4. Jalankan `npm run demo:fleet` jika ingin kendaraan demo otomatis.

Tidak perlu clone, instal dependency atau seed ulang. Setelah memperbarui source, ulangi `npm ci --include=dev` pada root/frontend jika lockfile terkait berubah; jalankan `go -C apps/api mod download` jika module Go berubah.

### Menghentikan layanan

Hentikan fleet terlebih dahulu agar cleanup selesai, lalu frontend dan backend dengan Ctrl+C. Terakhir:

```bash
npm run local:stop
```

Perintah tersebut menghentikan Supabase proyek ini dan mempertahankan data lokal.

### Migration dan tipe database

Dengan Supabase aktif:

```bash
npm run db:migrate
npm run db:types
```

Migration ada di `supabase/migrations/`. Tipe aktual ditulis ke `apps/web/src/types/database.generated.ts`. Tidak perlu menjalankan `db:types` untuk sekadar membuka aplikasi.

Lihat tabel melalui Studio. Untuk memeriksa riwayat migration secara read-only:

```bash
docker exec supabase_db_angkot-live psql -U postgres -d postgres -c 'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;'
```

Nama container mengikuti `project_id` pada konfigurasi Supabase; contoh di atas memakai `angkot-live`.

### Memperbarui fixture dan mengulang seed

Jika sengaja mengubah sumber mock/dataset untuk fixture demo:

```bash
npm run demo:export
npm run demo:seed
```

Ekspor menulis `supabase/fixtures/mock-data.json`. Seeder membuat akun Auth, relasi database dan objek Storage; `supabase/seed.sql` saja tidak memprovisikan seluruh data tersebut. Fixture bukan sumber posisi kendaraan runtime.

### Reset total database demo

**Command berikut menghapus database lokal proyek dan mengembalikannya ke baseline demo.** Gunakan hanya jika memang ingin membuang perubahan lokal. Hentikan fleet, backend/frontend dan tes sebelum menjalankannya:

```bash
npm run demo:reset
```

Reset menjalankan migration ulang, menulis environment, lalu seed. Setelah selesai jalankan backend/frontend kembali. Gunakan `local:stop` untuk shutdown biasa; gunakan `demo:seed` jika hanya ingin mengembalikan fixture tanpa reset database total.

## Pengujian

### Unit, lint dan build

Perintah berikut tidak memerlukan stack aplikasi operasional:

```bash
npm run test:sprint1
npm --prefix apps/web test
npm --prefix apps/web run lint
npm --prefix apps/web run build
go -C apps/api vet ./...
go -C apps/api test -race ./...
```

Race detector Go membutuhkan dukungan CGO/compiler C pada lingkungan yang digunakan. `test:sprint1` adalah nama script historis untuk seluruh test root `scripts/*.test.mjs`, termasuk helper simulator armada.

### Persiapan pengujian browser

Pasang Chromium Playwright sekali, dari root proyek:

```bash
npm --prefix apps/web exec -- playwright install chromium
```

Jika browser melaporkan library sistem belum tersedia, pada distro yang didukung Playwright gunakan `npm --prefix apps/web exec -- playwright install --with-deps chromium`; instalasi dependency sistem dapat meminta hak administrator. Pada distro lain, penuhi library yang disebut pada pesan error sesuai package manager sistem.

Untuk suite integrasi/browser di bawah, siapkan **HTTPS localhost port 5180** atau HTTPS IP LAN sesuai bagian perangkat kedua. Ini memastikan `.local/settings.json` tersedia dan sesuai asumsi origin HTTPS suite browser. Pastikan Supabase, backend dan frontend berjalan. Browser otomatis dapat menggunakan opsi `ignoreHTTPSErrors`; itu tidak menggantikan pemasangan CA/pengujian HP.

### Pilih suite sesuai kondisi data

| Perintah | Prasyarat dan cakupan |
|---|---|
| `npm run demo:verify` | Baseline tanpa duty/fleet/trip aktif; mengulang seeder dan memeriksa Auth, jumlah data, RBAC serta berkas |
| `npm run demo:browser` | Smoke browser tiga role dan sesi login |
| `npm run demo:verify:sprint2` | Integrasi trayek/dashboard pada baseline lokal |
| `npm run demo:browser:sprint2` | CRUD trayek melalui browser |
| `npm run demo:verify:sprint3` | Tracking, freshness, timeout dan otorisasi melalui layanan lokal nyata |
| `npm run demo:browser:sprint3` | Tracking lintas context browser dengan GPS terkontrol |
| `npm run demo:verify:fleet` | **Fleet aktif**, setidaknya dua kendaraan; memeriksa gerakan, dua browser, boarding ganda, completion dan riwayat |
| `npm run demo:rehearse` | **Fleet berhenti**, tanpa demo manual aktif; tiga perjalanan end-to-end dengan aktor/transaksi QA sementara |
| `npm run demo:performance` | Rendering 50 marker fixture khusus browser; tidak menulis posisi ke database dan bukan benchmark 4G |
| `npm run demo:audit` | Audit import runtime untuk mock/store/aksi prototipe; tidak membutuhkan server |

Jalankan suite secara berurutan, tidak bersamaan dengan seed/reset atau demo operasional. GPS pada suite otomatis adalah fixture terkontrol dan simulator berlabel, bukan bukti GPS lapangan. Jika baseline telah diubah, hentikan sesi lalu seed ulang hanya jika Anda memang ingin mengembalikan contoh sebelum suite baseline.

Rehearsal default juga menunggu skenario ngetem 90 detik + deadline 15 detik. Untuk rehearsal lebih cepat tanpa mengulang waktu tunggu tersebut:

```bash
DEMO_NGETEM=false npm run demo:rehearse
```

Hasil tersimpan di `.local/`, antara lain `fleet-validation.json`, `fleet-mobile.png`, `sprint45-rehearsal.json`, dan `sprint5-performance.json`. Akun/transaksi QA dibersihkan oleh suite. Jika rehearsal diputus paksa, pastikan proses tes sudah berhenti, lalu jalankan:

```bash
npm run demo:cleanup:rehearsal
```

Cleanup ini khusus namespace akun rehearsal `s45-*`, berbeda dengan `demo:fleet:cleanup`.

### Uji SQL opsional

Dengan Supabase lokal aktif, jalankan masing-masing file pengujian yang memakai transaksi rollback:

```bash
docker exec -i supabase_db_angkot-live psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/mvp_foundation.sql
docker exec -i supabase_db_angkot-live psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/route_management.sql
docker exec -i supabase_db_angkot-live psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/tracking.sql
docker exec -i supabase_db_angkot-live psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/mvp_completion.sql
```

`apps/api/tests/bootstrap.sql` hanya untuk database tes terisolasi; jangan memasangnya ke stack Supabase aplikasi.

### Penerimaan pada dua Android

Periksa secara manual: trust CA, login/refresh tiga role, izin GPS asli, stream WSS lintas perangkat, buka dokumen privat, megat/boarding di dekat trayek, wake lock, perilaku layar terkunci, koneksi ulang serta latensi pada jaringan yang digunakan. Pengujian browser lokal tidak membuktikan target jaringan 4G atau kemampuan browser mempertahankan GPS saat berada di latar belakang.

## Konfigurasi environment

`local:start`/`local:env` menulis environment dari Supabase lokal dan pengaturan `.local/settings.json`. Untuk menulis ulang environment tanpa restart stack yang sudah aktif:

```bash
npm run local:env
```

Restart backend/frontend setelah perubahan environment. Command ini menimpa file environment yang dihasilkan; catat penyesuaian lokal tambahan sebelum menjalankannya.

| Konfigurasi | Nilai/peran pada workflow lokal |
|---|---|
| `SUPABASE_URL` | URL API Supabase loopback untuk backend |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci privat backend/seeder; tidak dikirim ke browser |
| `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY` | Kunci anon lokal; akses pengguna tetap memakai sesi Auth dan aturan server |
| `SUPABASE_PUBLIC_URL` | `/supabase`, agar signed URL privat dapat diakses dari origin frontend |
| `VITE_SUPABASE_URL` | `/supabase`, diteruskan Vite ke Supabase lokal |
| `VITE_API_URL` | `/api`, termasuk jalur WebSocket |
| `API_ADDR` | Default `127.0.0.1:8080` |
| `WEB_ORIGIN`, `WEB_ORIGINS` | Origin frontend yang diizinkan backend |
| `ENABLE_DEMO_LOGIN`, `VITE_ENABLE_DEMO_LOGIN` | `true` pada workflow lokal; quick login memerlukan keduanya dan Supabase backend loopback |
| `LOCAL_HTTPS`, `LOCAL_WEB_PORT`, `LOCAL_API_PORT` | Dibuat dari settings lokal; mengatur HTTPS, port Vite dan proxy API |
| `VITE_WALK_ROUTING_URL` | Opsional, endpoint OSRM pejalan kaki sendiri jika diperlukan |

Untuk workflow MVP ini gunakan generator environment lokal; file `.env.example` memuat placeholder yang belum siap dipakai sebagai koneksi nyata.

## Troubleshooting

### Supabase gagal start / Docker permission denied

Periksa `docker info`. Pastikan daemon/Desktop aktif dan terminal pengguna dapat mengaksesnya. Selesaikan izin Docker sesuai sistem, lalu ulangi `npm run local:start`. Periksa pula port 54321–54324 jika ada stack/proyek lain yang memakai port tersebut.

### Environment atau `.local/connection.json` tidak ditemukan

Jalankan `npm run local:start`. Jika stack sudah berjalan, gunakan `npm run local:env`, kemudian restart backend/frontend. File-file ini memang tidak ikut clone.

### Port frontend/API sudah dipakai

Vite memakai `strictPort`, sehingga tidak pindah port diam-diam. Pada Linux, identifikasi proses terlebih dahulu:

```bash
ss -lntp '( sport = :5173 or sport = :5180 or sport = :8080 )'
```

Hentikan proses proyek lama dengan Ctrl+C di terminalnya, lalu jalankan satu backend dan satu frontend. Jika sengaja mengganti port frontend, gunakan `local:cert -- --host IP-LAN --port PORT` dan urutan restart HTTPS agar origin/proxy tetap selaras.

### HP: “Situs tidak dapat dijangkau”

Pastikan URL mencakup protokol dan port, misalnya `https://192.168.1.7:5180`. Cocokkan dengan IP komputer dan mode HTTPS yang sedang aktif. Uji dari komputer menggunakan CA proyek:

```bash
curl --cacert .local/tls/ca.crt https://192.168.1.7:5180/api/health
```

Jika berhasil di komputer tetapi gagal di HP, periksa IP/subnet HP, firewall port frontend, VPN dan AP/client isolation pada router. Respons dari komputer saja belum membuktikan jalur HP → komputer terbuka. `ERR_CONNECTION_REFUSED` dan `ERR_CONNECTION_TIMED_OUT` membantu membedakan penolakan koneksi dan koneksi yang tidak mendapat respons.

### Peringatan sertifikat / GPS tidak muncul

Pasang CA yang benar pada perangkat, pastikan waktu perangkat sesuai, dan gunakan IP/hostname yang tercakup dalam sertifikat. Jika IP berubah, buat ulang sertifikat server dan restart layanan. Periksa izin lokasi Android dan browser serta pastikan halaman memakai secure context. Jangan menguji GPS HP melalui HTTP IP LAN biasa.

### Quick login tidak tampil atau gagal

Periksa `npm run local:status`, health API, dan keberadaan akun di Studio. Quick login memerlukan flag demo frontend/backend serta Supabase lokal. Jalankan `local:env` jika konfigurasi belum sinkron dan restart aplikasi. Jika akun demo belum diprovisikan, jalankan `demo:seed` sebelum memulai sesi operasional.

Jika menerima `429`, hentikan retry login berulang dan tunggu limiter berakhir sebelum mencoba lagi.

### Peta kosong atau marker hilang

Pastikan backend/WebSocket tersambung dan jurusan/radius cocok. Setelah seed tidak ada kendaraan aktif; jalankan fleet atau mulai Narik dengan GPS/simulator. Untuk GPS pengemudi: akurasi harus maksimal 50 meter dan posisi berada dalam toleransi trayek. Telemetry stale setelah 15 detik, marker dihapus setelah 30 detik, dan lease duty berakhir setelah 60 detik tanpa sampel.

Jika tile peta atau pencarian tempat tidak tersedia sementara katalog/backend sehat, periksa internet/layanan peta eksternal. Aplikasi lokal masih memakai layanan eksternal untuk tile, geocoding dan rute jalan kaki.

### “Sesi tugas aktif pada perangkat lain”

Satu kendaraan/pengemudi hanya boleh memiliki satu sesi tugas aktif. Pilih Offline di Peta Kerja, lalu mulai sesi Anda. Fleet akan melepas kendaraan jika diambil alih. Jangan menjalankan beberapa proses API karena tracking MVP dimiliki satu proses.

### Armada gagal mulai / cleanup belum lengkap

Pastikan API aktif, flag simulasi di `/api/tracking/config` menyatakan aktif, dan 14 kendaraan telah di-seed. Command menolak instance kedua. Hentikan proses fleet di terminalnya; jika sebelumnya dimatikan paksa, jalankan `demo:fleet:cleanup` setelah Supabase tersedia. Tidak perlu reset database untuk cleanup fleet.

### Dokumen atau bukti tidak terbuka

Periksa status Storage, login/role yang benar, dan akses melalui origin frontend yang sama. Gunakan tombol buka file agar signed URL baru dibuat. Seed dokumen contoh memerlukan seeder aplikasi, bukan hanya migration/`seed.sql`. Signed URL lama dapat kedaluwarsa; buka ulang dari halaman aplikasi.

## Ringkasan perintah

| Kebutuhan | Perintah dari root |
|---|---|
| Menyalakan Supabase + menulis env | `npm run local:start` |
| Memeriksa Auth/REST/Storage | `npm run local:status` |
| Memperbarui env dari stack aktif | `npm run local:env` |
| Memasang migration baru | `npm run db:migrate` |
| Membuat tipe database | `npm run db:types` |
| Memasukkan/mengembalikan fixture | `npm run demo:seed` |
| Backend, terminal 1 | `npm run dev:api` |
| Frontend, terminal 2 | `npm run dev:web` |
| Simulasi armada, terminal 3 | `npm run demo:fleet` |
| Menguji armada aktif | `npm run demo:verify:fleet` |
| Cleanup fleet yang sudah berhenti | `npm run demo:fleet:cleanup` |
| Membuat sertifikat HP | `npm run local:cert -- --host 192.168.1.7 --port 5180` |
| Menghentikan Supabase, data tetap ada | `npm run local:stop` |
| Reset seluruh database lokal demo | `npm run demo:reset` |

Referensi: [README root](../../README.md), [PRD](../resource/PRD.md), [rencana integrasi MVP](../planning/MVP_INTEGRATION_PLAN.md), [audit skema](../audit/SCHEMA_AUDIT_MVP.md), [ERD](../planning/erd.md), dan [bukti Sprint 5](../sprint/SPRINT_5.md).

Tip/pembayaran, perjalanan transfer beberapa angkot, pengelolaan pengguna/kendaraan admin lengkap dan broadcast admin berada di luar scope demo MVP saat ini. Deployment bukan bagian dari workflow lokal ini.
