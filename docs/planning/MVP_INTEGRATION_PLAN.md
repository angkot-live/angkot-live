# Rencana integrasi frontend–backend MVP Angkot-Live

Tanggal: **11 November 2026**. Acuan: [PRD](./PRD.md), [audit skema MVP](./SCHEMA_AUDIT_MVP.md), dan implementasi pada working tree saat ini.

**Tujuan:** aplikasi demo berjalan dengan Supabase lokal, akun tiga role yang dapat langsung login, data awal dari mock frontend, dan satu sumber data backend untuk semua fitur yang masuk demo.

Dokumen ini menjadi acuan sprint terbaru, menggantikan urutan milestone pada [rencana sebelumnya](./IMPLEMENTATION_PLAN.md). Sprint 1 telah diimplementasikan dan diuji pada stack Supabase lokal nyata. Lihat [bukti Sprint 1](./SPRINT_1.md); verifikasi sertifikat/GPS pada ponsel fisik masih menjadi checklist manual. Sprint 2 juga sudah diimplementasikan; lihat [bukti Sprint 2](./SPRINT_2.md). Sprint 3 juga sudah diimplementasikan dan diuji otomatis pada stack lokal; lihat [bukti Sprint 3](./SPRINT_3.md). Uji dua perangkat GPS asli, latensi lapangan dan layar terkunci tetap menjadi checklist manual. Sprint 4–5 juga telah diimplementasikan dan diverifikasi otomatis; lihat [Sprint 4](./SPRINT_4.md), [Sprint 5](./SPRINT_5.md) dan [script demo](./demo-script.md). Acceptance perangkat fisik dan penerimaan Product Owner tetap belum diklaim.

## 1. Keputusan scope

| Aspek | Keputusan MVP |
|---|---|
| Lingkungan | Supabase lokal terlebih dahulu. **Docker hanya untuk stack Supabase**, sesuai klarifikasi pengguna. React/Vite dan Go/Fiber berjalan langsung di host. |
| Fokus | Menutup gap integrasi dan membuktikan demo nyata. Gunakan kembali implementasi yang sudah ada. |
| Arsitektur | Satu backend Go/Fiber, Supabase Auth/PostgreSQL/PostGIS/Storage, dan WebSocket yang sudah ada. Posisi terkini tetap di memori. |
| Data | Mock dipindahkan menjadi fixture seed. Halaman demo membaca API/database; angka agregat dihitung dari data tersebut. |
| Auth demo | Quick login Penumpang, Pengemudi, dan Admin menggunakan akun Supabase Auth nyata. Tidak menetapkan role melalui state browser. |
| Pelacakan | GPS perangkat sebagai default; simulator opt-in khusus pengujian lokal sesuai permintaan pengguna. Seed tidak membuat kendaraan aktif, lokasi penumpang menunggu, atau ETA buatan. |
| Rute | Satu angkot/rute langsung menjadi jalur demo utama. Database menjadi sumber trayek, halte, dan status aktif. |
| Di luar sprint MVP | Deployment, Dockerfile aplikasi, Compose aplikasi, hosting, Redis, microservices, CI/CD tambahan, pembayaran, tip, heatmap, dan graph transfer multi-leg. |

Prioritas PRD tetap dipakai: **P0 wajib lulus**, lalu P1 yang membentuk demo lengkap. P2 tidak otomatis masuk sprint hanya karena sudah memiliki halaman. Halaman yang belum terintegrasi harus disembunyikan dari navigasi demo atau diberi keadaan belum tersedia, tanpa toast sukses palsu.

## 2. Kondisi awal sebelum Sprint 1

| Area | Yang sudah ada | Pekerjaan berikutnya |
|---|---|---|
| Auth/profil | Adapter Auth, sesi SDK, guard, register dan reset password | Jalankan pada Auth lokal nyata, seed akun valid, tambah quick login, pastikan perpindahan role membersihkan cache dan GPS. |
| Peta/GPS | WebSocket, duty, matching, status, TTL, wake lock | Uji antarperangkat; pastikan data dan assignment berasal dari seed/database lokal. |
| Trayek | 82 arah / 37 kode, importer, pencarian langsung | API saat ini masih membaca file di memori. Integrasikan CRUD dan pembaruan cache server agar perubahan database langsung memengaruhi peta/pencarian. |
| Megat/trip | Command backend, boarding/completion, riwayat | Uji ke Auth/DB lokal sungguhan: auto-arrival, visibility, batal/timeout, reload dan submit ganda. |
| Verifikasi/laporan | Upload privat, keputusan admin, timeline, notifikasi | Seed dokumen contoh yang benar-benar dapat dibuka; uji lintas akun/perangkat. |
| Dashboard/statistik | Dashboard penumpang/driver dan statistik publik memiliki integrasi | Dashboard admin dan statistik landing masih hardcoded; satukan agregat API. |
| Admin lainnya | UI daftar/editor trayek, kendaraan, pengguna, pesan | CRUD trayek termasuk MVP. Pengguna/kendaraan/pesan lengkap menjadi backlog tambahan; jangan mempertahankan mock sebagai fakta operasional. |
| Preferensi notifikasi | Toggle lokal | Simpan preferensi yang dipakai demo, atau sembunyikan kontrol yang belum berfungsi. Promo dikeluarkan dari MVP. |
| Supabase | Dua migration, bucket privat, RPC, seed lama | Belum ada `supabase/config.toml` dan workflow lokal proyek. Seed lama tidak kompatibel dengan onboarding/Auth saat ini. |

Pengujian sebelumnya memakai database terisolasi dan fixture browser. Bukti tersebut belum menggantikan pengujian stack Supabase lokal lengkap dengan Auth dan Storage.

## 3. Setup Supabase lokal sebagai pekerjaan pertama

Workflow standar Supabase CLI menjalankan stack lokal melalui container runtime; ini sesuai izin Docker khusus Supabase. [Dokumentasi Supabase CLI](https://supabase.com/docs/guides/local-development).

**Deliverable Sprint 1:**

1. Pasang Supabase CLI sebagai dev dependency yang versinya dikunci; jalankan dari root repository.
2. Buat `supabase/config.toml` untuk project lokal `angkot-live`. Konfigurasikan Auth email/password, Storage, dan seed file yang telah diperbaiki; PostGIS diaktifkan melalui migration. Email confirmation untuk akun demo diselesaikan oleh seeder, tanpa ketergantungan layanan email eksternal.
3. Jalankan stack lokal, ambil URL/anon key/service role key dari status lokal, dan isi environment frontend/API. Backend memakai service role; browser hanya anon key dan token pengguna.
4. Jalankan dua migration yang sudah ada, lalu migration pelengkap hasil audit. Uji dari database kosong menggunakan Auth/Storage asli, bukan `tests/bootstrap.sql`.
5. Siapkan command ringkas `local:start`, `local:status`, `local:stop`, `db:migrate`, `demo:seed`, dan `demo:reset`. Command tersebut sudah tersedia setelah implementasi Sprint 1; ikuti [setup lokal](./SETUP.md).
6. Jalankan frontend dengan Vite dan backend dengan `go run`; tidak memakai container aplikasi atau file `deploy/`.

Contoh urutan awal setelah CLI dipasang:

```bash
npx supabase init
npx supabase start
npx supabase status
```

Setelah seed lama diganti dan lingkungan lokal dipastikan benar, `demo:reset` boleh membangun ulang database demo lalu menjalankan seluruh seeder. Reset harus memeriksa project/host lokal; jangan menjalankan reset pada database yang dipakai menyimpan data penting.

### Akses GPS dari ponsel

`localhost` laptop bukan `localhost` ponsel. Karena frontend memakai SDK Auth langsung untuk sesi/refresh, koneksi ponsel juga harus dapat mencapai Supabase.

- Siapkan satu origin HTTPS lokal dengan sertifikat yang dipercaya perangkat; ini kebutuhan pengujian GPS, bukan pekerjaan deployment.
- Vite meneruskan `/api` beserta WS ke Go, dan `/supabase` ke gateway Supabase lokal. Gunakan origin yang sama pada browser ponsel agar URL `127.0.0.1` laptop tidak bocor ke konfigurasi SDK ponsel.
- Samakan `WEB_ORIGIN`, allowlist host Vite, dan redirect Auth lokal untuk origin demo. Pastikan URL dokumen bertanda tangan yang dikembalikan API juga dapat dijangkau ponsel; jangan mengembalikan URL loopback host.
- Uji login/refresh, lokasi, WebSocket, dan buka dokumen dari perangkat kedua sebelum menyatakan setup selesai.

## 4. Mock frontend menjadi seeder

### Inventaris dan pemetaan

| Sumber saat ini | Target seed / aturan |
|---|---|
| `src/data/angkot-routes.json` | `routes`, `route_segments` yang diusulkan, dan `route_stops`. Pertahankan ID per arah; kode boleh sama. |
| `src/mocks/data.ts`: `vehicles` | Armada terdaftar dan assignment driver; **semuanya offline** setelah seed. Posisi, speed, heading, ETA, dan kursi tersedia contoh tidak dipakai sebagai telemetry aktif. |
| `src/mocks/data.ts`: `reports` | `reports` + `report_updates`; ikat reporter dan kendaraan melalui mapping ID/plat. Tanggapan menjadi baris timeline. |
| `src/mocks/admin.ts`: `driverApplicants` | Akun Auth pengemudi, `driver_profiles`, draft/submission, dokumen, status pending/disetujui/ditolak dan alasan. |
| `src/mocks/admin.ts`: `adminUsers` | Akun Auth + `profiles`; role dinormalisasi menjadi `admin/pengemudi/penumpang`. Status suspend hanya dipakai bila story pengelolaan pengguna diambil. |
| `src/mocks/passenger.ts`: `trips` | Trip historis selesai satu angkot. `dibatalkan` sebelum naik menjadi request batal; tidak diubah menjadi trip aktif. Data multi-leg disimpan sebagai fixture P2, tidak diratakan diam-diam. |
| `src/mocks/passenger.ts`: `notifications` | Pesan/notifikasi per penerima dengan tanggal absolut, jenis, dan read state. Notifikasi “angkot mendekat” hanya historis dan tidak mengaktifkan kendaraan/menunggu. |
| `src/mocks/driver.ts`: `driverMessages` | `messages` milik driver dengan sender, content, timestamp dan status dibaca. Sesuaikan klaim tip yang belum didukung MVP agar tidak tampil sebagai fitur aktif. |
| `publicStats`, metrics/dashboard, jumlah kendaraan, persentase, metadata panjang trayek | **Bukan baris seed agregat.** Hitung dari seed faktual, geometri, trip, laporan, dan GPS aktif. Jangan mengisi 1.240 armada hanya agar cocok dengan angka hardcoded. |
| `animated-vehicles.ts`, fixture tes browser | Tetap fixture tes/pratinjau terisolasi, tidak diimpor ke posisi live. |

### Pipeline seed yang ditargetkan

```text
mock + dataset trayek
    → ekspor fixture JSON dan normalisasi
    → validasi serta manifest mapping/pengecualian
    → seed trayek/halte
    → buat akun Auth nyata dan mapping ID
    → seed profil/armada/assignment/dokumen
    → seed trip historis/laporan/timeline/pesan
    → periksa FK, jumlah data, login, dan statistik
```

- Pindahkan fixture ke `supabase/fixtures/`; runtime frontend berhenti mengimpor data mock. Tipe bersama dipindah dari `mocks/` ke `types/` agar impor tipe tidak dianggap data operasional.
- Buat `scripts/export-demo-fixtures.mjs`, seeder lokal, dan manifest `legacy_id → database_id`. ID `v-1/rep-1/app-1/usr-1` dipetakan ke UUID domain stabil; ID Auth diambil dari akun yang dibuat/ditemukan berdasarkan email.
- Rekonsiliasi orang yang sama di beberapa file berdasarkan identitas/email, bukan nama saja. Mock berisi nama driver berulang pada kendaraan berbeda, sedangkan skema membatasi satu assignment; tentukan driver tugas per kendaraan dan catat penyesuaiannya di manifest.
- ID seperti `r-08` serta nama trayek mock yang tidak sesuai data aktual harus dipetakan berdasarkan kode **dan arah**, diverifikasi terhadap geometri. Contoh nama “08 Stasiun Hall–Dago” tidak boleh diterima otomatis hanya karena kodenya 08.
- Jadikan tanggal relatif seperti “Hari ini” sebagai timestamp absolut terhadap `DEMO_REFERENCE_DATE`. Sediakan dokumen sintetis bertanda “CONTOH DEMO”, tanpa identitas pribadi nyata; upload file lewat Storage API, bukan menulis metadata file yang tidak ada.
- Pisahkan migration (DDL) dan seed (data). Seed SQL dijalankan setelah migration oleh CLI; provisioning akun dan file ditangani script setelah layanan sehat. [Panduan seeding Supabase](https://supabase.com/docs/guides/local-development/seeding-your-database).
- Seed idempotent: dua kali jalan tidak menambah akun/armada/trip/laporan/pesan duplikat dan tidak mengubah transaksi hasil demo. Full reset hanya lewat command lokal khusus, bukan setiap API start.
- Setiap sumber memiliki catatan `imported`, `mapped`, `deferred`, atau `rejected` dengan alasan; jangan membuang data yang tidak cocok secara diam-diam.

## 5. Akun demo dan quick login tiga role

| Tombol | Akun lokal usulan | Keadaan awal |
|---|---|---|
| Masuk sebagai Penumpang | `penumpang@demo.angkot.local` | Profil lengkap, histori dan laporan seed tersedia, tanpa request/trip aktif. |
| Masuk sebagai Pengemudi | `pengemudi@demo.angkot.local` | Terverifikasi, kendaraan dan arah trayek ditugaskan, dokumen contoh tersedia, **offline** sampai mulai narik dan mengirim GPS perangkat atau memilih simulator pengujian lokal secara eksplisit. |
| Masuk sebagai Admin | `admin@demo.angkot.local` | Role admin pada profil tepercaya; antrean verifikasi dan laporan seed tersedia. |

Tambahkan satu akun pending dan satu ditolak untuk skenario verifikasi; keduanya bukan tombol utama quick login.

**Implementasi:**

1. Seeder membuat akun melalui Auth Admin API dengan password demo lokal dan email terkonfirmasi. API tersebut ditujukan untuk lingkungan server dengan key berprivilege. [Referensi Auth Admin `createUser`](https://supabase.com/docs/reference/javascript/auth-admin-createuser).
2. Untuk admin, buat akun dengan metadata role penumpang, kemudian promosikan `profiles.role` lewat seeder tepercaya. Trigger saat ini sengaja menolak registrasi metadata admin; jangan mengendurkannya demi demo.
3. Tombol quick login memanggil flow `/auth/login` dan sesi yang sama dengan form biasa. Sesudah `/me`, redirect berdasarkan role dari server; hasil bukan user sintetis di Zustand.
4. Gunakan flag demo frontend/backend dan guard seeder yang memastikan Supabase project lokal. Password contoh boleh didokumentasikan untuk demo lokal; service role key tidak masuk bundle.
5. Saat berganti role: hentikan duty/GPS bila perlu, logout sesi sebelumnya, tutup WS, bersihkan cache akun, lalu login akun berikutnya. Jangan mendaur ulang trip atau data privat akun sebelumnya.
6. Gunakan profil browser/perangkat terpisah untuk demo tiga role simultan. Pergantian role di tab dengan storage Auth yang sama bukan isolasi akun; uji interaksi antartab agar tidak salah menafsirkan hasil demo.
7. Uji akun tidak ditemukan/password salah, pending driver ditolak bertugas, refresh/reload, dan tombol ganda. Bila rate limit login menghambat perpindahan role demo, gunakan konfigurasi lokal yang memadai tanpa menghapus validasi login/RBAC.

## 6. Audit skema dan kontrak integrasi

Detail field, constraint, dan alasan ada di [SCHEMA_AUDIT_MVP.md](./SCHEMA_AUDIT_MVP.md). Kesimpulannya: skema sudah mendukung sebagian besar flow inti, tetapi belum lengkap untuk seluruh layar demo dan seed yang konsisten.

**Wajib dikerjakan sebelum menghapus mock:**

- Kanonisasi geometri/segmen/halte dan invalidasi cache trayek, termasuk status aktif.
- Lengkapi metadata driver/dokumen yang masih hanya berada dalam JSON draft, serta revisi dokumen aktif.
- Tegakkan consistency assignment, request/trip, jarak, timestamp, dan constraint numerik yang relevan.
- Persist preferensi notifikasi bila kontrolnya tetap ada; penentuan agregat/DTO konsisten untuk dashboard dan landing.
- Ganti seed lama yang mengisi `auth.users` secara langsung dan memasukkan lokasi contoh.
- Regenerasi tipe database dari stack lokal dan perbarui ERD setelah migration pelengkap, tidak menambahkan ulang field yang sudah tersedia.

**Kontrak yang perlu ditambah/disesuaikan:**

| Area | Kontrak MVP |
|---|---|
| Trayek | `/routes` dan `/routes/:id` membaca database/cache yang diperbarui. Tambah `POST/PUT/DELETE /admin/routes` beserta pengelolaan halte/segmen. |
| Dashboard | `GET /admin/dashboard`, agregat landing/statistik publik, dan ringkasan per role dari data faktual. Bedakan jumlah kode trayek dan jumlah arah. |
| Profil/preferensi | `GET/PATCH /me` ditambah preferensi yang benar-benar dipakai. Kontrol promo dihapus dari demo. |
| Mutasi admin | Setelah simpan, daftar/detail, peta, planner, dan statistik terkait di-invalidate; perubahan terlihat setelah reload dan pada akun lain. |
| Realtime | Pertahankan transport snapshot yang sudah bekerja untuk MVP, pastikan maknanya setara kebutuhan event PRD. Tidak perlu refactor protokol besar hanya untuk mengganti nama event. |
| Ekstensi opsional | `/admin/users`, `/admin/vehicles`, dan pengiriman pesan admin hanya jika story tambahan diambil; jangan menampilkan aksi lokal sebagai sukses tersimpan. |

REST yang berbeda dari contoh PRD boleh dipertahankan jika perilaku sama dan dokumentasi mengikuti implementasi; jangan menghabiskan sprint mengganti seluruh URL tanpa manfaat demo.

## 7. Scrum/Agile ringan

**Usulan:** lima sprint pendek dengan timebox **1–2 hari kerja per sprint**, disesuaikan kapasitas tim. Ini perkiraan perencanaan, bukan janji tanggal; review kapasitas setelah Sprint 1. Setiap sprint menghasilkan increment yang dapat diperagakan.

- Satu Product Owner menetapkan urutan demo dan menerima hasil; fasilitator Scrum dapat bergilir.
- Pembagian kerja: frontend/integrasi, backend/database, serta QA/seed/demo; anggota tim boleh bertukar sesuai bottleneck.
- Planning 15–20 menit, daily 10 menit, review 15 menit, retrospective 10 menit. Hindari administrasi tambahan yang tidak membantu increment.
- Board: `Backlog → Ready → In Progress → Review/Test → Done`; batas satu story aktif per orang.
- Story harus menyebut aktor, hasil, dependency, dan acceptance criteria. Pecah story yang tidak selesai dalam satu sprint. Review akhir sprint memakai aplikasi berjalan, bukan jumlah file yang diubah.

### Sprint 1 — Supabase lokal, skema, seed, quick login

**Sprint goal:** anggota tim dapat menjalankan stack lokal dan masuk sebagai tiga role dengan data seed yang saling terhubung.

| ID | Backlog | Dependency |
|---|---|---|
| S1-01 | CLI/config lokal, environment, start/status/stop, dan pemeriksaan Auth/DB/Storage | Tidak ada |
| S1-02 | Finalisasi audit dan migration pelengkap skema wajib; tipe/ERD mengikuti | S1-01 |
| S1-03 | Ekspor/normalisasi mock, mapping fixture, seed akun/data/file idempotent | S1-02 |
| S1-04 | Quick login tiga role melalui Auth nyata dan pemulihan sesi | S1-03 |
| S1-05 | Jalur HTTPS lokal dan konektivitas Auth/API/WS dari perangkat kedua | S1-01 |

**Status implementasi:** S1-01 sampai S1-04 sudah diuji otomatis pada stack lokal. Implementasi S1-05 tersedia dan HTTPS LAN/WSS/Auth/Storage lulus dari browser host; uji ponsel fisik, trust CA dan izin GPS menunggu pemeriksaan manual. [Rincian dan bukti](./SPRINT_1.md).

**Acceptance:** reset lokal menghasilkan data yang konsisten; seed dua kali tidak duplikat; tiga tombol menghasilkan JWT dan `/me` sesuai role; driver demo tetap offline; dokumen contoh dapat dibuka admin; tidak ada service role key di browser. Bukti sprint: tiga role login, satu profil driver, satu histori trip, satu laporan, satu dokumen privat.

### Sprint 2 — Trayek, CRUD admin, dashboard, dan statistik

**Sprint goal:** admin dapat mengubah informasi yang langsung dipakai penumpang/pengemudi.

| ID | Backlog | PRD |
|---|---|---|
| S2-01 | Repository/cache trayek database, segmen berarah, halte, endpoint publik | PAX-04, PUB-01 |
| S2-02 | CRUD trayek/halte: tambah, edit, aktif/nonaktif, archive/delete sesuai referensi | ADM-02 |
| S2-03 | Sambungkan daftar/detail trayek, pilihan onboarding, peta, dan pencarian ke sumber kanonis | PAX-01/04 |
| S2-04 | Dashboard admin + landing/statistik publik dari agregat DB/live; hilangkan angka hardcoded | ADM-01, PUB-02 |

**Status:** S2-01 sampai S2-04 tersedia dan diuji pada Supabase lokal/API/browser nyata. Lihat [increment dan bukti](./SPRINT_2.md).

**Acceptance:** perubahan nama/geometri/halte/status bertahan setelah reload dan terlihat pada browser lain tanpa restart API. Trayek nonaktif tidak direkomendasikan atau dapat ditugaskan untuk duty baru; penghentian duty aktif ditangani konsisten. Jumlah arah dan kode sesuai seed. Penghapusan trayek yang memiliki histori tidak merusak FK.

### Sprint 3 — Tracking dan pencarian P0 pada perangkat nyata

**Sprint goal:** driver terverifikasi dapat narik dan terlihat oleh penumpang/publik pada arah yang benar.

| ID | Backlog | PRD |
|---|---|---|
| S3-01 | Validasi assignment/duty/GPS pada Auth lokal; status bersama peta/dashboard | DRV-01/02/03 |
| S3-02 | Marker, filter arah/radius, detail driver/plat, ETA ke titik naik; tidak ada telemetry seed | PAX-01/02/03 |
| S3-03 | Rekomendasi langsung berarah dari trayek kanonis; tangani geocoding/jalan kaki gagal | PAX-04 |
| S3-04 | Reconnect, stale/remove, offline/istirahat, wake lock dan penolakan GPS buruk | AUTH-05, DRV-08, BR-05/06/07 |
| S3-05 | Simulator opt-in pengemudi khusus lokal: kecepatan, titik mulai, jeda, label/provenance dan isolasi ringkasan operasional | Tambahan pengguna 11 November 2026 |

Status implementasi dan bukti otomatis: [Sprint 3](./SPRINT_3.md). Dua Android tersedia; acceptance GPS asli tetap menunggu pelaksanaan pada perangkat. Simulator memenuhi kebutuhan uji gerak tanpa harus melakukan perjalanan dan tidak menggantikan acceptance GPS asli.

**Status:** S3-01 sampai S3-05 tersedia dan diuji otomatis pada Supabase lokal/API/WebSocket/browser nyata. Simulator juga diuji tanpa izin GPS perangkat. Angka latensi pengujian lokal terbaru dicatat di `.local/sprint3-metrics.json`; target ≤3 detik. Uji dua perangkat GPS asli, latensi lapangan dan layar terkunci tetap manual. Lihat [increment dan bukti](./SPRINT_3.md).

**Acceptance:** dua perangkat dengan GPS asli, status narik → terlihat, istirahat/offline → hilang, dan koneksi putus → stale/hilang. Pending/rejected driver tidak tampil. ETA tidak memakai waktu ke ujung trayek atau koordinat asal custom sebagai lokasi aktual. Catat latensi update dan penyebab bila target belum tercapai.

**Gate P0:** demo tidak lanjut ke penambahan fitur jika login/role, peta realtime, detail/ETA, pencarian langsung, atau duty masih rusak.

### Sprint 4 — Verifikasi, megat, perjalanan, laporan P1

**Sprint goal:** satu perjalanan penumpang lengkap dapat dipantau dan dipertanggungjawabkan.

| ID | Backlog | PRD |
|---|---|---|
| S4-01 | Onboarding/upload/revisi/approve/reject pada akun lokal; dokumen terbaru menjadi acuan | AUTH-03/04/05, ADM-03 |
| S4-02 | Megat: walking → searching, visibilitas arah/radius, respons opsional, batal/expiry | PAX-05, DRV-04, BR-02/03/08 |
| S4-03 | Naik → trip aktif → selesai; hapus marker menunggu, restore setelah reload, riwayat nyata | PAX-06, BR-04 |
| S4-04 | Laporan + bukti, timeline admin, notifikasi/read state dan preferensi yang didukung | PAX-07, ADM-06 |
| S4-05 | Auto-ngetem 90 detik, deadline prompt, jawaban tidak, serta ringkasan driver | DRV-05/07, BR-01 |

**Status implementasi:** tersedia dan diuji pada Auth/API/Storage/WS lokal nyata, termasuk tiga rehearsal berurutan, revisi dokumen, idempotency/privasi, preferensi persisten dan timer ngetem waktu nyata. [Bukti Sprint 4](./SPRINT_4.md).

**Acceptance:** quick login pada tiga profil browser terpisah; admin menyetujui driver, driver mengirim GPS, penumpang megat/naik/turun, lalu membuat laporan. Admin menanggapi dan penumpang melihat timeline di perangkatnya. Klik ganda/reconnect tidak menciptakan trip ganda; lokasi menunggu hilang setelah naik/batal/expired. Data tidak bocor ke akun lain.

### Sprint 5 — Hilangkan sisa mock, rapikan demo, dan rehearsal

**Sprint goal:** seluruh fitur yang ditampilkan saat demo menggunakan data backend dan alur utama dapat diulang.

| ID | Backlog | Kriteria |
|---|---|---|
| S5-01 | Audit seluruh impor mock, store persist lokal, hardcoded metrics, dan tombol toast-only | Tidak ada sumber mock runtime pada fitur demo |
| S5-02 | Hapus/sembunyikan kontrol/halaman di luar scope; error/loading/empty state jelas | Tidak ada klaim simpan atau broadcast palsu |
| S5-03 | Perbaiki bug lintas role/cache, dokumen/sign URL ponsel, geometri, expiry dan reset | Skenario negatif utama lulus |
| S5-04 | Jalankan tes ke Supabase lokal lengkap dan rehearsal dua perangkat; tulis demo script | Jalur utama berhasil tiga kali berurutan |

**Status implementasi:** audit bundle demo, pembersihan prototipe/kontrol palsu, cache privat, rehearsal tiga kali dan fixture rendering 50 marker tersedia. Pengelolaan pengguna/kendaraan/pengiriman pesan admin dikeluarkan dari navigasi demo; source referensi dipertahankan. Pengukuran perangkat asli/4G dan penerimaan Product Owner tetap manual. [Bukti Sprint 5](./SPRINT_5.md).

**Story tambahan hanya jika gate P0/P1 sudah lulus:** daftar pengguna dari DB beserta suspend nyata; daftar kendaraan/dokumen; pesan admin sederhana dengan satu baris per penerima. Jika belum selesai, keluarkan dari navigasi demo. Jangan mulai tip, transfer multi-leg, broadcast scheduler, atau analitik lengkap.

## 8. Definition of Ready / Done

**Ready:** sumber data dan role pemilik diketahui, kontrak/DTO jelas, dependency tersedia, acceptance criteria dapat diuji, serta ada fixture untuk keadaan kosong dan berhasil.

**Done:**

- UI memanggil sumber backend yang tepat dan mutation benar-benar persisten; reload tidak mengembalikan data mock.
- Hak akses diuji di API/DB, bukan hanya menyembunyikan tombol.
- Loading, error, empty, sukses, serta idempotency untuk mutasi penting ditangani.
- Seed dan migration dapat diulang pada project lokal; file privat ada di Storage.
- Minimal ada satu pengujian integrasi nyata terhadap stack lokal untuk story tersebut, selain fixture/unit test yang relevan.
- Tidak menambah regresi build/type-check; tes yang sesuai lulus; dokumentasi kontrak dan board diperbarui.
- Increment diperagakan dan diterima Product Owner. Story yang belum terbukti tidak dihitung Done.

## 9. Definition of Demo Ready

1. Supabase lokal aktif, satu API Go dan satu Vite; tidak ada dependensi deployment atau container aplikasi.
2. Seeder menyiapkan tiga akun utama, pending/rejected driver, armada offline, histori, laporan dan file contoh.
3. Tiga role dapat quick login dan dipakai serentak lewat profil/perangkat berbeda.
4. GPS asli driver dapat ditampilkan penumpang; megat hingga trip selesai lulus tanpa lokasi buatan.
5. Admin mengubah trayek, memverifikasi driver, dan menanggapi laporan; hasil terlihat pada akun lain.
6. Landing/dashboard/statistik mengambil agregat faktual; angka kosong aktif setelah seed adalah wajar sampai driver narik.
7. Skenario izin lokasi ditolak, koneksi putus, pending driver, request expired, dan reload tidak merusak alur.
8. Ukur target PRD (update ≤3 detik, interval GPS 3–5 detik, peta ≥50 marker, buka peta ≤3 detik pada 4G). Fixture beban ≥50 hanya untuk tes; tidak dipresentasikan sebagai armada nyata.
9. Demo utama berdurasi sekitar 5–7 menit, dengan skenario verifikasi/timeout/ngetem tambahan terpisah agar tidak memperlambat presentasi utama.

## 10. Artefak implementasi berikutnya

| Artefak | Sprint |
|---|---|
| `supabase/config.toml`, command lokal dan environment examples | S1 |
| Migration pelengkap berdasarkan audit, tipe database, ERD | S1; revisi kecil hanya jika story berikutnya memerlukan |
| `supabase/fixtures/`, seeder Auth/data/Storage dan manifest mapping | S1 |
| Quick login lokal di halaman login dan pengujian tiga akun | S1 |
| Repository/cache trayek, CRUD admin, DTO agregat, hooks React Query | S2 |
| Integrasi/pengujian GPS dua perangkat | S3 |
| Penutupan gap verifikasi/megat/trip/laporan/notifikasi | S4 |
| Daftar cek integrasi akhir dan `docs/demo-script.md` | S5 |

File Dockerfile/Compose/deploy yang sudah ada tidak dikembangkan pada rencana ini. README dan panduan setup telah memakai workflow Supabase lokal sebagai default pada Sprint 1.
