# Roadmap implementasi Angkot-Live

Tanggal peninjauan: **11 November 2026**. Acuan: [PRD v0.1](docs/resource/PRD.md), source aplikasi, migration, dan bukti pengujian Sprint 1–5 serta simulator armada lokal.

**Alur inti MVP sudah tersedia pada frontend, backend dan Supabase lokal. Seluruh isi PRD belum selesai.** Fitur transfer, tip, pengiriman pesan bebas admin dan sebagian analitik/monitoring masih memiliki pekerjaan lanjutan. Penerimaan pada perangkat fisik juga belum dicatat lengkap.

Dokumen ini mencatat kondisi implementasi saat peninjauan. Bagian rencana berikutnya adalah usulan urutan pekerjaan, bukan klaim fitur sudah tersedia atau komitmen tanggal rilis.

## Cara membaca status

| Status | Arti |
|---|---|
| **Terimplementasi** | Perilaku utama requirement sudah tersedia dalam alur aplikasi dan memakai layanan/data backend yang sesuai. Batas pengujian tetap dicatat terpisah. |
| **Sebagian** | Sebagian perilaku/data sudah tersedia, tetapi masih ada komponen requirement PRD yang belum dipenuhi. |
| **Belum** | Fitur belum dapat digunakan dalam alur aplikasi. Keberadaan prototipe UI, helper atau tabel saja tidak dianggap implementasi fitur selesai. |
| **Perlu verifikasi** | Kode atau bukti lokal tersedia, tetapi kriteria penerimaan terkait perangkat, jaringan atau audit belum dibuktikan. Status ini digunakan pada bagian nonfungsional/penerimaan. |

“Terimplementasi” **bukan** pernyataan bebas bug, siap produksi, atau telah diterima Product Owner. Pemeriksaan ini tidak menjalankan ulang seluruh suite; hasil pengujian yang dikutip berasal dari bukti yang sudah tersimpan.

## Ringkasan kebutuhan fungsional PRD

Perhitungan berikut hanya memakai **33 ID pada bagian 7 PRD**, bukan jumlah halaman, aturan bisnis, atau kebutuhan nonfungsional.

| Prioritas | Terimplementasi | Sebagian | Belum | Total |
|---|---:|---:|---:|---:|
| P0 | 11 | 0 | 0 | 11 |
| P1 | 15 | 1 | 0 | 16 |
| P2 | 1 | 2 | 3 | 6 |
| **Total** | **27** | **3** | **3** | **33** |

P0 memiliki implementasi, tetapi pengukuran GPS asli, latensi antar-HP dan target 4G tetap harus melewati penerimaan perangkat. Angka di atas tidak digunakan sebagai persentase penyelesaian seluruh PRD.

## 1. Autentikasi dan akun

| ID | Prioritas | Status | Implementasi dan keterangan |
|---|---|---|---|
| AUTH-01 | P0 | Terimplementasi | Login/register memakai Supabase Auth; role admin/pengemudi/penumpang diperiksa melalui backend dan route guard. Registrasi publik hanya penumpang/pengemudi; admin diprovisikan melalui workflow tepercaya/seeder. |
| AUTH-02 | P0 | Terimplementasi | Pendaftaran penumpang menyimpan email, nama dan telepon ke Auth/profil. |
| AUTH-03 | P1 | Terimplementasi | Onboarding driver menyimpan NIK, SIM, kendaraan, jurusan, STNK, KIR dan foto; draft, upload privat dan pengiriman berkas tersambung ke backend. |
| AUTH-04 | P1 | Terimplementasi | Status menunggu → disetujui/ditolak, alasan penolakan, revisi dan pengiriman ulang tersedia. Nilai `menunggu` merupakan padanan `pending` pada PRD. |
| AUTH-05 | P1 | Terimplementasi | Approval, akun Auth, assignment, trayek dan sesi aktif diperiksa server; driver pending/rejected tidak dapat mempublikasikan posisi ke peta. |
| AUTH-06 | P0 | Terimplementasi | JWT, refresh, pemulihan sesi dan logout melalui Supabase tersedia; backend menyediakan logout global dan memeriksa akun saat autentikasi. Ini tidak mengklaim semua access token yang sudah terbit dicabut seketika tanpa mengikuti masa berlaku/kebijakan Auth. |

Tambahan yang sudah tersedia: quick login tiga role, lupa/reset password, pembaruan profil dan pergantian password. UI pengelolaan pengguna/suspend oleh admin belum termasuk alur demo; akun contoh yang diblokir melalui seeder tidak berarti fitur tersebut sudah tersedia.

Bukti: [Auth frontend](apps/web/src/features/auth/auth-store.ts), [handler API](apps/api/internal/httpapi/server.go), [onboarding](apps/web/src/features/driver/driver-onboarding-page.tsx), dan [Sprint 1](docs/sprint/SPRINT_1.md).

## 2. Admin

| ID | Prioritas | Status | Implementasi dan pekerjaan tersisa |
|---|---|---|---|
| ADM-01 | P1 | Terimplementasi | Dashboard menghitung total/aktif kendaraan, jumlah per jurusan/arah, antrean verifikasi dan laporan dari database serta engine tracking. |
| ADM-02 | P1 | Terimplementasi | CRUD trayek, geometri beberapa segmen terpisah, halte/terminal dan urutannya tersimpan atomik. Trayek bisa dinonaktifkan; penghapusan data yang masih direferensikan ditolak. Editor memakai titik di peta; tidak mengklaim fitur impor/ekspor file GeoJSON khusus. |
| ADM-03 | P1 | Terimplementasi | Antrean/detail verifikasi, signed URL berkas, approve/reject dengan alasan, revisi berkas dan pemberitahuan hasil verifikasi tersedia. |
| ADM-04 | P1 | Terimplementasi | Monitoring realtime dengan filter jurusan, radius, status serta data kecepatan/kesegaran/akurasi aktual. |
| ADM-05 | P2 | Sebagian | Data STNK/KIR, masa berlaku dan foto tersedia dari onboarding/berkas dan dapat diperiksa saat verifikasi. Monitoring kondisi seluruh armada, penanda dokumen kedaluwarsa otomatis serta halaman kendaraan admin operasional belum tersedia. |
| ADM-06 | P1 | Terimplementasi | Laporan beserta bukti privat, status diterima → diproses → selesai, tanggapan, timeline, idempotency dan penolakan perubahan versi usang tersedia. |
| ADM-07 | P2 | Belum | Belum ada composer dan API alur pengiriman pesan bebas ke pengemudi. Pesan otomatis keputusan verifikasi sudah ada; itu belum memenuhi pengiriman manual/broadcast admin. |

Halaman prototipe kendaraan, pengguna dan pesan admin masih tersimpan di source, tetapi tidak dirutekan atau ditawarkan dalam navigasi demo.

Bukti: [dashboard admin](apps/web/src/features/admin/dashboard-page.tsx), [editor trayek](apps/web/src/features/admin/route-editor-page.tsx), [monitoring](apps/web/src/features/admin/monitoring-page.tsx), [detail verifikasi](apps/web/src/features/admin/verification-detail-page.tsx), [laporan admin](apps/web/src/features/admin/report-detail-page.tsx), [Sprint 2](docs/sprint/SPRINT_2.md), dan [router](apps/web/src/app/router.tsx).

## 3. Pengemudi

| ID | Prioritas | Status | Implementasi dan pekerjaan tersisa |
|---|---|---|---|
| DRV-01 | P0 | Terimplementasi | GPS perangkat dikirim sekitar setiap 3 detik saat bertugas, divalidasi dan dicocokkan ke trayek. Ada simulator opt-in untuk pengujian lokal. Akurasi/interval lapangan masih perlu diverifikasi. |
| DRV-02 | P0 | Terimplementasi | Narik, ngetem, istirahat dan offline tersedia; status backend/database diselaraskan. Istirahat/offline tidak tampil pada peta penumpang. |
| DRV-03 | P0 | Terimplementasi | Peta kerja menerima kendaraan sendiri serta penumpang yang memenuhi aturan sekitar rute. Pembatasan data driver dilakukan pada server. |
| DRV-04 | P1 | Terimplementasi | Penumpang megat terlihat berdasarkan arah, chain, jarak dan kesegaran lokasi. Request walking tidak ditampilkan sebagai penumpang siap dijemput; respons pengemudi bersifat opsional. |
| DRV-05 | P1 | Sebagian | Dashboard kendaraan, jarak dan jumlah duty tersedia; duty simulasi dikecualikan dari ringkasan operasional. Komponen tip/penerimaan tip belum tersedia. |
| DRV-06 | P2 | Terimplementasi | Inbox penerima, daftar pesan dan read state tersambung ke backend. Pesan hasil keputusan verifikasi oleh admin sudah masuk. Pengiriman pesan bebas admin adalah gap terpisah pada ADM-07; inbox memakai polling, bukan event `message:new` khusus. |
| DRV-07 | P1 | Terimplementasi | Prompt diam 90 detik, jawaban ya/tidak dan auto-ngetem setelah deadline 15 detik tersedia. Movement/GPS gap memengaruhi observasi diam. |
| DRV-08 | P1 | Terimplementasi | Screen Wake Lock diminta saat bertugas, dilepas saat berhenti dan diupayakan kembali setelah release/visibility berubah. Dukungan serta efektivitas pada Android fisik masih perlu diperiksa. |

Bukti: [tracking provider](apps/web/src/features/tracking/tracking-provider.tsx), [engine server](apps/api/internal/tracking/engine.go), [snapshot dan event API](apps/api/internal/httpapi/server.go), [dashboard driver](apps/web/src/features/driver/driver-dashboard-page.tsx), [inbox](apps/web/src/features/driver/inbox-page.tsx), [query pesan](apps/web/src/features/messages/use-messages.ts), dan [Sprint 3](docs/sprint/SPRINT_3.md).

## 4. Penumpang

| ID | Prioritas | Status | Implementasi dan pekerjaan tersisa |
|---|---|---|---|
| PAX-01 | P0 | Terimplementasi | Peta trayek dengan kendaraan dari stream WebSocket backend. Data terputus/stale ditangani dan tidak diganti mock otomatis. |
| PAX-02 | P0 | Terimplementasi | Status jalan, merayap dan ngetem tampil dari engine server. Metode deteksi merayap dijelaskan pada BR-06. |
| PAX-03 | P0 | Terimplementasi | Detail jurusan, pengemudi, plat dan ETA ke titik naik tersedia. ETA hanya diberikan jika lokasi penumpang segar, arah/chain cocok dan titik naik masih relevan di depan kendaraan; jika tidak, UI menyatakan estimasi belum tersedia. |
| PAX-04 | P0 | Terimplementasi | Pencarian asal/tujuan dan rekomendasi langsung berarah memakai katalog database/API. Geocoding dan jalur jalan kaki menangani error layanan eksternal. |
| PAX-05 | P1 | Terimplementasi | Megat berjalan dari walking → searching berdasarkan GPS aktual; tersedia batal, expiry, respons opsional dan pencocokan server. Asal pencarian custom tidak dipakai sebagai GPS penumpang. |
| PAX-06 | P1 | Terimplementasi | Boarding atomik/idempotent, perjalanan aktif, pemulihan setelah reload, posisi kendaraan, ETA titik turun bila tersedia, completion dan riwayat satu angkot tersimpan. Tip dan perjalanan multi-leg tidak ikut tersedia. |
| PAX-07 | P1 | Terimplementasi | Form laporan, kategori, kendaraan/plat, bukti privat, daftar/detail laporan, timeline tanggapan dan notifikasi persisten tersedia. “Hotline” diwujudkan sebagai kanal pelaporan aplikasi; tidak ada integrasi telepon/WhatsApp operasional. |
| PAX-08 | P2 | Sebagian | Dashboard menghitung jumlah perjalanan, jarak, total tarif dan **trayek favorit** dari trip backend. PRD meminta angkot yang sering dinaiki; ranking **kendaraan/plat** yang paling sering dinaiki belum ditampilkan. |
| PAX-09 | P2 | Belum | Rekomendasi transfer 2+ angkot belum aktif di alur pencarian backend/aplikasi. Helper/prototipe perencana transfer masih ada di source, tetapi alur runtime memakai rekomendasi langsung. Graph Dijkstra/A*, hasil transfer kanonis dan lifecycle trip multi-leg belum tersedia. |
| PAX-10 | P2 | Belum | Belum ada alur memberi tip, pencatatan tip atau ringkasan tip driver, termasuk tip simulasi. |

Bukti: [peta dan pencarian](apps/web/src/features/map/map-screen.tsx), [rekomendasi langsung server](apps/api/internal/geo/direct.go), [perjalanan aktif](apps/web/src/features/passenger/active-trip-page.tsx), [dashboard penumpang](apps/web/src/features/passenger/dashboard-page.tsx), [trip backend](apps/web/src/features/trips/use-trips.ts), dan [Sprint 4](docs/sprint/SPRINT_4.md).

## 5. Publik

| ID | Prioritas | Status | Implementasi dan keterangan |
|---|---|---|---|
| PUB-01 | P0 | Terimplementasi | Publik bisa membuka peta, detail trayek dan pencarian rute langsung tanpa login. Peta aktual berada di `/peta`; `/` merupakan landing page. |
| PUB-02 | P1 | Terimplementasi | Statistik aktif per jurusan/arah, laporan dan tindak lanjut dihitung dari database/engine. Backend membedakan jumlah sumber GPS dan simulasi; data agregat publik tidak memuat dokumen privat. |

Bukti: [router](apps/web/src/app/router.tsx), [statistik publik](apps/web/src/features/public/statistics-page.tsx), dan [perhitungan statistik server](apps/api/internal/httpapi/routes.go).

## 6. Aturan bisnis PRD

| ID | Status | Perilaku saat ini dan batasnya |
|---|---|---|
| BR-01 | Terimplementasi | Diam dalam ambang sekitar 20 meter selama 90 detik memicu prompt; jawaban ya atau tanpa respons selama 15 detik menjadi ngetem. Sampel hilang tidak dianggap kendaraan diam terus. |
| BR-02 | Terimplementasi | Visibilitas penumpang dibatasi server: jurusan/arah dan chain sama, dekat trayek, posisi segar, jarak relevan terhadap kendaraan. Radius relevansi kendaraan sekitar 2 km; titik penumpang harus dekat jalur sekitar 100 meter. |
| BR-03 | Terimplementasi | GPS penumpang di luar area jalur menghasilkan walking; saat mencapai area sekitar 100 meter dari jalur menjadi searching. Petunjuk jalan kaki memakai layanan routing; kegagalan tidak menggambar jalur buatan sebagai rute nyata. |
| BR-04 | Terimplementasi | Boarding menonaktifkan request menunggu dan membuat satu trip aktif. Retry/submit ganda tidak membuat dua perjalanan. |
| BR-05 | Terimplementasi | Driver dan penumpang mengirim lokasi untuk tracking, pencocokan serta ETA. Titik asal pencarian custom terpisah dari GPS aktual. GPS fisik bersama masih perlu penerimaan perangkat. |
| BR-06 | Sebagian | Status merayap memakai **sampel kecepatan di bawah 5 km/jam selama 30 detik berturut-turut**. PRD menyebut kecepatan rata-rata; perhitungan rata-rata bergerak dan kalibrasi ambang melalui uji lapangan belum diterapkan/dibuktikan. |
| BR-07 | Terimplementasi | Posisi stale setelah >15 detik, marker dihapus setelah >30 detik, duty tanpa sampel ditutup setelah >60 detik. Istirahat/offline tidak ditampilkan. |
| BR-08 | Terimplementasi | Request searching memiliki timeout 60 detik; walking 5 menit, dan accepted diperpanjang 5 menit. Penumpang dapat membatalkan request aktif; expiry diselaraskan backend. |

Tabel BR tidak masuk perhitungan 33 requirement fungsional. Sumber utama: [engine tracking](apps/api/internal/tracking/engine.go), [handler flow](apps/api/internal/httpapi/server.go), [flow SQL](supabase/migrations/20261111000000_operational_flows.sql), dan [uji tracking](supabase/tests/tracking.sql).

## 7. Kebutuhan nonfungsional dan penerimaan

| Area PRD | Status | Bukti/kondisi saat ini | Yang masih perlu dilakukan |
|---|---|---|---|
| Update posisi ≤3 detik | Perlu verifikasi | Publish target 3 detik, snapshot server 1 detik dan bukti API/browser lokal tersedia. | Catat latensi end-to-end GPS asli pada dua HP; hasil fixture lokal tidak membuktikan semua jaringan memenuhi target. |
| ≥50 marker simultan | Perlu verifikasi | Bukti rendering 50 marker browser-only mencatat sekitar 950 ms pada mesin lokal; 14 kendaraan seed juga diuji melalui backend nyata. | Uji 50 publisher nyata dan perangkat mobile jika ingin mengklaim kapasitas backend serta pengalaman HP pada beban tersebut. |
| Peta terbuka ≤3 detik pada 4G | Perlu verifikasi | Ada pengukuran lokal, belum benchmark jaringan 4G/perangkat fisik. | Ukur cold load, tile dan render pada jaringan/perangkat sasaran. |
| Keandalan koneksi | Terimplementasi | Auto-reconnect, indikator koneksi, watchdog tanpa snapshot, refresh token, stale/remove dan lease duty tersedia. | Verifikasi Wi-Fi/seluler putus-pulih dan background pada Android. |
| Auth, JWT, RLS dan validasi | Terimplementasi | Mutasi lewat API/RPC berotorisasi, grant dibatasi, validasi GPS/urutan/jump, pembatasan frekuensi, limiter HTTP/Auth dan tipe/ukuran upload tersedia. | Tidak merupakan klaim audit keamanan menyeluruh; verifikasi ancaman/operasional lanjutan sesuai scope penggunaan. |
| Privasi berkas/lokasi | Terimplementasi | Bucket privat; endpoint signed URL dokumen driver dibatasi admin; bukti laporan dibatasi reporter/admin. Penumpang menunggu hanya dikirim sesuai aturan server, kemudian hilang saat batal/boarding/expiry. File privat tidak dicache service worker. | Ulangi uji lintas akun bila endpoint atau kebijakan akses berubah. |
| Responsif dan browser modern | Perlu verifikasi | Layout mobile dan browser viewport desktop/mobile tersedia pada tes. | Matriks browser/perangkat fisik dan interaksi touch lengkap belum dicatat. |
| PWA | Sebagian | Manifest, service worker dan cache aset/shell publik tersedia; service worker diregistrasikan hanya pada build produksi, bukan `dev:web`. | Validasi instalasi, icon/manifest lintas browser, update shell dan perilaku offline pada build. Tracking/Auth/berkas privat tetap membutuhkan jaringan. |
| Baterai dan penghentian GPS | Terimplementasi | Publikasi di-throttle dan watch/pengiriman berhenti saat tidak bertugas; wake lock mempunyai state dan release. | Pengukuran konsumsi baterai serta perilaku layar terkunci belum tersedia. |
| Aksesibilitas | Sebagian | Label status berbentuk teks, form/aksi berlabel dan beberapa perbaikan aksesibilitas sudah ada. | Audit keyboard, screen reader, fokus, target sentuh dan pengukuran kontras belum lengkap; belum ada klaim kepatuhan WCAG. |
| Demo end-to-end | Perlu verifikasi | Tiga rehearsal berurutan tercatat lulus pada Auth/API/Storage/WS lokal; fleet diuji melalui dua browser. | Penerimaan Product Owner serta GPS asli/CA/WSS/wake lock pada dua Android belum dicatat lengkap. |

Sumber: [Sprint 3](docs/sprint/SPRINT_3.md), [Sprint 4](docs/sprint/SPRINT_4.md), [Sprint 5](docs/sprint/SPRINT_5.md), [manifest](apps/web/public/manifest.webmanifest), [service worker](apps/web/public/sw.js), dan [entry frontend](apps/web/src/main.tsx).

## 8. Halaman dan kontrak yang berbeda dari rancangan PRD

Fungsi yang tersedia tidak selalu memakai URL, event atau nama tabel persis seperti rancangan awal. Perbedaan berikut perlu diperhatikan saat testing atau melanjutkan implementasi.

| Rancangan PRD | Kondisi aktual |
|---|---|
| `/` sebagai peta publik | `/` landing; peta di `/peta`. |
| `/rute` sebagai halaman pencarian | Pencarian berada dalam peta, termasuk `/peta?tab=rute`; belum ada route `/rute` tersendiri/alias. |
| `vehicles:update`, `passengers:nearby`, `ngetem:prompt` | Server mengirim event `snapshot` yang membawa vehicles, duty/prompt, nearby, request dan trip sesuai aktor. Fungsi utamanya ada; nama/event terpisah PRD belum diadopsi seluruhnya. |
| `message:new` | Inbox/notifikasi diambil dengan polling sekitar 5 detik; push event khusus belum tersedia. |
| Hub WebSocket per jurusan/area | Driver/pax menerima data privat sesuai aktor, tetapi snapshot kendaraan publik belum memakai subscription room per jurusan/area; filter publik/admin dilakukan di frontend. |
| Endpoint REST rancangan tanpa `/api` dan beberapa parameter `/:id` | Endpoint aktual memakai prefix `/api`; sejumlah aksi memakai ID pada body. Contoh: `PATCH /api/admin/drivers/verify` dan `PATCH /api/admin/reports`. Lihat kontrak aktual sebelum memakai contoh PRD. |
| `trips`, `trip_legs`, dokumen kendaraan terpisah | MVP memakai `passenger_trips` satu angkot, `driver_documents`, assignment dan data kendaraan. Lifecycle trip multi-leg serta model dokumen kendaraan lanjutan belum tersedia. |
| `/admin/kendaraan`, `/admin/pesan` | Tidak dirutekan dalam demo; source prototipe bukan fitur operasional. |
| Detail laporan admin dengan pesan ke driver terkait | Tanggapan/timeline dan notifikasi reporter tersedia; pesan bebas ke driver masih ADM-07. |
| Riwayat dengan detail beberapa leg | Riwayat satu angkot tersedia; detail multi-leg menunggu PAX-09 dan model trip lanjutan. |

Bukti: [router](apps/web/src/app/router.tsx), [kontrak HTTP aktual](apps/api/api/openapi.json), [server HTTP/WS](apps/api/internal/httpapi/server.go), [client live](apps/web/src/features/tracking/live-store.ts), dan [skema](supabase/migrations/).

## 9. Tambahan MVP/demo yang sudah tersedia

Fitur berikut mendukung demo dan permintaan pengembangan lokal; tidak menambah jumlah ID requirement PRD di atas.

| Fitur | Kondisi implementasi |
|---|---|
| Supabase lokal | Konfigurasi CLI, migration, Auth, PostgreSQL/PostGIS, Storage dan email lokal tersedia. Docker hanya untuk Supabase; Go/Vite berjalan pada host. |
| Seeder dari mock frontend | Fixture diekspor, ID stabil, akun Auth nyata serta file contoh benar-benar tersimpan. Kendaraan awal offline; agregat/GPS aktif tidak diambil dari angka mock. |
| Workflow database | Delapan migration tersedia, generator tipe database dan command migrate/reset tersedia. Jumlah ini sesuai source pada tanggal peninjauan, bukan klaim database semua komputer sudah diperbarui. |
| Quick login tiga role | Akun demo login melalui Auth; role tetap berasal dari server. |
| HTTPS LAN | Generator CA/certificate, origin Auth serta proxy API/Auth/Storage/WSS satu origin tersedia. Trust CA dan firewall perangkat masih perlu disiapkan pengguna. |
| Simulator satu driver | Pilihan sumber GPS/simulasi, segmen, offset, kecepatan dan jeda; label/provenance serta guard lokal tersedia. |
| Simulator armada seed | `npm run demo:fleet` menggerakkan hingga 14 kendaraan seed, memakai sesi/backend nyata, melewati sesi manual dan membersihkan akun sementara. |
| Pengujian fleet | Dua browser, seluruh kendaraan bergerak, boarding idempotent, completion, riwayat, takeover manual serta cleanup normal/pemulihan proses paksa sudah memiliki bukti lokal. |
| Notifikasi laporan | Pesan, read state dan preferensi tanggapan laporan tersimpan; mematikan notifikasi tidak menghapus timeline. Ini notifikasi dalam aplikasi, belum push notification browser/OS. |
| Dokumentasi menjalankan proyek | [README](README.md) dan [SETUP lengkap](docs/setup/SETUP.md) tersedia. |

Sumber: [tool lokal](scripts/local.mjs), [seeder](scripts/seed-demo.mjs), [simulator fleet](scripts/demo-fleet.mjs), [verifikasi fleet](scripts/verify-fleet.mjs), dan [preferensi laporan](apps/web/src/features/preferences/report-preferences.tsx).

## 10. Rencana pekerjaan berikutnya

Urutan di bawah mempertahankan fokus MVP dan memisahkan penyelesaian kode dari penerimaan perangkat. Durasi/tanggal diputuskan ketika backlog dipilih; tidak ada pekerjaan deployment yang dijadwalkan otomatis.

| Tahap usulan | Cakupan | Kriteria selesai |
|---|---|---|
| **A — Penerimaan MVP pada dua Android** | CA/HTTPS, login/refresh, GPS asli, WSS, latensi, izin lokasi, jaringan putus-pulih, wake lock/latar belakang, alur penumpang dan admin | Hasil uji perangkat dan batas browser dicatat; alur utama diperagakan dan diterima Product Owner; target yang belum tercapai memiliki keputusan/perbaikan jelas. |
| **B — Tutup gap PRD yang sudah sebagian** | Dashboard driver/keputusan scope tip DRV-05, ranking kendaraan PAX-08, monitoring dokumen ADM-05, kesesuaian metode merayap BR-06 | Komponen yang dipilih memakai data nyata, memiliki keadaan kosong/error, dan memenuhi perilaku PRD. DRV-05 baru dianggap penuh jika tip tersedia atau PRD direvisi secara eksplisit. |
| **C — Pengiriman pesan admin** | ADM-07: composer, API, validasi penerima, otorisasi dan penyimpanan; integrasi inbox yang sudah tersedia | Pesan manual admin sampai ke driver yang benar, read state persisten, akun lain tidak dapat membaca/mengirim tanpa hak. Broadcast hanya ditambahkan bila disepakati. |
| **D — Transfer dan perjalanan multi-leg** | PAX-09 dan bagian 9 PRD: graph berarah, transfer 1–2 kali, penalti jalan kaki/tunggu, rekomendasi API, model leg, boarding/completion/histori lintas leg | Hasil transfer benar arah/chain, tidak menyambung jalur terputus, maksimal transfer sesuai PRD, seluruh leg tersimpan dan dapat dipulihkan. Helper lama perlu ditinjau sebelum digunakan kembali. |
| **E — P2 dan kualitas lanjutan** | Tip simulasi PAX-10 bila dipilih; analitik lengkap/heatmap, PWA dan audit aksesibilitas; subscription WS bila beban membutuhkannya | Story terpilih mempunyai kontrak/data/acceptance; prototipe tidak dipublikasikan sebagai fitur sampai terintegrasi. |

Ketergantungan: tip pada DRV-05 dan PAX-10 sebaiknya dirancang bersama. Ranking PAX-08 dan dokumen ADM-05 dapat dikerjakan terpisah. ADM-07 memakai inbox penerima yang sudah ada. Transfer memerlukan perluasan model perjalanan dan tidak cukup dengan mengaktifkan tampilan helper lama.

Heatmap permintaan, analitik lengkap, pengelolaan pengguna/suspend dan pengelolaan armada penuh masih backlog. Heatmap/analitik disebut sebagai P2 dalam ruang lingkup PRD, tetapi tidak memiliki ID tersendiri pada bagian 7; karena itu tidak dimasukkan ke tabel hitungan 33 ID.

## 11. Bukti verifikasi dan cara memperbarui roadmap

Bukti yang sudah tercatat:

- [Sprint 1](docs/sprint/SPRINT_1.md): Supabase lokal, seed, Auth/RBAC, Storage dan quick login.
- [Sprint 2](docs/sprint/SPRINT_2.md): trayek database/CRUD, dashboard dan statistik.
- [Sprint 3](docs/sprint/SPRINT_3.md): tracking, pencarian langsung, ETA dan simulator driver.
- [Sprint 4](docs/sprint/SPRINT_4.md): verifikasi/revisi, megat, boarding, completion, laporan serta ngetem.
- [Sprint 5](docs/sprint/SPRINT_5.md): audit runtime, scope demo, cache privat dan rehearsal.
- Artefak lokal `.local/sprint45-validation.json`, `.local/fleet-validation.json`, `.local/fleet-lifecycle-validation.json` dan `.local/fleet-cleanup-validation.json` mencatat hasil lokal. File di `.local/` diabaikan Git dan belum tentu tersedia setelah clone baru.

Suite tersedia melalui `npm run demo:verify`, `npm run demo:browser`, `npm run demo:verify:sprint2`, `npm run demo:browser:sprint2`, `npm run demo:verify:sprint3`, `npm run demo:browser:sprint3`, `npm run demo:rehearse`, `npm run demo:verify:fleet`, `npm run demo:performance` dan `npm run demo:audit`. Prasyarat/kondisi data masing-masing berbeda; ikuti [bagian pengujian SETUP](docs/setup/SETUP.md#pengujian) dan jangan menjalankan suite baseline ketika fleet/demo manual aktif.

Saat fitur berubah, perbarui status ID terkait, uraian gap, bukti dan tanggal peninjauan. Jika scope diperkecil, catat keputusan pada PRD; jangan mengubah status menjadi selesai hanya dengan menyembunyikan UI atau menghapus requirement dari tabel roadmap.

## Di luar cakupan PRD/MVP saat ini

PRD mengecualikan pemesanan angkot sebagai ride-hailing, pembayaran riil, aplikasi native Android/iOS serta prediksi machine learning. Redis bersifat alternatif untuk memori, bukan kekurangan wajib pada MVP satu proses. Deployment/cloud, Docker aplikasi dan pekerjaan operasional produksi belum menjadi target workflow yang diminta pengguna. Tip simulasi boleh menjadi fitur P2 tanpa berarti pembayaran riil ikut masuk scope.
