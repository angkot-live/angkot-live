# Sprint 1 — fondasi demo lokal

Tanggal verifikasi: **11 November 2026**. Acuan: [backlog MVP](./MVP_INTEGRATION_PLAN.md), [PRD](./PRD.md), [setup](./SETUP.md).

Sprint goal: tim dapat menjalankan Supabase lokal serta login tiga role dengan data demo yang terhubung. Implementasi dan tes otomatis tersedia. Penerimaan perangkat kedua secara fisik masih perlu dilakukan.

| Story | Hasil | Status |
|---|---|---|
| S1-01 | CLI 2.122.1 dikunci, config lokal, environment privat, start/status/stop/reset; Auth/DB/Storage HTTP 200; Studio/Mailpit tersedia | Diuji lokal |
| S1-02 | Migration ketiga, normalized chain/halte, metadata driver/revisi dokumen, lifecycle/assignment, duty restart; tipe aktual dan ERD | Diuji fresh reset, upgrade data lama dan regresi |
| S1-03 | Ekspor empat modul mock, UUID stabil, Auth Admin API, seed relasi dan objek Storage nyata; mapping/rekonsiliasi di manifest | Seed ulang tanpa perubahan jumlah |
| S1-04 | Quick login tiga role memakai password Auth, `/me`, refresh/reload/logout, driver pending tidak boleh narik | API dan browser nyata lulus |
| S1-05 | Sertifikat lokal/SAN LAN, exact origin allowlist, proxy Auth/API/WSS/Storage, URL dokumen relatif | Otomasi host lulus; **menunggu uji ponsel fisik** |

## Increment

- Root command `local:start`, `local:status`, `local:stop`, `local:env`, `local:cert`, `db:migrate`, `db:types`, `demo:export`, `demo:seed`, `demo:reset`, `demo:verify`, `demo:browser`, `dev:api`, `dev:web`.
- Docker dipakai hanya untuk Supabase lokal. API Go dan Vite berjalan pada host. File deployment/Docker aplikasi tidak dikembangkan dalam sprint ini.
- Migration `20261111100000_mvp_foundation.sql` melengkapi dua migration awal. `sync_route_geometry` menyimpan chain terpisah dan cache kompatibilitas secara atomik; kode trayek tidak unik.
- Profil driver menyimpan alamat/tanggal SIM, dokumen memiliki revisi aktif dan relasi kendaraan. Submit/review memeriksa objek Storage; bucket tetap privat. Admin dapat membuka PDF melalui signed URL 120 detik pada origin frontend.
- Constraint dan trigger menjaga state request, waktu/jarak trip, kapasitas/akurasi, assignment kendaraan–arah serta boarding. Duty menyimpan assignment/mode; API tunggal menutup duty lama saat restart dan menunggu GPS baru.
- Seeder menghasilkan data sintetis berlabel contoh. Tidak ada posisi, ETA, kendaraan live, atau request aktif dari mock. Akun suspended contoh diblokir lewat Supabase Auth ban; CRUD suspend aplikasi belum menjadi pekerjaan sprint ini.
- Tombol login memanggil endpoint login yang sama dengan form. Role berasal dari profil server. Selector memerlukan dua flag lokal dan URL Supabase loopback, tanpa service role key pada browser.

## Baseline data terverifikasi

| Data | Jumlah |
|---|---:|
| Akun / profil driver | 10 / 7 |
| Arah trayek / kode publik | 82 / 37 |
| Segmen / terminal-halte | 104 / 172 |
| Kendaraan terdaftar / live | 14 / 0 |
| Dokumen driver privat | 29 |
| Trip selesai / request dibatalkan | 4 / 1 |
| Laporan / tanggapan | 7 / 5 |
| Pesan | 11 |

Akun utama: `penumpang@demo.angkot.local`, `pengemudi@demo.angkot.local`, `admin@demo.angkot.local`. Password lokal: `AngkotDemo123!`. Driver approved memakai **D 1000 AB**, arah **01A Abdul Muis → Cicaheum via Binong**, tetap offline. Empat pengajuan pending mencakup satu berkas KIR belum lengkap; satu pengajuan ditolak memiliki SIM kedaluwarsa.

`supabase/fixtures/mock-data.json` menyimpan hasil ekspor/sumber hash. `.local/seed-manifest.json` menyimpan mapping ID Auth/UUID dan catatan perubahan: koreksi kode 08→09 dan 02→01A, label trayek ambigu, NIK sintetis, plat laporan manual, serta pesan historis tanpa klaim tip. Seeder tidak menimpa akun non-demo. Field akun/data demo sendiri dikembalikan ke fixture ketika seed diulang.

## Bukti pengujian

1. Supabase start/stop/start dan reset lokal dari kosong berhasil; seluruh migration diterapkan. Auth, PostgREST dan Storage memberikan HTTP 200.
2. `npm run demo:verify`: seed ulang mempertahankan jumlah row, login/JWT/refresh/me ketiga role, assignment offline, transisi offline/logout, trip/laporan, signed PDF aktual, larangan role lain/anon, password salah dan Auth ban.
3. `npm run demo:browser`: Chromium membuka HTTPS LAN dengan Auth/API/WSS asli, quick login tiga role, reload sesi, logout/pergantian akun, riwayat trip, laporan, profil driver dan PDF admin. Tidak ada request interception atau GPS simulasi. Tidak ada error runtime/HTTP API dalam skenario ini.
4. `supabase/tests/mvp_foundation.sql`: constraint negatif, arah koordinat, revisi dokumen, penolakan file hilang, dan chain terputus; seluruh fixture di-rollback.
5. Upgrade di database terisolasi dalam container Supabase: dua migration awal → `apps/api/tests/foundation-upgrade-before.sql` → migration MVP → `foundation-upgrade-after.sql` → `flows.sql`. Backfill profil, revisi lama dan request tidak konsisten lulus; regresi privilege, verifikasi, megat, boarding/completion idempotent, cancel/expiry dan timeline laporan lulus. Database tes dihapus setelah selesai.
6. `go vet ./...`, `go test -race ./...`, test frontend, lint dan build TypeScript/Vite lulus. Lint masih memberi lima warning lama pada router, button, register dan map; build masih memberi warning ukuran chunk. Tidak ada error baru pada file Sprint 1.
7. `curl --cacert .local/tls/ca.crt https://IP-LAN:PORT/api/health` lulus, membuktikan sertifikat server cocok dengan CA yang dibuat. Browser test memakai `ignoreHTTPSErrors` pada context terisolasi; trust store ponsel belum diverifikasi.

Snapshot quick login tersedia setelah browser test di `.local/screenshots/quick-login.png`. Environment, private key, kunci service role dan manifest runtime diabaikan Git.

## Pemeriksaan manual sebelum menerima S1-05

Pada ponsel lain yang terhubung ke Wi-Fi yang sama: instal **hanya** CA publik `.local/tls/ca.crt`, buka URL LAN tanpa peringatan sertifikat, pastikan secure context dan izin GPS tersedia, lalu uji login, WebSocket dan dokumen privat. API/frontend harus memakai origin/port hasil `local:cert` + `local:start` dan di-restart setelah perubahan environment. Perilaku browser saat layar dikunci serta tracking lapangan mengikuti Sprint 3.

## Batas pekerjaan berikutnya

Sprint 2 menangani repository trayek database, CRUD/cache dan dashboard/statistik yang masih memakai mock. Tabel/data hasil seed belum berarti seluruh layar frontend sudah terintegrasi. Preferensi notifikasi, pengelolaan pengguna/kendaraan lanjutan, pesan admin dan pengujian lapangan mengikuti backlog yang sudah ditetapkan. Tidak ada pekerjaan deployment dalam increment ini.
