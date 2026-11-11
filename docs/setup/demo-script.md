# Demo Angkot-Live — 5–7 menit

Gunakan tiga profil browser terpisah atau dua Android + satu browser admin. Pemisahan profil mencegah pergantian akun saling menimpa sesi. Semua langkah memakai Supabase lokal; tidak memerlukan deployment.

## Persiapan

```bash
npm run local:start
npm run db:migrate
# Hanya ketika sengaja mengembalikan akun contoh ke baseline, tanpa duty/trip aktif:
npm run demo:seed
# Dua terminal:
npm run dev:api
npm run dev:web
```

Buka alamat HTTPS yang dicetak Vite. Konfigurasi saat implementasi: `https://192.168.1.7:5180`. Percayai CA lokal pada Android sesuai [setup](./SETUP.md#https-dan-perangkat-kedua). Jangan bagikan private key CA/server. Setelah seed, 14 kendaraan terdaftar tetap offline; 0 marker sebelum duty dan posisi masuk adalah hasil yang benar.

Di `/login`, quick login Penumpang/Pengemudi/Admin memakai Auth nyata. Password contoh `AngkotDemo123!`. Driver utama adalah **D 1000 AB**, arah **01A Abdul Muis → Cicaheum via Binong**.

Untuk demonstrasi gerakan tanpa bepergian, pilih **Simulasi pengujian lokal** di sumber posisi pengemudi, atur titik mulai/kecepatan, lalu Narik. Marker jelas berlabel SIMULASI. Penumpang tetap memakai GPS perangkat untuk megat/boarding; pilih trayek/titik mulai di sekitar lokasi penumpang. Jika lokasi penguji jauh dari trayek, gunakan rehearsal browser otomatis untuk flow lengkap dengan koordinat terkontrol. Asal pencarian manual tidak dipakai sebagai GPS penumpang.

Untuk memperlihatkan seluruh armada seed bergerak sekaligus, jalankan **`npm run demo:fleet`** pada terminal tambahan. Command mempublikasikan 14 kendaraan melalui backend yang sama untuk semua perangkat; cukup buka `/peta`, Penumpang, atau monitoring Admin. Kendaraan yang sedang dikendalikan manual dilewati. Bila ingin mengendalikan D 1000 AB saat fleet aktif, pilih Offline di browser Pengemudi lalu mulai sesi Anda; simulator melepas kendaraan itu. `Ctrl+C` pada terminal fleet menghentikan sesi miliknya dan membersihkan akun sementara. Lihat [detail simulator armada](./SETUP.md#simulasi-seluruh-armada-demo). Hentikan fleet sebelum menjalankan suite rehearsal/baseline agar sesi pengujian tidak tumpang tindih.

Jalankan `npm run demo:rehearse` sebelum presentasi untuk tiga rehearsal otomatis; suite membuat akun/route/transaksi sementara dan membersihkannya. `npm run demo:performance` memeriksa rendering 50 marker browser-only. Jangan menjalankan seeder atau mengedit source ketika rehearsal berjalan.

## Jalur utama

| Waktu | Peran | Aksi dan hasil |
|---|---|---|
| 0:00–0:45 | Publik | Buka peta/daftar trayek, tunjukkan arah dan rekomendasi langsung. Jelaskan bahwa daftar kosong berarti belum ada posisi aktif |
| 0:45–1:30 | Driver | Quick login, buka Peta Kerja, pilih sumber yang sesuai dan Narik. Tunggu posisi diakui server, tunjukkan akurasi/kesegaran dan label simulasi bila dipakai |
| 1:30–2:15 | Penumpang | Pilih arah yang sama, izinkan lokasi, lihat detail pengemudi/plat dan ETA bila titik naik masih di depan kendaraan. Pencarian custom tidak membuat GPS palsu |
| 2:15–3:15 | Penumpang/driver | Megat. Bila di luar radius naik, status walking; setelah mencapai trayek berubah searching. Driver melihat penumpang yang sesuai arah/radius dan dapat merespons. Respons tidak memesan kursi dan tidak wajib untuk boarding |
| 3:15–4:00 | Penumpang | Konfirmasi naik saat dekat kendaraan. Marker menunggu hilang, halaman trip aktif muncul. Reload membuktikan restore, lalu konfirmasi turun dan buka riwayat |
| 4:00–5:00 | Penumpang | Buat laporan dari kendaraan perjalanan, unggah bukti, kirim dan catat kode tiket |
| 5:00–6:00 | Admin | Buka laporan, simpan diproses + tanggapan; penumpang melihat timeline/notifikasi. Ubah selesai + tanggapan. Buka bukti privat |
| 6:00–7:00 | Driver/admin | Driver Offline; marker hilang. Tunjukkan dashboard/antrean/statistik dari data DB, serta preferensi notifikasi tersimpan setelah reload |

## Skenario tambahan di luar durasi utama

- **Verifikasi:** login pengemudi pending `app-1@demo.angkot.local` atau rejected `app-5@demo.angkot.local`, password contoh sama. Admin membuka berkas dan reject dengan alasan, driver merevisi, lalu admin approve. Empat berkas wajib: SIM, STNK, KIR dan foto kendaraan; hanya revisi aktif menjadi acuan. Setelah mengubah akun contoh, seed ulang hanya bila ingin memulihkan baseline.
- **Ngetem:** kecepatan simulator 0, pertahankan halaman bertugas. Setelah 90 detik muncul prompt. Ya mengubah ngetem, Tidak mereset observasi, tanpa respons selama 15 detik mengubah ngetem. GPS putus tidak dihitung sebagai diam.
- **Jaringan/GPS:** jeda simulator tanpa mengubah mode. Sampel >15 detik stale, >30 detik marker dihapus, >60 detik duty berakhir. Sebelum 60 detik, lanjutkan untuk memulihkan posisi. Istirahat/Offline menghilangkan marker pada snapshot berikutnya.
- **Izin lokasi:** tolak lokasi penumpang. Aplikasi menampilkan error dan tidak mengganti GPS dengan asal pencarian. Izinkan lagi lalu coba ulang.
- **Notifikasi:** matikan Status laporan dan simpan. Setelah reload tetap mati. Tanggapan baru masih ada pada timeline, tetapi tidak membuat notifikasi baru. Pesan historis tidak dihapus.
- **Duplikasi/privasi:** boarding ganda tidak membuat dua trip; akun lain tidak dapat melihat laporan atau membuka bukti privat. Role pending/rejected tidak dapat bertugas.

## Checklist dua Android yang belum diverifikasi otomatis

Catat model/versi Android/browser, waktu, sumber posisi dan kondisi jaringan. Periksa trust CA/WSS, geolokasi asli dan akurasinya, marker pada perangkat penumpang, interval publish 3–5 detik, latensi update target ≤3 detik, penguncian layar/wake lock, background serta putus/pulih Wi-Fi. Ukur waktu buka peta pada 4G terpisah dari benchmark lokal; bila tidak tercapai, catat hasil dan penyebab yang terlihat.

Simulator membantu uji gerakan tanpa berlari, sedangkan suite browser menguji seluruh alur dengan GPS terkontrol. Keduanya tidak dianggap bukti akurasi GPS ponsel atau penerimaan Product Owner.

## Setelah demo

Driver Offline, selesaikan/batalkan trip/request, lalu logout. `demo:rehearse` membersihkan data QA sendiri. Jika suite terputus paksa, jalankan `npm run demo:cleanup:rehearsal` untuk namespace QA. `demo:seed` mengembalikan field akun contoh ke fixture; `demo:reset` menghapus seluruh database lokal proyek dan hanya dipakai bila memang ingin reset penuh. Jangan reset sewaktu ada skenario operasional yang ingin dipertahankan.
