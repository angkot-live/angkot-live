# Sprint 5 — scope demo, audit dan rehearsal

Tanggal: **11 November 2026**. Referensi: [Sprint 4](./SPRINT_4.md), [script demo](./demo-script.md), [backlog](./MVP_INTEGRATION_PLAN.md).

| Story | Increment | Verifikasi |
|---|---|---|
| S5-01 | Graph import aplikasi tidak memakai mock runtime, store domain persist atau success/info toast-only | `npm run demo:audit`: 85 modul dari entry aplikasi. Fixture tetap dipakai seeder dan tes; tipe trip dipindah ke `types/trip.ts` |
| S5-02 | Halaman/kontrol di luar scope dihapus dari route/navigation demo; klaim data contoh di monitoring dibuang | Kendaraan/pengguna/pesan admin dan gallery UI tidak masuk bundle demo. Model, kapasitas, potensi penumpang, rit, sinyal dan akurasi hardcoded tidak ditampilkan |
| S5-03 | Cache reject/revisi, mutation antar akun, status laporan, signed URL, loading/empty/error dan cache file privat diperbaiki | Rehearsal nyata, SQL/RBAC/idempotency, unit service worker, regresi tiga role dan build |
| S5-04 | Rehearsal satu perjalanan tiga kali berurutan, uji 50 marker dan panduan presenter | Script menjalankan layanan nyata dengan data sementara. Acceptance dua Android asli/4G tetap manual |

## Batas demo yang disengaja

Navigasi admin berisi dashboard, monitoring, verifikasi, trayek dan laporan. Prototipe pengelolaan pengguna, kendaraan, dan pengiriman pesan admin tetap tersimpan sebagai referensi source, tetapi tidak dirutekan atau ditawarkan kepada presenter. Inbox/notifikasi nyata tetap tersedia untuk pesan hasil verifikasi/laporan. Tidak ada tombol broadcast palsu, penjadwalan, tip atau perjalanan multi-leg baru.

Monitoring hanya memperlihatkan status/kecepatan/kesegaran/akurasi yang benar-benar diterima. Statistik operasional tetap memakai DB dan engine live. Informasi telepon, WhatsApp, alamat kantor dan janji SLA yang semula contoh di pusat bantuan dihapus. Landing menjelaskan rekomendasi langsung yang tersedia, tanpa menjanjikan transit atau penggunaan publik yang belum dibuktikan.

Service worker versi 3 hanya menyimpan shell/aset publik. API, Auth, Storage, request berotorisasi, URL bertoken dan dokumen privat tidak dicache. Cache versi lama dibuang ketika service worker baru aktif. Sesi Auth yang disimpan SDK tetap diperlukan untuk restore login; ini berbeda dari domain state/mock yang dipersist sebagai data aplikasi.

Regresi juga menemukan throttle historis yang terbawa antar duty: sampel awal simulator dapat terlewat setelah GPS baru saja disimpan. Awal duty kini selalu mendapat snapshot pertama; throttle 30 detik hanya berlaku dalam duty tersebut. Tes Go memeriksa satu sampel GPS, throttling berikutnya, kemudian snapshot simulasi setelah berganti duty.

Menghapus route gallery/prototipe juga mengeluarkan chunk dataset statis sekitar 999 kB dari build operasional. Build final tidak lagi mengeluarkan warning chunk >500 kB; chunk terbesar sekitar 356 kB sebelum gzip. Katalog runtime tetap berasal dari API DB.

## Perintah audit dan bukti

```bash
npm run demo:audit
npm run test:sprint1
npm --prefix apps/web test
npm --prefix apps/web run lint
npm --prefix apps/web run build
npm run demo:rehearse
npm run demo:performance
```

- `.local/sprint5-runtime-audit.json`: graph import dan hasil audit. Pemeriksaan otomatis tidak menggantikan review angka/klaim UI; temuan monitoring/bantuan juga ditinjau manual.
- `.local/sprint45-rehearsal*.json`: tiga perjalanan berhasil berurutan pada Auth/API/Storage/WS nyata; mencakup dokumen/revisi, walking/arrival, cancel/expiry, boarding ganda, reload, riwayat, laporan, notifikasi dan preferensi.
- `.local/sprint5-performance.json`: rendering 50 marker lewat fixture WebSocket **khusus browser**, tanpa menulis posisi ke API/DB. Hasil rendering 50 marker: **950 ms** pada mesin lokal, tanpa page error. Ukuran waktu ini bukan klaim jaringan 4G atau GPS lapangan.
- SQL diuji dari database kosong dan pada Supabase lokal melalui transaksi rollback. Regresi Sprint 1–3, unit frontend/Go, race detector, lint dan build diperiksa. Tiga warning lint lama tetap tercatat.

Baseline setelah tes kembali ke 10 profil, 82 arah, 14 kendaraan offline, 4 trip historis, 7 laporan, 29 dokumen driver dan 1 bukti laporan seed. Tidak ada duty terbuka, driver aktif, posisi GPS QA, akun QA atau objek Storage orphan. Ringkasan pemeriksaan akhir tersedia di `.local/sprint45-validation.json`.

## Acceptance yang masih memerlukan perangkat/pemilik produk

Dua Android tersedia, tetapi agent tidak dapat mengoperasikan perangkat tersebut. Trust CA, geolokasi asli, WSS di Wi-Fi, interval/latensi jaringan seluler, wake lock/latar belakang dan waktu buka pada 4G belum diklaim lulus. Gunakan checklist [script demo](./demo-script.md). Hasil GPS fixture/simulator tidak menggantikan penerimaan tersebut.

Tidak ada pekerjaan deployment. Docker hanya dipakai untuk Supabase lokal; API Go dan Vite tetap pada host. Implementasi fitur dan bukti otomatis tersedia untuk ditinjau; penerimaan Product Owner belum dinyatakan atas nama pengguna.
