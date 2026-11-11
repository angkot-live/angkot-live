# Setup MVP lokal Angkot-Live

Setup MVP memakai **Docker hanya untuk Supabase lokal**. Frontend Vite dan API Go berjalan langsung di host. Tidak diperlukan proyek cloud atau pekerjaan deployment.

## Menjalankan pertama kali

Prasyarat: Node.js 24+, Go 1.24+, Docker yang sedang berjalan, dan OpenSSL untuk HTTPS. Supabase CLI dikunci di root package-lock; tidak perlu instal CLI global.

Dari root repository:

```bash
npm ci --include=dev
npm --prefix apps/web ci --include=dev
npm run local:start
npm run demo:seed
npm run local:status
```

Start pertama mengunduh image Supabase, lalu memasang semua migration. Auth, PostgREST, Storage, Studio dan Mailpit tersedia; realtime aplikasi memakai WebSocket Go. Start menulis `apps/api/.env`, `apps/web/.env.local` dan `.local/connection.json` yang diabaikan Git. Kunci service role hanya di environment backend/seeder; browser mendapat anon key.

Jalankan pada dua terminal di root:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Instalasi baru memakai http://localhost:5173 dan API internal http://127.0.0.1:8080. Studio: http://127.0.0.1:54323; email lokal: http://127.0.0.1:54324. Konfigurasi HTTPS/port yang sudah dibuat akan dipakai kembali dari `.local/settings.json`. Jangan menjalankan dua Vite pada port sama; `strictPort` memberi error bila port terpakai.

`npm run local:stop` menghentikan hanya stack Supabase proyek ini dan mempertahankan data. `npm run local:start` menjalankannya kembali; API/frontend dimulai terpisah. Restart API menutup sesi tugas lama dan menunggu GPS baru. MVP memakai satu proses API.

## Akun dan seed demo

Halaman `/login` menyediakan **Penumpang**, **Pengemudi**, **Admin**. Tombol memakai login password Supabase dan membaca `/api/me`; tidak mengganti role di browser. Akun:

| Role | Email |
|---|---|
| Penumpang | `penumpang@demo.angkot.local` |
| Pengemudi | `pengemudi@demo.angkot.local` |
| Admin | `admin@demo.angkot.local` |

Password lokal ketiganya: `AngkotDemo123!`. Selector hanya tersedia ketika `VITE_ENABLE_DEMO_LOGIN=true`, backend `ENABLE_DEMO_LOGIN=true`, dan URL Supabase backend adalah loopback. Mematikan salah satu flag menyembunyikan quick login; endpoint backend mengembalikan 404 ketika dinonaktifkan atau memakai Supabase nonlokal. Registrasi publik tetap menolak admin.

Fixture diekspor dari empat modul mock frontend lewat `npm run demo:export` ke `supabase/fixtures/mock-data.json`. Seeder menggunakan Auth Admin API untuk akun, PostgREST untuk relasi, dan Storage untuk PDF/gambar **CONTOH DEMO**, bukan insert auth.users/password hash buatan. UUID stabil dan upsert mencegah duplikasi. `.local/seed-manifest.json` mencatat mapping ID serta koreksi kode trayek, NIK sintetis, plat manual, timestamp, dan data P2 yang diabaikan. Akun non-demo tidak ditimpa.

Hasil baseline: 10 akun, 7 profil driver (1 approved, 4 pending, 1 rejected, 1 akun Auth ditangguhkan), 14 kendaraan offline, 82 arah/37 kode, 104 segmen, 172 terminal/halte, 29 dokumen privat, 4 trip selesai, 1 request dibatalkan, 7 laporan, 5 tanggapan, 11 pesan. Driver demo memakai **D 1000 AB**, arah **01A Abdul Muis → Cicaheum via Binong**. Tidak ada seed GPS/live location, tugas terbuka, atau request aktif. Angka dashboard publik dihitung terpisah oleh API; bukan agregat seed.

`npm run demo:seed` boleh diulang pada baseline demo. Jangan gunakan untuk mempertahankan perubahan manual akun demo; field fixture akan dikembalikan ke contoh. Untuk mengulang seluruh demo:

```bash
# Menghapus database lokal proyek ini, menerapkan migration, lalu seed kembali.
# Hentikan API/frontend terlebih dahulu jika sedang menjalankan skenario operasional.
npm run demo:reset
```

`supabase/seed.sql` sengaja tidak berisi akun atau data live. Provisioning membutuhkan Auth/Storage sehat sehingga dilakukan setelah start/reset. `apps/api/tests/bootstrap.sql` hanya untuk database tes terisolasi; jangan pasang pada stack Supabase.

## Simulasi seluruh armada demo

Dengan API dan frontend berjalan, buka satu terminal tambahan dari root proyek:

```bash
npm run demo:fleet
```

Perintah ini menggerakkan **14 kendaraan seeder** sekaligus, memakai ID/plat kendaraan dan trayek terkini dari database. Tidak perlu migrate, seed ulang, atau login manual 14 kali. Buka `/peta` sebagai publik, `/penumpang` sebagai penumpang, atau `/admin/monitoring` sebagai admin. Filter jurusan/radius tetap berlaku, sehingga jumlah marker yang terlihat bisa lebih kecil dari jumlah armada aktif.

Posisi dikirim setiap sekitar 3 detik lewat Supabase Auth, API duty dan WebSocket pengemudi yang nyata. Semua browser/HP melihat stream server yang sama. Label **SIMULASI** tetap tampil. Kendaraan mengikuti arah satu segmen pada satu waktu, berhenti 12 detik di ujung, kemudian memulai duty baru pada segmen berikutnya atau mengulang segmen. Segmen yang terputus tidak disambung menjadi garis/jalan buatan. Mode ini memungkinkan pengujian megat → boarding → perjalanan → selesai dengan kendaraan simulasi; GPS penumpang tetap mengikuti aturan lokasi/radius aplikasi.

Pengemudi utama memakai akun demo yang sudah ada jika offline. Untuk kendaraan seed yang belum memiliki pengemudi, command membuat akun Auth dan assignment **sementara khusus simulasi lokal**, tanpa membuat dokumen verifikasi palsu. Akun tersebut muncul selama simulasi dan dihapus ketika berhenti. Perjalanan yang dibuat pengguna tetap tersimpan dengan provenance `simulation`, kendaraan, tarif dan riwayatnya; referensi ke pengemudi sementara menjadi null setelah akun dihapus. Duty/snapshot simulasi pengemudi utama tetap menjadi riwayat simulasi, tidak menambah ringkasan GPS operasional.

Kendaraan yang sedang bertugas, sudah ditugaskan ke akun selain pengemudi demo, atau memiliki trayek nonaktif dilewati. Untuk mengambil alih kendaraan utama dari browser Pengemudi, pilih **Offline**, kemudian mulai sesi manual; simulator melepas kendaraan tersebut dan tidak mengambilnya kembali. Simulasi hanya menerima backend HTTP loopback dan Supabase lokal dengan flag demo aktif. Tidak ada perubahan skema/RLS atau role pengguna asli.

Hentikan dengan **Ctrl+C** di terminal simulator. Cleanup mengakhiri hanya sesi milik simulator dan menghapus akun sementara beserta telemetry/duty mereka; data seed, file, laporan dan perjalanan pengguna dipertahankan. Jangan menjalankan seed/reset atau suite baseline ketika armada sedang aktif. Jika proses sebelumnya dimatikan paksa, startup berikutnya membersihkan run lama terlebih dahulu. Untuk cleanup tanpa memulai armada:

```bash
npm run demo:fleet:cleanup
```

Command cleanup menolak berjalan selama proses simulator masih hidup. Mematikan API juga mengakhiri stream; jalankan ulang `demo:fleet` setelah API tersedia kembali.

Dengan armada aktif, `npm run demo:verify:fleet` memeriksa gerakan seluruh kendaraan pada API, stream dua browser (desktop/mobile), label simulasi, serta boarding ganda → completion → riwayat dengan penumpang uji sementara. Tes membersihkan transaksi/akun penumpangnya; tidak mematikan armada. Hasil ada di `.local/fleet-validation.json`, screenshot di `.local/fleet-mobile.png`. Ini pengujian browser lokal, belum membuktikan koneksi/GPS HP fisik.

## HTTPS dan perangkat kedua

Gunakan IP LAN komputer yang dapat dijangkau ponsel pada Wi-Fi yang sama. Contoh berikut memakai alamat contoh; ganti dengan IP komputer:

```bash
npm run local:cert -- --host 192.168.1.7 --port 5173
npm run local:stop
npm run local:start
```

Perintah cert membuat CA dan sertifikat server dengan SAN localhost/IP LAN; juga menyesuaikan redirect Auth. Start menulis ulang origin dan env. Restart API/frontend setelahnya. Vite meneruskan `/api` termasuk WSS serta `/supabase` ke layanan internal; browser ponsel tidak menghubungi localhost komputer secara langsung. Signed URL file privat memakai `/supabase/storage/v1/...` pada origin yang sama.

Salin **hanya** `.local/tls/ca.crt` ke perangkat demo, instal sebagai CA terpercaya sesuai pengaturan OS/browser, lalu buka `https://IP-LAN:PORT/login`. Private key `ca.key` dan `server.key` tetap di komputer. CA tidak diinstal otomatis ke trust store host. Pada ponsel, konfirmasi halaman bebas peringatan sertifikat, `window.isSecureContext` bernilai true, izin GPS muncul, ketiga login berfungsi, file privat terbuka, dan WebSocket tersambung. Firewall host harus mengizinkan port frontend yang dipilih.

Uji otomatis memverifikasi HTTPS dengan CA dan browser dengan `ignoreHTTPSErrors` terisolasi. Ini **belum menggantikan uji ponsel fisik/kepercayaan CA**. Jangan menganggap melewati peringatan sertifikat cukup untuk izin GPS pada semua browser.

## Verifikasi Sprint 1

Dengan API dan frontend berjalan:

```bash
npm run test:sprint1
npm run demo:verify
npm run demo:browser
npm --prefix apps/web test
npm --prefix apps/web run lint
npm --prefix apps/web run build
go -C apps/api test ./...
```

`demo:verify` mengulang seeder untuk memeriksa jumlah row, JWT/refresh/role, assignment offline, trip/laporan, signed PDF, RBAC dan penolakan anonim. Jalankan pada baseline demo; tes ini sengaja mengharapkan tidak ada kendaraan/tugas live. Browser test membaca origin `.local/settings.json`, memakai Auth/API/Storage/WSS asli tanpa intercept atau GPS buatan. Screenshot quick login disimpan di `.local/screenshots/quick-login.png`.

Tes SQL tambahan di-rollback seluruhnya:

```bash
docker exec -i supabase_db_angkot-live psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/mvp_foundation.sql
```

`npm run db:migrate` memasang migration lokal baru; `npm run db:types` meregenerasi `apps/web/src/types/database.generated.ts` dari database aktual. `database.types.ts` mengekspor alias kompatibel. Lihat [ERD](./erd.md), [audit skema](./SCHEMA_AUDIT_MVP.md), dan [bukti sprint](./SPRINT_1.md).

## Sprint 2: trayek dan dashboard

Masuk sebagai Admin, buka `/admin/trayek`, lalu pilih tambah/edit. Jalur, segmen, halte, status dan tarif tersimpan ke database dalam satu transaksi. Halaman publik/onboarding memperbarui katalog setiap 5 detik; API menginvalidasi cache setelah penyimpanan. Tidak diperlukan impor file atau restart API untuk perubahan admin. Nonaktif mengakhiri tugas dan request menunggu; geometri tidak dapat diubah selama trip aktif. Penghapusan trayek yang direferensikan ditolak; gunakan nonaktif untuk archive.

Dengan baseline demo dan API/frontend berjalan:

```bash
npm run db:migrate
npm run demo:verify:sprint2
npm run demo:browser:sprint2
docker exec -i supabase_db_angkot-live psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/route_management.sql
```

Uji membuat trayek sementara lalu membersihkannya. Gunakan [catatan Sprint 2](./SPRINT_2.md) untuk endpoint, perilaku konflik editor, bukti dan batas pengujian.

## Sprint 3: tracking dan pencarian P0

Pastikan baseline demo tidak memiliki duty terbuka. Dengan API/frontend berjalan:

```bash
npm run demo:verify:sprint3
npm run demo:browser:sprint3
docker exec -i supabase_db_angkot-live psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/tracking.sql
```

`demo:verify:sprint3` memakai duty sementara dan GPS fixture pada WebSocket nyata untuk menguji kepemilikan sesi, penolakan GPS buruk, replay, stale 15 detik, remove 30 detik, pemulihan, istirahat/offline, pencabutan approval, pending/rejected dan statistik bersama. `demo:browser:sprint3` membuka tiga context (pengemudi, penumpang, publik) dengan Auth/API/WSS nyata serta fixture geolocation. Keduanya membersihkan duty/posisi uji setelah selesai; jangan menjalankan saat ada sesi demo yang sedang dipakai.

Konstanta tracking: publish 3 detik, stale 15 detik, remove 30 detik, lease duty 60 detik, akurasi maksimum 50 meter, toleransi posisi 150 meter dari trayek. Duty yang kehilangan GPS ditutup dengan alasan `gps_timeout`. Satu tab/perangkat memiliki satu sesi tugas; tab lain harus memilih **Offline** sebelum mengambil alih.

Panel **Simulasi pengujian lokal** hanya muncul bila backend memakai Supabase loopback dan `ENABLE_DEMO_LOGIN=true`. Simulator mengikuti segmen trayek, diberi label pada peta/detail, dan tidak dihitung dalam ringkasan dashboard pengemudi. Simulator bukan bukti GPS lapangan. Jika backend memakai Supabase nonlokal, duty/GPS simulasi ditolak dan kontrol disembunyikan.

Bukti terakhir: ack 210 ms dan snapshot 831 ms pada stack lokal (target ≤3 detik), browser tiga role lulus tanpa page error, SQL tracking lulus dengan rollback. Uji ponsel fisik/trust CA, latensi seluler lapangan dan perilaku layar terkunci belum lulus otomatis; lihat [bukti Sprint 3](./SPRINT_3.md).

## Batas increment

Katalog trayek runtime, CRUD admin, dashboard admin, landing dan statistik publik kini memakai backend. Dataset file hanya dipakai seeder/importer eksplisit dan fixture tes. Pengelolaan pengguna/kendaraan, pesan admin lanjutan dan preferensi notifikasi masih backlog. Tracking dan pencarian P0 sudah tersedia dan diuji otomatis pada stack lokal; uji dua perangkat GPS asli, trust CA/GPS pada ponsel fisik, latensi lapangan dan layar terkunci tetap belum diverifikasi otomatis.

## Skenario dua perangkat

1. Penumpang mendaftar dengan email/telepon. Pengemudi membuat akun, mengisi identitas, plat, arah trayek, masa berlaku, dan mengunggah SIM/STNK/KIR/foto kendaraan.
2. Admin memeriksa berkas di `/admin/pengemudi`, membuka dokumen privat, lalu menyetujui atau menolak dengan alasan. Revisi berkas dapat diajukan ulang.
3. Driver terverifikasi membuka `/pengemudi`, memilih **Narik**, dan mengizinkan GPS. Pertahankan halaman terlihat. Peta hanya berisi kendaraan sendiri dan penumpang relevan.
4. Pada perangkat penumpang, buka peta, pilih jurusan/arah, lalu **Megat Angkot**. GPS perangkat menjadi posisi menunggu; titik custom hanya untuk perencanaan.
5. Di luar area rute, aplikasi memandu jalan kaki. Ketika GPS masuk radius 100 m dari rute, server mengaktifkan pencarian. Driver terverifikasi pada arah yang sama dan radius 2 km melihat penumpang di depannya.
6. Driver boleh merespons **Saya melihat penumpang**. Respons ini bukan reservasi. Setelah benar-benar naik, penumpang memilih **Saya naik [plat]** saat kendaraan berada dalam radius 100 m dengan GPS segar.
7. Marker menunggu hilang, trip aktif dapat dipulihkan setelah reload. Setelah turun, selesaikan trip dan periksa riwayat. Laporan dapat dibuat dari kendaraan trip atau plat manual, beserta bukti.
8. Admin mengubah status/tanggapan laporan. Penumpang melihat timeline dan notifikasi pada akun/perangkatnya.

Auto-ngetem memakai 90 detik sampel GPS valid dengan perpindahan <20 m, lalu prompt 15 detik. Jawaban tidak mengulang pengamatan; bergerak atau perubahan status membatalkan prompt. GPS hilang tidak dihitung sebagai diam. Mode narik dengan kecepatan <5 km/jam selama 30 detik ditampilkan merayap. Angka ini perlu kalibrasi lapangan.

GPS dikirim setiap 3 detik, stale setelah 15 detik dan dihapus dari peta setelah 30 detik. Istirahat/offline menghentikan pengiriman. Dua tab/perangkat tidak boleh mengirim untuk duty yang sama; gunakan Offline untuk mengakhiri sesi lama. Layar browser yang disembunyikan atau dikunci dapat menghentikan GPS; wake lock hanya membantu saat halaman terlihat.


## Sprint 3: tracking dan simulator lokal

Terapkan migration lalu restart API jika melanjutkan instalasi Sprint 2: `npm run db:migrate`, kemudian `npm run dev:api`. Buka `npm run dev:web` pada terminal terpisah. Jangan menjalankan seeder ketika tes duty sedang berlangsung.

Untuk pengujian tanpa bergerak, quick login Pengemudi → Peta Kerja → **Sumber posisi pengemudi → Simulasi pengujian lokal**, atur titik mulai/kecepatan, lalu **Narik**. Pilihan hanya tersedia pada demo Supabase loopback. Marker dan riwayat database berlabel simulasi; jarak simulasi tidak menambah ringkasan operasional driver. **Jeda simulasi** menguji stale/hilang, sedangkan Offline diperlukan sebelum beralih ke GPS perangkat. Gunakan Android kedua sebagai penumpang/publik pada arah assignment yang sama.

Jalankan `npm run demo:verify:sprint3` lalu `npm run demo:browser:sprint3` secara berurutan untuk Auth/API/WS dan browser nyata dengan input GPS terkontrol. Lihat [Sprint 3](./SPRINT_3.md) untuk batas waktu, provenance, hasil audit serta checklist dua Android. Tes otomatis/simulator tidak menggantikan verifikasi GPS asli, trust CA, dan wake lock perangkat fisik.

## Sprint 4–5: rehearsal lengkap

Setelah `npm run db:migrate`, restart API lalu jalankan `npm run demo:audit`, `npm run demo:rehearse`, dan `npm run demo:performance`. Suite rehearsal memakai akun/route sementara, tiga context browser serta Auth/API/Storage/WebSocket nyata. Default tiga iterasi dengan satu pemeriksaan ngetem 90+15 detik; `DEMO_NGETEM=false npm run demo:rehearse` melewati timer bila sudah diverifikasi. Data QA dibersihkan; jangan jalankan seeder atau edit source bersamaan dengan suite.

Gunakan [script demo](./demo-script.md) untuk presenter dan dua Android. Preferensi Status laporan sekarang benar-benar disimpan; notifikasi dimatikan hanya untuk tanggapan berikutnya, timeline tetap tersedia. Halaman admin prototipe pengguna/kendaraan/pengiriman pesan tidak dirutekan. Signed URL dibuat melalui API dan file privat tidak disimpan service worker. Jika proses QA terputus paksa, `npm run demo:cleanup:rehearsal` membersihkan namespace QA tanpa mereset akun contoh utama.
