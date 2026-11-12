# Hasil pengujian

Pelaksanaan sesi: 11 November 2026. Lingkungan Linux amd64, Node.js v26.13.0, Go go1.27.3-X:nodwarf5, Playwright Chromium headless v1248. Minimum proyek tetap Node 24 dan Go 1.24; sesi ini bukan bukti kompatibilitas seluruh versi minimum.

Docker tidak tersedia (`docker: command not found`), PostgreSQL lokal tidak aktif, `.local/connection.json` belum tersedia. Pengujian browser memakai Vite lokal dan fixture respons API/WS, bukan Supabase nyata. Test mengisolasi fixture di script Playwright; tidak ada mock yang ditambahkan ke aplikasi operasional.

## Otomatis

| Tes/perintah | Langkah dan harapan | Hasil aktual | Status |
|---|---|---|---|
| npm --prefix apps/web test | Jalankan semua unit frontend; semua lulus | 50/50 lulus, baseline dan setelah perubahan | PASS |
| node --test scripts/*.test.mjs | Unit helper konfigurasi dan guard simulator | 7/7 lulus; termasuk default HTTP, HTTPS LAN, malformed JSON dan loopback guard | PASS |
| npm --prefix apps/web run lint | Periksa source dan scripts | Exit 0; tiga warning existing pada router, button dan register-passenger | PASS dengan warning |
| npm --prefix apps/web run build | TypeScript project build dan Vite produksi | Exit 0; bundle berhasil dibuat | PASS |
| go -C apps/api vet ./... | Analisis Go tanpa diagnostik | Exit 0 | PASS |
| go -C apps/api test -race ./... | Unit geo, httpapi dan tracking | Semua package pengujian lulus; tidak ada race terlapor | PASS |
| node scripts/audit-runtime.mjs | Telusuri imports main.tsx; tolak mock/store domain lama/toast-only | 87 modul; audit lulus | PASS |
| npm run demo:coordinates | Ambil titik dari geometri kendaraan seed utama | D 1000 AB, route 3415464, titik -6.927643, 107.605832 | PASS sebagai pemeriksaan data file |
| npm run demo:preflight | Auth, API/katalog dan web harus terhubung | Frontend lulus; konfigurasi Supabase dan backend gagal | FAIL yang diharapkan pada lingkungan belum disiapkan |

## Browser lokal dengan fixture

Server: `VITE_SUPABASE_URL=http://127.0.0.1:9001 VITE_SUPABASE_ANON_KEY=test-anon npm --prefix apps/web run dev -- --host 127.0.0.1 --strictPort`. URL fixture Auth bukan layanan produksi. Backend respons/WS diintersep oleh script browser.

| Tes | Langkah/hasil yang diharapkan | Aktual | Status |
|---|---|---|---|
| npm run demo:offline | Harness demo interaktif dua jendela: Vite sendiri, login fixture P/D, simulasi Narik, Megat, respons, boarding, reload, completion, riwayat, Offline | `DEMO_SMOKE=1` dijalankan headless: seluruh alur lulus (Narik → Megat → respons → naik → reload → selesai → Offline), exit 0. Jendela visual tidak dijalankan pada sesi ini | PASS fixture (headless) |
| npm --prefix apps/web run test:browser | Login P, Megat, boarding, reload trip, completion, laporan; login D, publish GPS, istirahat; pesan koneksi terputus | Semua assertion lulus; tidak ada pageerror; dijalankan tiga kali berturut-turut setelah fixture snapshot dijeda | PASS fixture |
| npm --prefix apps/web run test:landing | Menu tablet 900 px, navigasi menutup drawer, FAQ, pemisahan GPS/simulasi, CTA Cari Trayek memfokuskan kolom tujuan, viewport 390/1440 tanpa overflow, retry statistik | Semua assertion lulus | PASS fixture |
| Walkthrough dua konteks fixture | Konteks P dan D terpisah: landing, login D, simulasi, Narik, login P, Megat, respons D, boarding, reload, completion, riwayat, Offline | 13 screenshot tersimpan di `/tmp/opencode/angkot-demo/`; setiap halaman memakai badge DEMO FIXTURE | PASS fixture |

Walkthrough dua konteks dijalankan dengan skrip sementara di `/tmp/opencode/angkot-demo-walkthrough.mjs`; skrip ini tidak masuk repo dan bukan pengganti rehearsal Supabase nyata. Regression nav awal gagal karena tombol Buka menu tidak terlihat pada 900 px. Setelah breakpoint diperbaiki, tes lulus. Regression informasi driver awal gagal karena pesan disconnected belum ada; setelah perubahan, lulus. Review independen menemukan assertion flow yang flaky karena snapshot 250 ms menimpa status disconnected; fixture sekarang dijeda sebelum assertion dan tes dijalankan ulang tiga kali. Tes helper konfigurasi gagal sebelum modul dibuat, lalu lulus setelah implementasi.

Screenshot landing desktop/mobile tersimpan pada sesi ini di `/tmp/angkot-screening/landing-1440.png` dan `landing-390.png`; gambar memakai data fixture, bukan bukti armada nyata. Log pengujian sementara berada di `/tmp/angkot-screening/`. Direktori `/tmp` tidak termasuk artefak clone dan dapat terhapus; hasil terstruktur pada dokumen ini tetap terlacak Git.

## Integrasi layanan nyata

| Tes | Langkah dan harapan | Aktual/blokir | Status |
|---|---|---|---|
| SQL bootstrap/migration/flows | Pipeline seperti CI: bootstrap, migration berurutan dan flows.sql pada PostGIS bersih | Percobaan `psql -v ON_ERROR_STOP=1 -f apps/api/tests/bootstrap.sql` gagal: socket PostgreSQL tidak tersedia; migration tidak dijalankan | BLOCKED |
| npm run demo:rehearse | Tiga iterasi dua role nyata, SQL/Storage/Auth/WS, cleanup | Dijalankan; berhenti pada ENOENT .local/connection.json sebelum mutasi | BLOCKED |
| Browser Sprint 1/2/3 dan verifikasi fleet | Stack lokal terisi, akun dan fleet sesuai prasyarat | Tidak dijalankan terpisah karena stack yang sama belum tersedia | NOT RUN |
| npm run demo:performance | Browser pada stack aktual dan pengukuran target | Tidak dijalankan; tidak melaporkan angka performa baru | NOT RUN |
| Audit manual dua role dengan database nyata | Ikuti PASSENGER_DRIVER_DEMO, reload dan lihat riwayat DB | Belum tersedia backend/Supabase | BLOCKED |

## Penerimaan perangkat fisik

Semua berikut **NOT RUN**: GPS dua Android, trust CA, WSS LAN, izin lokasi, refresh token setelah sesi lama, jaringan 4G, layar terkunci/background, wake lock, baterai, screen reader dan audit kontras penuh. Tidak ada perangkat Android yang diuji dalam sesi ini.

Untuk setiap pengujian perangkat, catat tanggal, model, OS/browser, langkah, expected, actual, PASS/FAIL dan bukti. Pengujian emulator/Playwright tidak menggantikan penerimaan tersebut.


## Verifikasi ulang — 12 November 2026

Workspace memuat commit `e851707` dan perbaikan review sesudahnya. Lingkungan Node/Go tetap sama. Log sementara terbaru berada di `/tmp/angkot-final/`; log sesi sebelumnya tidak tersedia setelah pergantian lingkungan.

- **PASS:** 50 unit frontend, 7 unit root, TypeScript/Vite build, Go vet dan Go race. Lint exit 0 dengan tiga warning existing.
- **PASS fixture:** landing smoke pada 390/768/900/1024/1280/1440 px, hash Cara Kerja, fokus CTA pencarian, label simulasi dan retry statistik; flow browser lengkap.
- **PASS fixture:** `LOCAL_HTTPS=true DEMO_SMOKE=1 npm run demo:offline` setelah perbaikan review. Harness tetap memakai HTTP loopback, alur dua role selesai dan halaman Statistik terbuka setelah Offline dengan state armada kosong.
- **Regression teramati:** smoke statistik sebelum perbaikan memunculkan error `StatisticsPage` karena `activeByRoute` tidak tersedia. Fixture kini mengisi seluruh kontrak agregat dan menghitung armada aktif dari duty.
- **PASS:** audit imports runtime 87 modul dan `git diff --check`.
- **Review independen:** tiga temuan ditangani: penghapusan lock apt/dpkg di CI dihilangkan; harness mengesampingkan LOCAL_HTTPS konfigurasi normal; statistik fixture dilengkapi. Workflow GitHub Actions belum dijalankan ulang pada runner hosted dalam sesi ini.
- **BLOCKED/NOT RUN tetap berlaku:** integrasi Supabase/PostGIS nyata, rehearsal database dan penerimaan Android. Tidak ada klaim baru kesiapan produksi.
