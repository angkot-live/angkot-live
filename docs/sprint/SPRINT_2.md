# Sprint 2 — integrasi trayek dan statistik

Tanggal: **11 November 2026**. Referensi: [backlog MVP](./MVP_INTEGRATION_PLAN.md), [PRD](./PRD.md), [setup lokal](./SETUP.md).

Sprint goal: admin dapat menyimpan perubahan trayek yang langsung dipakai penumpang/pengemudi, serta membaca ringkasan dari data aktual.

| Story | Increment | Verifikasi |
|---|---|---|
| S2-01 | Repository Go membaca DTO dari `routes`, `route_segments`, `route_stops`; planner/pencarian dan tracking memakai repository yang sama | 82 arah, 37 kode, 104 chain; API berjalan tanpa membaca file dataset saat startup normal |
| S2-02 | CRUD informasi, geometri per chain, halte/terminal, reorder, tarif dan status; optimistic concurrency memakai `updatedAt` | API/SQL/browser: create/update/delete, konflik 409, rollback input invalid dan perlindungan histori |
| S2-03 | Daftar/detail publik, peta, monitoring, pilihan onboarding, riwayat dan trip membaca katalog API | Perubahan di context admin terlihat pada context publik yang tetap terbuka; reload mempertahankan data |
| S2-04 | Dashboard admin, landing dan statistik publik membaca agregat DB/GPS live | Baseline: 14 kendaraan, 0 GPS aktif, 4 pending, 7 laporan; tidak ada angka armada/ETA contoh pada landing |

## Perilaku trayek

`20261111200000_route_management.sql` menambahkan `route_catalog()`, `admin_route_command()` dan `admin_dashboard()`, serta memperbarui sinkronisasi geometri dan pemeriksaan lifecycle. Tabel baru tidak diperlukan. DTO merakit geometri dari tabel segmen/halte, menghitung panjang menggunakan PostGIS geography, dan mempertahankan ID halte saat urutannya berubah. Chain terputus tidak dijembatani. Kode boleh sama untuk beberapa arah.

Cache Go berlaku **3 detik** dan langsung dimuat ulang setelah mutasi admin berhasil. Katalog React Query diperbarui setiap **5 detik**, termasuk saat background. Browser lain memperoleh perubahan tanpa restart API; perubahan melalui API biasanya terlihat dalam satu interval polling. Edit langsung di database dapat memerlukan satu siklus cache tambahan. Kegagalan backend ditampilkan sebagai error; katalog file tidak menjadi fallback runtime.

Editor menyediakan penambahan titik melalui klik peta, pemindahan titik melalui drag, penghapusan titik lewat klik kanan, serta segmen terpisah. Halte ditambahkan/dipindahkan pada peta, dapat diganti nama/koordinat/status terminal, diurutkan dan dihapus. Form hanya memberi toast berhasil setelah API menyimpan seluruh perubahan atomik. Nama jalan otomatis lama dihapus ketika geometri berubah agar tidak mengklaim jalan yang belum diverifikasi.

- Nama/kode berubah: label pada sesi tracking diperbarui.
- Geometri/status berubah: duty lama ditutup, GPS session dibuang dan request menunggu dibatalkan. Driver harus memulai duty baru dan mengirim GPS segar.
- Geometri tidak dapat diubah selama ada trip aktif. Nonaktif tetap diperbolehkan; trip yang sudah berlangsung dapat diselesaikan dan histori tetap tersimpan.
- Arah nonaktif tidak muncul di katalog aktif, pilihan onboarding atau hasil pencarian; request, boarding, approval assignment dan duty baru ditolak oleh command database. Retry boarding yang sudah berhasil tetap idempotent.
- Hard delete ditolak dengan **409** jika ada kendaraan, assignment, request, trip atau duty yang merujuk arah itu. Gunakan nonaktif sebagai archive. Trayek tanpa referensi dapat dihapus permanen.
- Dua editor dengan versi berbeda tidak menimpa perubahan satu sama lain. Simpan/hapus memerlukan `updatedAt` terbaru; konflik mengembalikan **409** dan meminta muat ulang.

## Endpoint

| Endpoint | Perilaku |
|---|---|
| `GET /api/routes` | Katalog aktif dari DB |
| `GET /api/routes?includeInactive=true` | Katalog termasuk nonaktif, hanya metadata publik; dipakai admin dan nama trayek histori |
| `GET /api/routes/:id` | Detail satu arah, termasuk arsip untuk referensi |
| `GET /api/search/route` | Rekomendasi langsung pada arah aktif |
| `GET/POST /api/admin/routes` | Daftar / buat arah baru; admin saja |
| `GET/PATCH/DELETE /api/admin/routes/:id` | Detail / simpan atomik / hapus aman; admin saja |
| `GET /api/admin/dashboard` | Agregat, antrean pending dan laporan terbaru; admin saja |
| `GET /api/stats/public` | Statistik publik tanpa identitas pribadi |

Detail ada pada `apps/api/api/openapi.json`. Grant mutasi langsung pada routes/route_stops dicabut dari role browser. Semua RPC baru dicabut dari anon/authenticated; API memvalidasi Auth dan role sebelum memakai service role.

## Bukti pengujian

- Migration berhasil pada Supabase lokal yang sudah berisi baseline Sprint 1. Seluruh empat migration dan regresi `apps/api/tests/flows.sql` juga lulus dari database kosong terisolasi; database tes dibersihkan setelah selesai.
- `npm run demo:verify:sprint2`: CRUD, dua chain tanpa bridge, reorder ID halte, konflik versi, rollback geometri invalid, archive/filter pencarian, larangan delete ketika direferensikan, RBAC dan angka dashboard.
- `supabase/tests/route_management.sql`: archive menutup duty, membatalkan request, menolak duty baru, melindungi geometri selama trip, mempertahankan completion/histori dan retry boarding. Seluruh fixture di-rollback.
- `npm run demo:browser:sprint2`: browser dengan context admin/publik terpisah, menggambar jalur dan halte, simpan, reorder/delete, persist setelah reload, pembaruan publik tanpa reload, archive/delete dan dashboard. Drag geometri terlihat pada peta publik; pilihan onboarding pada context driver mengikuti rename/nonaktif. Auto-search dari URL juga diuji menunggu katalog DB sebelum mengirim pencarian.
- `go vet ./...`, `go test -race ./...`, unit frontend, lint dan build TypeScript/Vite lulus. Tiga warning lint lama dan warning ukuran chunk tetap ada.
- Browser Sprint 1 tetap lulus pada Auth/API/Storage/WSS nyata. Fixture regresi megat/boarding/reload/complete/laporan/driver GPS juga lulus setelah kontrak katalog fixture disesuaikan.

Tes API/browser menggunakan trayek sementara dan menghapusnya setelah selesai. Baseline kembali menjadi 82 arah. Screenshot dashboard: `.local/screenshots/sprint2-dashboard.png`.

## Batas increment

Belum ada klaim bahwa semua layar aplikasi telah terintegrasi: pengelolaan kendaraan/pengguna dan pengiriman pesan admin tetap backlog. Uji GPS ponsel fisik, latensi tracking lapangan dan perilaku layar terkunci mengikuti Sprint 3. Checklist trust CA/perangkat kedua Sprint 1 tetap memerlukan pemeriksaan manual. Deployment tidak menjadi pekerjaan sprint ini.
