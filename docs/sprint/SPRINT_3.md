# Sprint 3 — tracking, pencarian langsung dan simulator pengujian lokal

Tanggal: **11 November 2026**. Acuan: [PRD](./PRD.md), [backlog MVP](./MVP_INTEGRATION_PLAN.md), [setup](./SETUP.md).

Implementasi utama tersedia dan sudah diuji pada Supabase Auth, API Go, dan WebSocket lokal. **Acceptance GPS asli dua Android belum dilaksanakan.** Atas permintaan pengguna, ditambahkan simulator opt-in agar gerakan pengemudi dapat diuji tanpa bepergian. Simulator tidak menjadi seed atau fallback otomatis.

| Story | Hasil implementasi | Verifikasi |
|---|---|---|
| S3-01 | Duty diserialisasi dengan publikasi GPS; session ID persisten; approval, assignment, arah aktif dan akun Auth diperiksa ulang; peta/dashboard memakai status bersama | Go race, SQL, Auth/API/WS nyata; sesi perangkat lain ditolak; revoked/pending/rejected tidak tampil |
| S3-02 | Marker/detail/plat/nama pengemudi, filter arah/radius, ETA dari GPS penumpang yang segar; peta driver menunggu posisi valid sebelum menampilkan marker | Unit ETA/filter, browser tiga context; origin pencarian manual tidak menjadi lokasi aktual |
| S3-03 | Backend menentukan arah, chain, titik naik/turun dan offset rekomendasi langsung; frontend merakit petunjuk dari hasil tersebut | Unit direct plan, API/SQL arah terputus, browser; geocoding gagal memberi error terkontrol dan kegagalan walking tidak menggambar jalur buatan |
| S3-04 | Reconnect, watchdog browser, refresh JWT, stale/remove, lease duty, akurasi/urutan/rate/jump GPS, indikator ACK/error dan wake lock | Unit Go, API/WS waktu nyata, browser fault injection; wake lock/GPS latar belakang ponsel tetap perlu diperiksa |
| S3-05 | Simulator lokal berlabel, kontrol kecepatan/titik awal/segmen/jeda, provenance database dan isolasi ringkasan pengemudi | Tambahan pengguna; unit simulator, guard Go, SQL provenance/ringkasan dan browser tanpa izin GPS |

## Menjalankan dan mencoba dengan dua Android

Supabase tetap satu-satunya bagian yang memakai Docker. API dan Vite berjalan langsung di host. Terapkan migration tambahan sebelum memulai API:

```bash
npm run db:migrate
npm run dev:api
# terminal lain
npm run dev:web
```

Gunakan alamat HTTPS yang dicetak Vite, saat verifikasi lokal ini **https://192.168.1.7:5180**. Kedua Android harus berada pada Wi-Fi yang sama. Ikuti [trust CA lokal](./SETUP.md#https-dan-perangkat-kedua); penerimaan sertifikat pada browser otomatis bukan bukti trust CA pada ponsel.

1. Android pertama: quick login **Pengemudi**, buka **Peta Kerja**.
2. Pilih **Sumber posisi pengemudi → Simulasi pengujian lokal**. Atur titik mulai, segmen jika ada, dan kecepatan 0–40 km/jam. Pilih **Narik**.
3. Android kedua: quick login **Penumpang** atau buka peta publik. Pilih **01A**, arah **Abdul Muis → Cicaheum via Binong**. Kendaraan **D 1000 AB** bergerak di trayek dan diberi label **SIMULASI**. Detail juga menampilkan sumber simulasi.
4. Pilih **Jeda simulasi** untuk menghentikan sampel tanpa mengubah duty: setelah >15 detik marker stale, setelah >30 detik hilang. Pilih **Lanjutkan simulasi** sebelum 60 detik agar sampel segar memunculkan marker kembali. Setelah timeout 60 detik, duty berakhir; pilih Narik untuk memulai lagi.
5. **Istirahat/Offline** langsung menghapus kendaraan dari snapshot berikutnya. Pilih Offline sebelum mengganti sumber, segmen atau titik mulai.
6. Untuk GPS asli, pilih **GPS perangkat**, lalu Narik dan izinkan lokasi. Tidak ada simulator yang berjalan saat sumber GPS dipilih. ETA memerlukan GPS penumpang segar dan titik naik yang masih di depan kendaraan pada chain/arah yang sama. Asal pencarian manual tidak memenuhi syarat ini.

Kecepatan 0 berguna untuk pengujian diam/ngetem. Simulator berhenti di ujung segmen dan tidak melompat ke chain lain. Reload/tab baru memiliki identitas sesi berbeda: akhiri sesi lama dengan Offline sebelum mengambil alih. Navigasi antarlayar dalam tab yang sama mempertahankan sesi.

Simulator hanya tersedia jika backend memakai `ENABLE_DEMO_LOGIN=true` dan Supabase pada loopback. Source default selalu GPS. Server tetap memerlukan driver approved, assignment valid, duty dan sesi yang sesuai. Posisi simulasi masuk melalui validasi/rate limit yang sama, tetapi membawa `telemetrySource: simulation`; database menyimpan `telemetry_source` pada duty dan snapshot posisi. Ringkasan jarak/jumlah tugas operasional driver mengecualikan sesi simulasi. Statistik realtime mengembalikan `simulatedVehicles` dan `gpsVehicles` agar asal angka dapat diperiksa. Simulasi dapat menguji UI tracking; hasilnya tidak membuktikan akurasi GPS perangkat atau jaringan seluler.

## Aturan waktu dan koneksi

| Parameter | Nilai |
|---|---|
| Pengiriman sampel | 3 detik |
| Batas minimal pengiriman server | 2 detik |
| Snapshot WS | 1 detik |
| Sampel diterima | usia ≤15 detik, maksimum 5 detik di masa depan |
| Akurasi | >0 sampai 50 meter |
| Jarak ke trayek tugas | ≤150 meter |
| Batas lonjakan/kecepatan | 160 km/jam |
| Stale | >15 detik sejak waktu sampel |
| Marker dihapus | >30 detik |
| Duty tanpa GPS/sampel | ditutup setelah >60 detik, termasuk jika tidak ada viewer |
| Browser tanpa snapshot | watchdog 8 detik, hapus data live dan reconnect |
| Snapshot posisi/progress historis | sampel pertama setiap duty, lalu paling sering 30 detik per duty; bukan sumber live |

Endpoint `GET /api/tracking/config` mengembalikan ambang dan ketersediaan simulasi. Informasi lengkap ada pada [OpenAPI](../apps/api/api/openapi.json).

ACK berarti sampel diterima engine server; kegagalan snapshot database dicatat untuk retry dan tidak mengubahnya menjadi bukti persistence. Error GPS tidak dihapus oleh snapshot biasa, hanya oleh ACK GPS berikutnya yang berhasil. Browser mengganti socket ketika token Auth diperbarui. Socket lama yang tokennya kedaluwarsa tidak boleh menghentikan publisher baru. Saat transport putus, data marker/penumpang sekitar dikosongkan; jam lokal tetap memperbarui kesegaran data. Wake lock diminta saat bertugas, dicoba kembali setelah release/visibility, dan keterbatasannya ditampilkan.

## Database dan pengujian ulang

Migration `20261111300000_tracking_sessions.sql` menambah `session_id`, `end_reason`, RPC otorisasi dan penutupan tracking. Migration `20261111310000_tracking_simulator.sql` menambah provenance, melarang pergantian sumber saat duty aktif dan mengecualikan tugas simulasi dari ringkasan operasional. Tipe database dihasilkan kembali dan [ERD](./erd.md) diperbarui. RPC mutasi tidak dapat dipanggil anon/authenticated.

```bash
npm run test:sprint1
npm --prefix apps/web test
npm --prefix apps/web run lint
npm --prefix apps/web run build
cd apps/api
 go vet ./...
 go test -race ./...
cd ../..
npm run demo:verify:sprint3
npm run demo:browser:sprint3
```

Jalankan tes operasional secara **berurutan**, tanpa tugas demo yang sedang aktif dan tanpa mengedit source saat browser sedang berjalan. Tes memakai akun demo approved dan membersihkan duty/telemetry yang dibuatnya. Jangan menjalankan seeder/reset secara bersamaan. Tes browser memerlukan Chromium Playwright yang terpasang.

- Tes Go mencakup validasi, jarak, sumber posisi, stale/remove, konflik sesi, expiry, pencabutan authorization, slow/GPS gap, dan prompt ngetem.
- `supabase/tests/tracking.sql` dan `route_management.sql` memakai transaksi rollback. Seluruh enam migration juga diuji dari database kosong terisolasi di container Supabase yang sama, bersama regresi flow.
- `demo:verify:sprint3` memakai Auth/API/WS nyata dengan koordinat fixture. Memeriksa GPS invalid/poor/old/off-route/replay, sesi ganda, stale/remove, recovery, rest/offline, revocation, pending/rejected dan statistik bersama.
- `demo:browser:sprint3` memakai context driver/penumpang/publik terpisah. Memeriksa ACK/error yang bertahan melewati snapshot, filter/detail, custom-origin isolation, pencarian kanonis, external walking failure, refresh token, watchdog dan status dashboard. Simulator diuji tanpa izin GPS, termasuk bergerak, pause/stale/resume, label publik, sumber database dan ringkasan yang tidak bertambah.
- Baseline telemetry seed tetap kosong. Lint menyisakan tiga warning lama; build memiliki warning ukuran chunk.

Bukti lokal disimpan pada `.local/sprint3-metrics.json`, `.local/sprint3-browser.json` dan `.local/screenshots/sprint3-driver.png`. Hasil API fixture audit final: **ACK 207 ms**, **snapshot marker 1.027 ms**, target lokal ≤3.000 ms tercapai. Angka ini adalah pengukuran otomatis pada mesin lokal; ulangi untuk kondisi Wi-Fi/perangkat sebenarnya dan catat angka hasil terbaru. Hasil terbaru otomatis menimpa file metrik lokal.

## Acceptance perangkat yang masih harus dicatat

Dua Android tersedia menurut pengguna. Hal berikut **belum diverifikasi pada perangkat fisik**:

- CA dipercaya, login dan WSS bekerja dari kedua Android.
- GPS driver valid pada trayek tugas, interval/akurasi terlihat pada indikator dan kendaraan diterima Android penumpang.
- Latensi end-to-end saat GPS asli bergerak; catat p50/p95 atau minimal rentang pengamatan dan penyebab keterlambatan.
- Perilaku saat layar terkunci, browser background, izin lokasi ditolak/dicabut dan Wi-Fi terputus/pulih; wake lock Android mengikuti kebijakan browser/OS.
- Istirahat/offline langsung menghilangkan marker, dan pending/rejected tetap tidak dapat bertugas pada perangkat.

Simulator tersedia untuk menguji gerakan dan alur harian tanpa berlari. Acceptance GPS asli tetap diperlukan sebelum menyatakan kriteria perangkat Sprint 3 selesai seluruhnya. Flow megat/perjalanan/laporan lengkap serta tinjauan auto-ngetem tetap mengikuti Sprint 4; tidak ada pekerjaan deployment pada increment ini.
