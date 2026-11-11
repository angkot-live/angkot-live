# Masalah dan recovery

Utamakan pemulihan melalui UI. Jangan menjalankan seed/reset saat presentasi. Semua perintah dari root.

| Gejala | Penyebab yang perlu diperiksa | Recovery |
|---|---|---|
| Docker/Supabase tidak tersedia | Docker belum dipasang/aktif | Aktifkan Docker, jalankan local:start, db:migrate bila perlu, lalu preflight. Tidak dapat membuktikan integrasi DB tanpa stack ini |
| Environment hilang | .local/connection.json atau .env lokal tidak ada | Jalankan local:start atau local:env saat Supabase aktif; restart API/web |
| Preflight HTTPS gagal TLS | Node belum mempercayai CA lokal | Jalankan `NODE_EXTRA_CA_CERTS=.local/tls/ca.crt npm run demo:preflight`; jangan mematikan verifikasi TLS |
| Kedua jendela menjadi role sama | Dua tab berbagi localStorage Auth | Gunakan profil terpisah; login ulang dengan akun berbeda |
| Marker tidak muncul | Driver Offline, salah filter/arah, GPS gagal atau stale | Periksa assignment, sumber posisi, Narik, acknowledgment dan filter. Simulasi lokal harus berlabel |
| GPS ditolak | Izin lokasi, HTTPS/CA, akurasi buruk atau timestamp | Izinkan lokasi pada origin benar, gunakan HTTPS LAN yang dipercaya; biarkan tab terlihat. Pilih Offline sebelum mengulang bila perlu |
| Megat masih walking | GPS penumpang jauh dari jalur | Berjalan mendekat pada perangkat nyata; pada demo desktop perbaiki Sensors ke titik kanonis. Jangan memakai asal pencarian sebagai pengganti GPS |
| D tidak melihat Megat | Arah/chain salah, lokasi jauh, stale, cancelled/expired atau driver tidak bertugas | Samakan route, arah dan segmen; cek freshness dan status request. Buat Megat baru setelah expired; jangan melemahkan pencocokan |
| Saya naik ditolak | Kendaraan di luar sekitar 100 m, GPS stale atau segmen berbeda | Pastikan kedua titik dekat. Offline D, set awal 0% dan speed 0; perbarui Sensors P ke awal segmen; mulai Narik dan request baru bila diperlukan |
| Perjalanan sudah aktif | Demo sebelumnya belum diselesaikan | Buka /penumpang/perjalanan, reload bila perlu, selesaikan trip sebelum membuat request baru |
| Sesi driver konflik | Tab/perangkat lain memiliki duty | Pilih Offline untuk mengakhiri sesi itu, lalu mulai dari satu tab. Fleet melewati kendaraan manual; jangan menjalankan keduanya saat baseline |
| Realtime terputus | WS, proxy atau jaringan | Tunggu reconnect. Periksa preflight dan origin. Bila perlu reload halaman setelah layanan pulih; perjalanan tersimpan tetap dapat dipulihkan |
| API direstart, seluruh kendaraan Offline | Reset runtime tracker satu proses saat startup | Driver mulai Narik kembali. Jangan restart backend sebagai recovery pertama; startup mengakhiri duty semua kendaraan |
| Tile peta kosong | OpenStreetMap/jaringan eksternal gagal | Pertahankan informasi status/daftar yang masih tersedia, gunakan preview SVG landing untuk konteks jaringan trayek; jangan mengklaim tile lokal/offline |
| Geocoding/routing gagal | Layanan eksternal tidak tersedia | Gunakan koordinat atau titik trayek yang sudah disiapkan. Nyatakan jalur jalan kaki belum tersedia; jangan menggambar fallback seolah rute nyata |
| Statistik gagal | API belum dapat dijangkau | Gunakan Muat ulang statistik setelah preflight; data lama dapat tetap tampil dengan peringatan |
| Rehearsal putus paksa | Akun/berkas sementara belum dibersihkan | Pastikan proses berhenti, lalu demo:cleanup:rehearsal. Jangan jalankan cleanup ketika rehearsal lain aktif |
| Fleet putus paksa | Manifest dan sesi sementara tertinggal | Pastikan proses fleet mati, lalu demo:fleet:cleanup |
| Android berhenti mengirim saat layar terkunci | Kebijakan browser/OS, wake lock tidak tersedia | Jaga layar menyala dan halaman terlihat; dokumentasikan batas perangkat. PWA bukan aplikasi native dengan jaminan GPS background |

Recovery manual yang aman: selesaikan trip, batalkan Megat tersisa, Offline driver, perbaiki GPS, mulai lagi. Pertahankan riwayat. `demo:reset` hanya untuk reset lokal yang disengaja dan dipahami konsekuensinya, bukan langkah recovery rutin.

Gap produk yang tetap berlaku: transfer multiangkot, tip, composer pesan bebas admin, sebagian monitoring dokumen dan analitik. Detail [roadmap](../ROADMAP.md).
