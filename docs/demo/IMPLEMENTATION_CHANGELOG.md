# Changelog implementasi

Tanggal: 11 November 2026. Branch kerja: `feat/competition-demo-readiness`. Perubahan belum dipush atau dideploy.

## Pengalaman publik dan landing

- `apps/web/src/features/landing/landing-page.tsx`: hero dan CTA diperjelas, statistik armada terdaftar ditambahkan, loading/retry ditampilkan, klaim ETA/penghasilan/integrasi resmi dikoreksi.
- `landing-map-preview.tsx` baru: preview SVG katalog, setiap segmen terpisah, warna GPS/simulasi berbeda, freshness dan koneksi diperiksa, state gagal/kosong tersedia. Perhitungan bounds memakai reduce sehingga tidak menyebarkan seluruh koordinat sebagai argumen Math.min/Math.max.
- `landing-guide.tsx` baru: lima langkah per role, tujuh FAQ dan penjelasan Megat nonreservasi.
- `public-shell.tsx` dan `lib/navigation.ts`: menu tablet kembali tersedia, drawer menutup saat memilih halaman, akses Beranda/Cara Kerja/Bantuan ditambahkan; footer menyatakan verifikasi admin aplikasi.
- `public/use-statistics.ts` dan `statistics-page.tsx`: tipe dan tampilan membedakan gpsVehicles/simulatedVehicles; total aktif tidak disebut seluruhnya GPS asli.
- `apps/web/index.html`: metadata Open Graph dan social card dasar, tanpa URL deployment atau dampak publik rekaan.

## Pengemudi dan penumpang

- `driver-map-page.tsx`: assignment kosong/error lebih jelas, tombol retry, status persetujuan akun, dan pesan saat nearby tidak dapat dikonfirmasi karena disconnected. Respons driver dinonaktifkan saat disconnected atau sesi dimiliki tab lain.
- `driver-tracking-status.tsx`: recovery izin lokasi/HTTPS/visibility dan Offline sebelum mulai ulang saat data belum segar.
- Alur penumpang existing dipertahankan: Megat, boarding idempotent, reload trip, completion dan laporan diuji ulang melalui browser fixture. Tidak mengklaim perbaikan backend yang tidak dilakukan.
- Tidak mengubah validator jarak, arah, GPS, Auth/RLS, model perjalanan atau tarif; backend dan migration tidak diubah.

## Tool demo dan regression

- `scripts/demo-settings.mjs`: default HTTP fresh clone, HTTPS mengikuti settings eksplisit; malformed JSON tetap menghasilkan error.
- Helper digunakan pada smoke Sprint 1/2/3/4–5, performance, verify-sprint3 dan verify-fleet. Sebelumnya beberapa skrip selalu membentuk HTTPS atau mewajibkan settings hasil generator sertifikat.
- `scripts/demo-preflight.mjs`: pemeriksaan read-only kesehatan stack dengan hasil gagal yang jelas; tidak membuat/mereset data.
- `scripts/demo-coordinates.mjs`: lokasi awal kanonis kendaraan utama untuk Sensors penumpang; tidak memalsukan GPS di aplikasi.
- Root package menambahkan `demo:preflight` dan `demo:coordinates`; web package menambahkan `test:landing`.
- `scripts/demo-settings.test.mjs`: dua regression konfigurasi; `apps/web/scripts/landing-smoke.mjs`: nav/FAQ/provenance/responsif/error recovery. `flow-smoke.mjs` menambah assertion informasi disconnected driver.
- Dokumentasi sembilan file di `docs/demo`, indeks root README dan rencana di `docs/superpowers/plans/2026-11-11-competition-demo.md`.

## Review independen dan perbaikan lanjutan

- `apps/web/scripts/flow-smoke.mjs`: fixture snapshot dijeda sebelum simulasi koneksi putus. Sebelumnya snapshot 250 ms dapat menimpa status disconnected dan membuat assertion flaky; flow smoke kini lulus tiga kali berturut-turut.
- `apps/web/src/features/map/map-screen.tsx`: `?tab=rute` dari CTA landing membuka panel peta, memfokuskan kolom tujuan, lalu menghapus parameter. CTA tidak lagi menjadi tautan mati.
- `apps/web/src/features/landing/landing-map-preview.tsx`: cache geometri tetap tampil saat refetch katalog gagal; error menjadi peringatan dengan tombol retry. Ambang kesegaran memakai `STALE_GPS_MS`.
- `apps/web/src/features/landing/landing-page.tsx`: tautan Cara Kerja memakai `location.key`, sehingga klik ulang tetap menggulir meski hash sama.
- `apps/web/src/features/tracking/driver-tracking-status.tsx`: pesan recovery dipisahkan untuk koneksi putus, simulasi tertunda, dan GPS perangkat; tidak lagi menyalahkan izin GPS saat masalahnya koneksi.
- Teks `Dishub` pada bantuan, toast laporan, label tanggapan, pengirim pesan default dan pengingat admin diganti menjadi admin aplikasi. Klaim kemitraan resmi tidak lagi muncul di layar yang saling bertentangan.
- `apps/web/src/styles/index.css`: dukungan `prefers-reduced-motion` untuk animasi dan smooth scroll.
- `README.md`, `docs/demo/INSTALLATION_AND_SETUP.md`, dan `docs/demo/PRESENTER_SCRIPT.md`: istilah tombol login disamakan dengan UI, klaim rehearsal dikoreksi, dan urutan login presenter diperbaiki.
- `apps/web/scripts/landing-smoke.mjs`: regression CTA Cari Trayek memeriksa fokus kolom tujuan di `/peta`.

## Demo kilat tanpa Docker/Supabase

- `apps/web/scripts/demo-offline.mjs` (baru): harness demo interaktif satu perintah. Menjalankan Vite sendiri pada port bebas (default 5188), membuka dua jendela Chromium (penumpang 1280×800, pengemudi 430×900), login fixture, menyiapkan sumber simulasi dengan kecepatan 0 dan titik mulai 0%, serta meniru API dan WebSocket di sisi browser.
- Setiap halaman mendapat label `DEMO FIXTURE — data simulasi, bukan backend nyata`; terminal mencetak urutan klik dan petunjuk langkah berikutnya.
- `package.json` root dan `apps/web/package.json` menambahkan `demo:offline`; dokumentasi baru `docs/demo/OFFLINE_DEMO.md` dan rujukan silang pada README, indeks demo, naskah presenter, checklist dan operasional dua role.
- Skrip tidak mengubah kode aplikasi, tidak menambah mock ke runtime operasional, dan tidak mengklaim integrasi nyata. Mode `DEMO_SMOKE=1` menjalankan seluruh alur tanpa interaksi dan lulus (exit 0); jendela visual untuk presentasi belum dijalankan pada sesi ini.

## Bukti dan batas

Lihat [TEST_RESULTS](TEST_RESULTS.md): unit frontend 50 lulus, root 7 lulus, Go race/vet lulus, build/lint, flow smoke tiga kali dan landing smoke lulus. Integrasi Supabase, SQL, rehearsal nyata serta Android masih terhalang atau belum dijalankan.

Tidak ada reset destruktif, data perjalanan palsu, secret frontend, dependency upgrade atau deployment. Penerimaan final kompetisi memerlukan stack lokal siap dan rehearsal nyata berhasil. Gap fitur roadmap tetap berlaku.


## Perbaikan review — 12 November 2026

- `.github/workflows/checks.yml`: hapus penghentian layanan dan penghapusan file lock paket; pertahankan mekanisme retry instalasi dependensi. Lock yang masih dipegang proses lain tidak boleh dilewati dengan menghapus inode.
- `apps/web/scripts/demo-offline.mjs`: paksa `LOCAL_HTTPS=false` hanya pada child Vite fixture agar environment HTTPS aplikasi normal tidak menggagalkan polling HTTP harness.
- Lengkapi fixture statistik dengan received, activeByRoute, activeByDirection dan vehicleStatuses. Total aktif/simulasi mengikuti duty; Offline tidak lagi menghitung satu kendaraan aktif.
- Smoke fixture kini membuka Statistik setelah Offline dan memeriksa state kosong. Regression gagal sebelum perbaikan, lalu lulus dengan inherited LOCAL_HTTPS=true.
- Verifikasi ulang seluruh pemeriksaan lokal tercatat di TEST_RESULTS. Review hosted CI, Supabase nyata dan Android tetap belum dilakukan.
