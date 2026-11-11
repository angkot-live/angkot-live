# Audit skema Supabase untuk integrasi MVP

Tanggal: **11 November 2026**. Referensi: [PRD](./PRD.md) dan [rencana sprint MVP](./MVP_INTEGRATION_PLAN.md).

Audit awal membaca gabungan dua migration. Pada Sprint 1, [migration fondasi MVP](../supabase/migrations/20261111100000_mvp_foundation.sql) sudah diterapkan pada Supabase lokal nyata bersama Auth/Storage dan diuji reset/seed ulang. Sprint 2 menambahkan [migration manajemen trayek](../supabase/migrations/20261111200000_route_management.sql) untuk repository kanonis, CRUD atomik dan agregat. Sprint 3 menambahkan [sesi tracking](../supabase/migrations/20261111300000_tracking_sessions.sql) dan [provenance simulator](../supabase/migrations/20261111310000_tracking_simulator.sql) untuk kepemilikan duty, timeout dan pemisahan data GPS/simulasi. Spesifikasi di bawah tetap menjelaskan target lengkap lintas sprint; status implementasi dibedakan berikut.

| Paket | Status setelah Sprint 5 |
|---|---|
| DB-01 | Segmen terurut, backfill, RPC impor atomik, halte unik dan cache kompatibilitas tersedia; 82 arah/104 chain/172 halte terisi. Repository API, CRUD dan invalidasi cache sudah ditutup pada Sprint 2. |
| DB-02 | Address/tanggal SIM, revisi aktif, relasi dokumen kendaraan, validasi objek Storage dan metadata masa berlaku tersedia. Dokumen privat nyata sudah diuji. |
| DB-03 | Constraint state/waktu/jarak/kapasitas/akurasi, assignment driver/respons/boarding, duty assignment/mode, sesi tugas, `end_reason`, provenance GPS/simulasi dan reset runtime tersedia. Uji operasional GPS otomatis lulus pada stack lokal; dua perangkat fisik dan layar terkunci mengikuti checklist Sprint 3. |
| DB-04 | Preferensi notifikasi tanggapan laporan persisten; pembentukan pesan mengikuti preferensi. Timeline/report-update atomik dan idempotent; hanya pengaturan yang didukung ditawarkan. |
| DB-05 | Tabel status pengguna lanjutan belum ditambahkan. Contoh suspended memakai Auth ban; CRUD/suspend aplikasi mengikuti sprint berikutnya. |

Bukti dan keterbatasan pengujian ada pada [Sprint 1](./SPRINT_1.md), [Sprint 2](./SPRINT_2.md) dan [Sprint 3](./SPRINT_3.md). ERD dan tipe database telah diperbarui dari skema aktual.

## 1. Kesimpulan audit awal

Skema telah mencakup auth/profil, driver, kendaraan, trayek/halte, lokasi, request megat, trip, laporan/timeline, pesan, snapshot posisi, sesi tugas dan idempotency. Tidak perlu mengganti database atau membangun tabel inti dari awal.

Kekurangan yang menghalangi integrasi lengkap adalah konsistensi sumber geometri, metadata driver/dokumen yang masih tersimpan sebagai draft JSON, preferensi yang belum persisten, dan seed yang tidak kompatibel. Sejumlah masalah adalah gap backend/seed, bukan kekurangan tabel; keduanya harus dibedakan agar migration tidak membesar tanpa kebutuhan.

## 2. Audit awal per kebutuhan (lihat status terbaru di atas)

| Kebutuhan PRD | Sudah ada pada gabungan migration | Gap / tindakan MVP |
|---|---|---|
| AUTH-01/02/06: akun, role, sesi | `profiles` terkait `auth.users`; trigger membatasi role registrasi; grant mutasi browser dibatasi, command server-only | Buat akun demo melalui Auth API dengan password dan konfirmasi email. Buktikan refresh/logout pada stack lokal lengkap. Tidak perlu tabel password/JWT sendiri. |
| AUTH-03/04: data driver dan verifikasi | NIK, SIM, status, reviewer, alasan penolakan, `onboarding` JSON, `submitted_at`, `driver_documents.expires_at` | Alamat dan masa berlaku SIM belum menjadi kolom profil terstruktur; revisi dokumen belum memiliki penanda dokumen aktif. Tambahkan field yang benar-benar dibaca backend/profil dan backfill dari draft. |
| AUTH-05: hanya driver approved tampil | Hasil verifikasi dan assignment tersedia; API/WS memfilter | Perlu uji runtime pada setiap jalur baca/mutasi; jangan menganggap policy lama aman bila suatu saat grant direct read dibuka kembali. |
| ADM-02/PAX-01/04: trayek dan halte | `routes`, `route_stops`, `segments`, `endstops`, `street_runs`; unique `routes.code` sudah dihapus | `routes.path` masih LineString tunggal; impor API tidak mengisi path/halte relasional. Tambah model segmen terurut dan sinkronisasi importer/CRUD/cache. |
| DRV-01/02/03: GPS dan status | `live_locations`, `vehicle_positions`, `driver_duties`; engine posisi/mode di memori | Sesi tugas belum menyimpan assignment/mode terstruktur. Tetapkan lifecycle tugas/restart serta tambah FK assignment bila dipakai dashboard historis. Kendaraan tidak boleh aktif dari seed. |
| BR-01/06/07: ngetem, merayap, stale | Timer dan freshness ditangani engine; snapshot tersedia | Ini terutama aturan engine, bukan alasan menambah tabel timer. Uji dengan GPS asli dan pengaturan ambang terpusat. |
| BR-02/03/05/08: megat | Status lengkap, pickup, destination, revision, freshness, accuracy, expiry, unique active request | Tambah validasi konsistensi status/mode/is_active, koordinat dan FK assignment; pertahankan validasi radius/arah pada service. Jangan membuat duplicate tabel megat. |
| PAX-06: trip aktif/selesai | `request_id` unik, unique active trip, distance, chain/offset, tujuan dan posisi penumpang terakhir | Lengkapi invariant timestamp/jarak dan simpan titik turun aktual bila diperlukan UI. Canceled sebelum boarding tetap request, bukan trip aktif. |
| PAX-07/ADM-06: laporan | `reports`, `report_updates`, referensi kendaraan, bucket bukti privat | Uji timeline/ownership dan file nyata. Perlu endpoint/detail yang konsisten, bukan tabel laporan baru. |
| ADM-01/PUB-02/DRV-05 | `flow_public_stats()`, trip dan sesi tugas sebagai sumber ringkasan | Agregat admin/landing belum lengkap. Hitung query/DTO dari data dasar dan posisi aktif; hindari tabel statistik berisi angka hardcoded. |
| Pesan/notifikasi dasar | `messages` memiliki recipient, sender, content dan `is_read` | Cukup untuk pesan individual. Tambahkan jenis dan referensi entitas jika tampilan notifikasi membutuhkannya; broadcast MVP opsional menggunakan fan-out per penerima. |
| Preferensi profil | Toggle frontend, belum ada penyimpanan | Bila dipertahankan dalam demo, tambah preferensi per pengguna dan API. Promo tidak diperlukan. |
| ADM-05/07, PAX-09/10: P2 | Sebagian struktur dokumen/pesan ada; tips/leg transfer belum lengkap | Tunda tabel tip, graph, journey multi-leg, scheduler broadcast, dan analitik lengkap. Tidak diwajibkan untuk demo satu angkot. |

## 3. Spesifikasi paket skema MVP

Paket wajib direalisasikan sebagai migration ketiga; dua migration awal tetap dipertahankan. Bagian selesai di bawah adalah target paket, termasuk integrasi endpoint pada sprint berikutnya.

### DB-01 — Geometri trayek/halte sebagai sumber kanonis (wajib)

- Tambah `route_segments` dengan FK `route_id`, `segment_order`, dan `path geometry(LineString,4326)`; PK gabungan atau unique `(route_id, segment_order)` dan indeks spasial yang sesuai query.
- Satu segmen adalah satu chain berarah; urutan antarsegmen tidak memberi izin menyeberangi celah geometrinya. Jangan membuat garis lurus buatan untuk menyambung chain terputus.
- Backfill dari `routes.segments`; jika kosong, gunakan `routes.polyline`. Konversi array frontend `[lat,lng]` ke geometri/GeoJSON `[lng,lat]` secara eksplisit.
- Impor terminal/halte ke `route_stops`. Pertahankan ID stop yang stabil melalui mapping seed; validasi urutan dan FK sebelum menambah unique `(route_id, stop_order)`.
- Pertahankan `routes.code` tidak unik; `id` per arah adalah identitas referensi kendaraan, request, trip, dan URL. Status aktif/nonaktif cukup memakai `is_active`; status `insidental` UI tidak perlu menjadi enum baru untuk MVP.
- Gunakan `route_segments`/`route_stops` sebagai sumber; API menyusun DTO polyline/segments/endstops. JSON lama boleh menjadi cache kompatibilitas yang diturunkan dalam transaksi yang sama, bukan sumber edit kedua.
- `routes.path` lama tetap untuk kompatibilitas sampai seluruh pemakai beralih; jangan mengklaim path itu sudah mewakili semua chain. Versi/cache invalidation dapat memakai `updated_at` yang sudah ada sebelum menambah kolom baru.

**Selesai:** 82 arah/37 kode dan halte terimpor; edit/admin save terlihat di peta dan planner tanpa restart; inactive tidak dipakai duty baru/pencarian; archive menjaga histori. Jika hard delete tetap disediakan, tolak ketika masih direferensikan.

### DB-02 — Profil driver dan revisi dokumen (wajib)

- Tambah `driver_profiles.address text` dan `sim_expires_at date`, lalu backfill dari `onboarding.address`/`simExpiry`. JSON draft tetap boleh digunakan sebelum submit, tetapi hasil submit mengisi kolom domain terstruktur.
- Gunakan `driver_documents.expires_at` yang **sudah ada**. Propagasikan tanggal SIM/STNK/KIR ke metadata dokumen yang tepat; upload saat ini belum otomatis mengaitkan semua tanggal form ke berkas.
- Tambah `vehicle_id` nullable pada dokumen kendaraan. Nullable diperlukan ketika draft belum memperoleh kendaraan; isi ketika assignment disetujui.
- Tambah `superseded_at` atau penanda versi setara. Untuk SIM/KTP/STNK/KIR, hanya satu revisi berlaku per pemilik/jenis; foto kendaraan dapat lebih dari satu. Pertahankan histori revisi yang diperlukan admin.
- Ubah query submit/review agar menilai revisi terbaru dan dokumen yang benar-benar ada di Storage. Menghitung semua tipe sepanjang histori saja tidak cukup.
- NIK tetap string 16 digit. Validasi masa berlaku pada operasi submit/review, bukan CHECK yang bergantung pada tanggal hari ini; dokumen yang kemudian kedaluwarsa tetap harus dapat disimpan dan diberi label.
- Bucket tetap privat. Pengemudi memperoleh metadata berkas miliknya, admin mendapat akses isi dokumen sesuai PRD.

**Selesai:** seed approved/pending/rejected dapat direview dengan file nyata, revisi lama tidak mengalahkan berkas baru, dan pengguna lain tidak membaca identitas/dokumen privat.

### DB-03 — Konsistensi lifecycle (wajib, skala kecil)

- Evaluasi/backfill sebelum memasang CHECK untuk `capacity`, ukuran file positif, akurasi, koordinat, `distance_km >= 0`, serta waktu mulai/selesai yang berurutan.
- Request `walking/searching/accepted` harus aktif; `boarded/cancelled/expired` tidak aktif. Mode harus cocok untuk state aktif dan boarded; cancellation/expiry boleh mempertahankan informasi mode sebelumnya.
- Kendaraan respons/boarding harus memiliki assignment driver dan arah trayek yang sesuai. Keunikan request/trip aktif serta `request_id` unik sudah ada; jangan ditambahkan ulang.
- Untuk sesi tugas, simpan assignment kendaraan/trayek dan mode terakhir bila dibutuhkan ringkasan. Sesudah restart, duty lama ditutup/dinyatakan terputus dan kendaraan tetap menunggu GPS baru, bukan dipulihkan sebagai live dari snapshot historis.
- Tulis penyelesaian request + pembuatan trip, perubahan laporan + timeline, serta mutasi trayek + segmen/halte dalam transaksi.
- Pertahankan RPC mutation server-only. Table baru mengikuti pola akses server yang sama; RLS aktif tanpa grant mutasi browser yang terlalu luas.

**Selesai:** constraint lulus pada seed dan data lama yang telah dinormalisasi; tes boarding/completion ganda, cancel/expire terlambat, FK dan akses lintas akun lulus.

### DB-04 — Preferensi dan metadata notifikasi (wajib hanya bila kontrol dipakai)

- Tambah `notification_preferences` dengan `user_id` PK/FK dan boolean untuk notifikasi perjalanan/laporan/sistem yang benar-benar didukung. Default konsisten dan satu baris per akun.
- Tambah `messages.kind` dan referensi terkait, misalnya `related_report_id`, bila diperlukan navigasi notifikasi. Seed waktu pesan memakai timestamp absolut.
- Gunakan satu baris message per recipient untuk pesan admin sederhana; read state per pengguna sudah tersedia. Jangan memakai satu `is_read` bersama untuk broadcast ke banyak pengguna.
- Jika kontrol preferensi dikeluarkan dari demo, paket ini dapat ditunda; tombolnya harus disembunyikan agar tidak tampak tersimpan.

### DB-05 — Pengelolaan pengguna/kendaraan lanjutan (opsional)

- Jika story pengguna/suspend diambil, tambah status akun terstruktur seperti `aktif/ditangguhkan`, dan opsional `last_active_at` berdasarkan aktivitas nyata. Terapkan penolakan login/API/WS/duty untuk suspend; bukan hanya mengganti badge tabel.
- Data masa berlaku STNK/KIR sudah ada pada `vehicles`; jangan membuat `vehicle_documents`/`vehicle_photos` baru hanya untuk menyeragamkan nama dengan tabel halaman PRD. Relasi `driver_documents.vehicle_id` dapat memenuhi kebutuhan MVP.
- `tips`, `trip_legs`, histori assignment kompleks, dan analitik tidak ditambahkan pada paket wajib. Nama tabel di PRD adalah rancangan; requirement perilaku lebih penting daripada duplikasi model.

## 4. Seed lama dan hal yang harus diperbaiki

| Temuan | Dampak | Penyelesaian |
|---|---|---|
| Seed insert langsung `auth.users` tanpa kredensial lengkap | Baris user bukan akun demo yang terbukti bisa login | Provision Auth API, konfirmasi email, lalu seed relational menggunakan ID Auth hasil provisioning. |
| Metadata user admin pada seed | Trigger migration kedua menolak role registrasi admin | Buat sebagai penumpang lalu update role lewat seeder lokal tepercaya; jangan mengubah trigger menjadi permisif. |
| Trigger signup sudah membuat `driver_profiles`; seed melakukan insert ulang dengan `ON CONFLICT` terbatas | Assignment/NIK/SIM/route tidak seluruhnya diperbarui ketika baris sudah ada | Gunakan upsert/update eksplisit untuk field seed, tanpa menimpa akun/transaksi di luar namespace demo. |
| Seed armada berstatus jalan dan menyimpan live location contoh | Statistik/peta dapat menampilkan angkot buatan | Seed kendaraan offline, duty tidak aktif, tanpa `live_locations` atau request menunggu aktif. |
| Seed hanya tiga trayek dan tidak sama dengan dataset kanonis | FK tampak valid tetapi label, arah dan peta berbeda | Satu pipeline impor 82 arah dari dataset yang dipakai proyek. |
| ID mock non-UUID dan referensi kode lama | FK tidak dapat diisi langsung atau terhubung ke entitas salah | Manifest mapping, UUID domain stabil, dan rekonsiliasi kode + arah + plat/pemilik. |
| Public stats dan dashboard memakai agregat hardcoded | Tidak konsisten dengan jumlah row aktual | Hitung dari data dasar/live. Jangan seed agregat supaya cocok dengan desain. |
| Metadata dokumen tidak selalu memiliki file Storage | Admin mendapat tautan file tidak ada | Upload fixture contoh ke bucket privat dan simpan path hasil upload. |

Seluruh perubahan seed harus mempertahankan dataset contoh yang berguna, dengan catatan eksplisit untuk data P2/konflik yang ditunda. `supabase/seed.sql` tidak boleh berisi DDL, password hashing buatan, maupun ketergantungan pada trigger yang sudah diganti.

## 5. Tindak lanjut backend setelah Sprint 2

1. Sprint 2 selesai: katalog/detail/pencarian runtime memakai repository DB dan invalidasi cache; file dataset hanya seeder/importer eksplisit.
2. Importer/seeder sudah mengisi chain/halte relasional. Admin CRUD menggunakan command atomik; JSON geometri tetap cache kompatibilitas.
3. Dashboard admin, landing dan statistik publik sudah memakai agregat DB/GPS pada Sprint 2. Pengelolaan pengguna/kendaraan serta pesan admin lanjutan tetap backlog.
4. Snapshot/TTL dan status operasional di memori harus menjadi sumber jumlah kendaraan aktif; status historis `vehicles.status` yang belum disinkronkan tidak boleh dihitung sebagai kendaraan live.
5. Read policy lama tidak otomatis membuktikan filter privasi karena operasi sekarang melalui RPC/service role. Uji juga jalur API/WS, grant SQL, dan akses file nyata.
6. Profil Auth yang berganti role, notifikasi, signed URL pada ponsel, cache per akun, dan sesi yang dicabut harus diuji pada stack lokal lengkap.

## 6. Urutan dan bukti penerimaan audit

Urutan implementasi: **Supabase lokal sehat → DB-01/02/03 → seed dan file → quick login → integrasi trayek/dashboard → tracking → flow P1**. DB-04 mengikuti keputusan kontrol demo; DB-05 hanya bila kapasitas tersisa.

Sebelum menutup Sprint 1:

- Semua migration berhasil pada database lokal kosong dan perubahan tambahan diuji terhadap skema dua migration sebelumnya.
- ERD dan tipe database dihasilkan/diperbarui dari skema aktual. ERD awal mencantumkan unique pada kode trayek; ERD Sprint 1 sudah dikoreksi dan meliputi tabel tambahan.
- Seed dapat dijalankan dua kali tanpa duplikasi dan menghasilkan manifest jumlah/import/pengecualian.
- Akun tiga role dapat login nyata; approved driver mendapat kendaraan/arah yang benar tetapi tetap offline.
- FK, constraint lifecycle, hak akses, dokumen privat, dan statistik agregat lolos pemeriksaan lokal.
- Daftar schema wajib/opsional tetap mengikuti scope demo; tidak ada klaim bahwa tabel P2 sudah dibutuhkan hanya karena muncul dalam mock UI.

## Penutupan audit Sprint 4–5

Migration `20261111400000_mvp_completion.sql` menambah preferensi, provenance trip dan validasi laporan. `20261111500000_demo_consistency.sql` menyimpan tarif saat boarding serta melengkapi plat laporan dari kendaraan. Delapan migration diuji dari database kosong terisolasi; `supabase/tests/mvp_completion.sql` memverifikasi preference/ownership/evidence/status/idempotency/read state dengan rollback. [Sprint 4](./SPRINT_4.md) dan [Sprint 5](./SPRINT_5.md) mencatat bukti dan batas perangkat.
