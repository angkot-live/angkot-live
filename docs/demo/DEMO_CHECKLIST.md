# Checklist kompetisi

## Sebelum hari demo

- [ ] Anggota tim lain berhasil mengikuti INSTALLATION_AND_SETUP dari clone baru.
- [ ] Node 24+, Go 1.24+, Docker dan OpenSSL tersedia; Chromium terpasang.
- [ ] Migration dan seed lokal selesai; tiga akun dapat login.
- [ ] Jalankan unit, build, Go vet/race dan `npm run demo:rehearse`; baca hasilnya.
- [ ] Uji dua Android: CA dipercaya, izin GPS, WSS, refresh login, wake lock, jaringan putus/pulih dan layar terkunci.
- [ ] Catat model perangkat, OS, browser, waktu dan hasil; jangan menyamakan emulasi dengan Android.
- [ ] Siapkan koordinat kanonis melalui `npm run demo:coordinates`.
- [ ] Latih naskah sembilan menit dan fallback tile/geocoding.

## Tiga puluh menit sebelum presentasi

- [ ] Tentukan mode: stack nyata (`npm run local:start`, `dev:api`, `dev:web`) atau darurat fixture (`npm run demo:offline`).
- [ ] Supabase, API dan web aktif; `npm run demo:preflight` lulus. (Lewati bila memakai `demo:offline`.)
- [ ] Fleet sudah berhenti; tidak ada rehearsal lain berjalan.
- [ ] Akun demo tetap terpisah pada profil P dan D.
- [ ] Tidak ada trip aktif/Megat lama pada penumpang; driver Offline.
- [ ] D memiliki assignment, akun disetujui dan sumber Simulasi pengujian lokal tersedia.
- [ ] P memakai Sensors terkontrol sesuai route/segmen; izin lokasi aktif.
- [ ] Pilihan driver: titik awal 0%, kecepatan 0 untuk boarding deterministik.
- [ ] Jaringan internet dan tile/geocoding tersedia; siapkan skenario koordinat bila geocoding gagal.
- [ ] Tidak ada terminal, tab atau screenshot yang menampilkan secret.

## Lima menit sebelum presentasi

- [ ] Landing terbuka pada P; D siap di Peta kerja.
- [ ] Zoom browser dan ukuran dua jendela nyaman dibaca.
- [ ] Koneksi realtime terbaca dan waktu sistem perangkat benar.
- [ ] Notifikasi OS tidak mengganggu; perangkat terisi daya.
- [ ] Tidak menjalankan migrasi, seed, build atau restart API selama presentasi.

## Selama presentasi

- [ ] Jelaskan label SIMULASI dan lokasi browser emulasi.
- [ ] Pilih arah jurusan yang sama pada dua role.
- [ ] Tunggu acknowledgment sebelum mengklaim lokasi terbit.
- [ ] Respons Megat sebagai sinyal terlihat, bukan jaminan jemput.
- [ ] Boarding hanya saat dekat; reload membuktikan pemulihan trip.
- [ ] Selesaikan perjalanan dan tampilkan riwayat.
- [ ] Pilih Offline dan cek kendaraan hilang.
- [ ] Gunakan fallback bila jaringan bermasalah; ungkap batas pengujian.

## Setelah presentasi

- [ ] Tidak ada trip aktif atau request tertinggal.
- [ ] Driver Offline; fleet/rehearsal berhenti dan cleanup selesai.
- [ ] Kembalikan Sensors ke No override.
- [ ] Logout akun pada perangkat bersama.
- [ ] Hentikan web/API dan jalankan `npm run local:stop` bila selesai.
- [ ] Catat hasil, gangguan dan perubahan langkah; jangan reset database untuk menghapus riwayat demo.
