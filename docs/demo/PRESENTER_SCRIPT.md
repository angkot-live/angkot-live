# Naskah presenter — sembilan menit

Latih dengan [operasional dua role](PASSENGER_DRIVER_DEMO.md). Tampilkan profil P dan D berdampingan. Sebelum timer dimulai, masuk sebagai P dan D, selesaikan izin browser, geolocation terkontrol dan pilihan simulator. Kendaraan tetap Offline sampai giliran Narik. Ini demonstrasi lokal dengan lokasi emulasi, bukan bukti penerimaan Android.

> **Mode darurat tanpa Docker/Supabase:** `npm run demo:offline` membuka dua jendela yang sudah login dan siap diklik, dengan API/WS tiruan dan label **DEMO FIXTURE**. Urutan klik sama dengan tabel di bawah. Buka dengan kalimat: “Karena infrastruktur lokal tidak tersedia di mesin presentasi, alur ini dijalankan pada harness fixture; arsitektur dan pengujian nyatanya kami tunjukkan terpisah.” Jangan menyebutnya backend nyata.

| Waktu | Layar dan aksi | Narasi presenter | Hasil yang diperiksa |
|---|---|---|---|
| 00:00–00:50 | Landing pada P; hero dan preview | “Angkot Live membantu warga memahami jurusan dan posisi angkot. Masalahnya sederhana: sulit memilih angkot dan tidak tahu apakah kendaraan sedang beroperasi. Kami menyatukan informasi itu dalam peta publik.” | Landing terbuka; bila kendaraan belum aktif, nyatakan kondisi kosong apa adanya |
| 00:50–01:30 | Gulir statistik, alur dua role dan FAQ | “Peta dapat dibuka tanpa akun. Statistik berasal dari API, bukan angka pemasaran. Kendaraan pengujian dibedakan dari GPS perangkat. Ini platform informasi angkutan publik; respons pengemudi bukan pemesanan kursi.” | Label sumber dan batas layanan terbaca |
| 01:30–02:20 | Lihat Peta Live; cari asal/tujuan; pilih arah utama demo | “Rekomendasi memakai jurusan langsung dan arah perjalanan. Jalur yang terputus tidak disambungkan sebagai jalan yang bisa dilalui. Estimasi tiba hanya muncul jika lokasi dan arah mendukung.” | Katalog dan arah sesuai; jangan menjanjikan transfer multiangkot |
| 02:20–03:20 | Tunjukkan D yang sudah login; verifikasi assignment dan sumber posisi; tekan Narik | “Pengemudi harus disetujui admin dan memiliki kendaraan serta trayek tugas. Untuk presentasi, kami memakai simulator lokal berlabel. Data tetap melalui sesi pengemudi, WebSocket, engine Go dan validasi yang sama.” | Simulasi aktif; acknowledgment server; marker pada P |
| 03:20–04:20 | P login penumpang; pilih arah; Megat Angkot | “Megat memberi tanda bahwa penumpang menunggu. Lokasi penumpang demo dikontrol lewat browser. Simulator kendaraan tidak memindahkan lokasi penumpang. Server menentukan apakah penumpang masih harus berjalan atau sudah berada dekat jalur.” | searching pada P; request muncul pada D |
| 04:20–05:00 | D pilih Saya melihat penumpang | “Pengemudi melihat sinyal yang relevan terhadap arah, jalur dan lokasi. Respons ini hanya memberi tahu bahwa penumpang terlihat; tidak menjamin penjemputan.” | P melihat accepted/indikasi respons |
| 05:00–06:00 | P pilih Saya naik; buka perjalanan; reload | “Konfirmasi naik memeriksa kedekatan kendaraan, kesegaran GPS dan segmen trayek di server. Retry tidak membuat dua trip. Perjalanan disimpan di database sehingga pulih setelah halaman dimuat ulang.” | Satu trip aktif; reload memulihkan trip |
| 06:00–07:00 | Bila diperlukan D naikkan kecepatan simulasi; P selesaikan trip lalu riwayat | “Perjalanan simulasi tetap diberi label. Setelah turun, penumpang menyelesaikan trip. Riwayat dibaca dari backend, termasuk jarak dan tarif yang tercatat.” | Completion dan riwayat tampil; tidak mengklaim hasil gerak bila kendaraan diam |
| 07:00–08:00 | D pilih Offline; P lihat marker hilang; buka statistik atau laporan | “Saat pengemudi berhenti bertugas, kendaraan keluar dari peta aktif. Penumpang juga dapat melaporkan masalah dan mengikuti tanggapan admin. Transparansi mencakup status armada dan tindak lanjut layanan.” | Duty offline; kendaraan hilang; statistik aktual |
| 08:00–09:00 | Landing/diagram sistem | “Frontend React berkomunikasi dengan API Go, Supabase Auth dan PostgreSQL/PostGIS. Otorisasi tidak berhenti di tombol UI. Kami sudah menyiapkan pengujian otomatis dan skrip rehearsal berulang; hasil aktual dan batasnya kami catat terbuka. Pengujian perangkat Android dan jaringan lapangan masih perlu penerimaan tersendiri.” | Sampaikan hasil pengujian terbaru dari TEST_RESULTS, bukan asumsi |

Penutup: “Angkot Live membuat informasi angkutan kota lebih mudah dipahami: kenali trayeknya, pantau angkotnya, dan gunakan informasi layanan untuk perjalanan yang lebih siap.”

## Kalimat fallback

- Tile peta gagal: “Penyedia peta dasar sedang tidak tersedia. Informasi trayek dan kendaraan tetap berasal dari sistem kami; kami lanjutkan melalui daftar dan status perjalanan.” Hanya katakan data masih tersedia setelah memeriksa respons backend.
- Geocoding gagal: “Pencarian nama tempat bergantung layanan eksternal. Untuk demo terkontrol, kami menggunakan titik trayek yang sudah disiapkan.”
- GPS/koneksi gagal: “Sistem tidak menampilkan lokasi lama sebagai posisi segar. Kami periksa koneksi dan izin sebelum melanjutkan konfirmasi naik.”
- Boarding ditolak: “Validator kedekatan menolak kondisi ini. Kami kembalikan lokasi browser dan titik awal simulator ke jalur yang sama.”
- Layanan tidak pulih dalam waktu presentasi: tampilkan diagram dan bukti pengujian yang sudah tercatat, lalu nyatakan bahwa alur live belum dapat diselesaikan. Jangan menampilkan fixture sebagai hasil integrasi nyata.
