# Sprint 4 — satu perjalanan lengkap pada backend lokal

Tanggal: **11 November 2026**. Acuan: [backlog](./MVP_INTEGRATION_PLAN.md), [PRD](./PRD.md).

Implementasi tersedia dan telah diuji dengan Supabase Auth, API Go, Storage privat, dan WebSocket lokal nyata. Rehearsal browser menggunakan akun sementara serta GPS penumpang terkontrol dan simulator driver yang diberi label. Uji GPS asli dua Android dan penerimaan Product Owner tetap belum dicatat.

| Story | Increment | Bukti |
|---|---|---|
| S4-01 | Draft, upload empat jenis dokumen, reject, revisi aktif dan approve; file privat dapat dibuka dari gesture pengguna | Rehearsal memulai driver baru, menolak submit tanpa dokumen, melakukan reject/revisi SIM dan approval. Dua revisi SIM tersimpan, hanya satu aktif. Signed URL mengembalikan byte file yang diunggah |
| S4-02 | Walking → searching dari GPS; filter arah/radius; respons opsional; cancel dan expiry | Rehearsal memindahkan GPS fixture dari luar radius ke trayek, membatalkan request, menguji expiry disposable request, lalu membuat request baru. Request walking tidak terlihat oleh driver |
| S4-03 | Boarding atomik/idempotent, restore setelah reload, completion dan riwayat | Dua request boarding bersamaan menghasilkan satu trip. Marker menunggu hilang. Tarif mengikuti katalog saat boarding dan tidak berubah saat retry. Perjalanan simulator ditandai pada trip/riwayat |
| S4-04 | Bukti laporan nyata di Storage, timeline status berurutan, notifikasi/read state dan preferensi laporan persisten | Pengujian laporan+bukti → diproses → selesai; pax menerima timeline, menandai dibaca dan mematikan notifikasi. Setelah reload preferensi tetap; tanggapan berikutnya tetap ada di timeline tanpa notifikasi baru |
| S4-05 | Prompt diam 90 detik, deadline 15 detik, konfirmasi ya/tidak dan ringkasan driver | Prompt dan auto-ngetem tanpa jawaban diuji dengan waktu nyata; mode runtime dan DB sama. Cabang ya/tidak, movement dan GPS gap diuji Go. Sesi simulasi tidak menambah ringkasan operasional |

## Perbaikan yang ditemukan saat rehearsal

- Cache onboarding sebelumnya tetap berstatus pending setelah admin menolak, sehingga driver dipantulkan kembali ke halaman verifikasi ketika ingin mengunggah revisi. Poll verifikasi kini memperbarui cache onboarding; form mengambil data terbaru ketika dibuka dan menunggu refetch sebelum mengarahkan pengguna.
- Kontrol status laporan memiliki label aksesibilitas yang bercampur dengan teks opsi. Label eksplisit memperbaiki akses dan pengujian.
- Preferensi notifikasi sebelumnya hanya state lokal dan menawarkan pengaturan yang belum didukung. Sekarang hanya preferensi tanggapan laporan yang ditawarkan, disimpan di DB, dan benar-benar memengaruhi pembuatan notifikasi berikutnya.
- API sebelumnya memperbolehkan laporan menunjuk path bukti yang tidak ada. Command memeriksa pemilik dan keberadaan objek Storage, batas jumlah bukti serta panjang teks.
- Status laporan sebelumnya dapat dibalik/ditimpa dari editor lama. Command mengunci baris, memvalidasi urutan dan `expectedStatus`; konflik versi mendapat 409. Retry dengan key yang sama tidak menggandakan timeline/notifikasi.
- Boarding sebelumnya memakai tarif default tabel. Tarif kini disalin dari `routes.fare_standard` sekali ketika trip dibuat, lalu dipertahankan pada retry/histori.
- Laporan dari perjalanan yang kendaraannya sudah offline kini memperoleh plat dari DB. Dokumen/bukti membuka tab saat gesture pengguna, dengan tautan cadangan bila popup diblokir; fetch signed URL tidak menjadi pemicu popup terlambat.

## Kontrak dan skema

Migration `20261111400000_mvp_completion.sql` menambah `notification_preferences`, provenance perjalanan dan command validasi laporan. `20261111500000_demo_consistency.sql` melengkapi snapshot tarif dan plat. Seluruh delapan migration diuji bersama regresi flow dari database kosong terisolasi dalam container Supabase yang sama. Tidak ada container aplikasi atau pekerjaan deployment.

- `GET /api/preferences`: preferensi milik penumpang yang login, default `report_updates: true`.
- `PATCH /api/preferences`: hanya `report_updates: boolean`; pengaturan lain ditolak.
- `POST /api/reports`: bukti harus milik actor dan ada di bucket privat; key idempotency didukung.
- `PATCH /api/admin/reports`: admin saja; payload `id`, `status`, `response`, `expectedStatus`, `key`. Urutan diterima → diproses → selesai; catatan tambahan pada status yang sama diperbolehkan.
- Notifikasi laporan memakai `messages.kind = report` dan `related_report_id`, sehingga penerima dapat membuka laporannya.
- `messages/read` hanya mengubah pesan milik penerima. Mematikan notifikasi tidak menghapus timeline atau pesan historis.
- `passenger_trips.telemetry_source` mempertahankan sumber `gps`/`simulation` pada riwayat. Source simulasi bukan seed telemetry aktif.

## Mengulang verifikasi

```bash
npm run db:migrate
# API/Vite harus berjalan di dua terminal
npm run demo:rehearse
```

Default menjalankan **tiga rehearsal berurutan**, termasuk satu pemeriksaan ngetem waktu nyata. Untuk pengulangan cepat setelah pemeriksaan timer tersedia:

```bash
DEMO_NGETEM=false npm run demo:rehearse
```

Akun driver/penumpang, route, kendaraan, dokumen, trip, laporan dan pesan QA dibuat khusus lalu dibersihkan. Admin memakai akun quick login lokal. Akun utama penumpang/pengemudi dan histori seed tidak dipakai untuk menulis trip QA. Jangan menjalankan seeder atau mengedit source bersamaan dengan suite. Bila proses tes dihentikan paksa, `npm run demo:cleanup:rehearsal` membersihkan hanya namespace QA `s45-*` dan route `CONTOH Rehearsal`.

`supabase/tests/mvp_completion.sql` memeriksa grant, preferensi, bukti hilang, ownership laporan, retry, konflik status, larangan mundur, notifikasi dan read state melalui transaksi rollback. Tes Go menangani validasi GPS/titik turun dan lifecycle ngetem. Tipe DB dan [ERD](./erd.md) diperbarui.

Artefak: `.local/sprint45-rehearsal.json`, `.local/sprint45-rehearsal-with-ngetem.json`, `.local/screenshots/sprint45-rehearsal-*.png`. Run dengan timer nyata mencatat tiga keberhasilan berurutan (sekitar 127, 40, dan 40 detik), tanpa page error. Log ngetem membuktikan prompt 90 detik dan deadline 15 detik, tanpa mempercepat clock server.
