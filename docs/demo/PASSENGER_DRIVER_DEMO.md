# Operasional demo penumpang–pengemudi

> Bila Docker/Supabase tidak tersedia dan waktu tersisa sedikit, gunakan [demo kilat fixture](OFFLINE_DEMO.md): `npm run demo:offline` membuka dua jendela siap klik dengan label DEMO FIXTURE. Dokumen ini berlaku untuk stack nyata.

## Persiapan

Selesaikan [setup](INSTALLATION_AND_SETUP.md). Jalankan `npm run demo:preflight`. Hentikan `demo:fleet` dengan Ctrl+C sebelum memakai kendaraan manual atau rehearsal baseline.

Tata dua jendela berdampingan: profil P untuk penumpang dan profil D untuk pengemudi. Jendela biasa dalam satu profil berbagi sesi; gunakan profil browser berbeda atau satu profil biasa dan satu incognito. Buka landing `/` pada profil P, lalu peta `/peta` untuk awal presentasi.

Untuk demo lokal yang deterministik, GPS penumpang dikontrol pada browser. Ini tetap melewati Auth dan validasi server; bukan GPS Android asli. Pengaturan ini tidak tersedia sebagai tombol aplikasi.

## Lokasi terkontrol tanpa mengubah kode produksi

```bash
npm run demo:coordinates
```

Script membaca fixture kendaraan seed utama dan geometri trayek kanonis. Pada dataset saat penulisan: kendaraan `D 1000 AB`, arah `01A · Abdul Muis → Cicaheum via Binong`, route ID `3415464`, segmen 0, latitude `-6.927643`, longitude `107.605832`. Gunakan output terbaru bila dataset berubah. Jika admin mengedit geometri database, samakan kembali dengan katalog aktual sebelum demo; output file tidak membuktikan geometri database sama.

Pada Chrome desktop profil P: buka DevTools, pilih More tools → Sensors, lalu Location → Other. Masukkan latitude/longitude output script dan akurasi 10 meter jika tersedia. Izinkan lokasi pada origin aplikasi. Pertahankan DevTools terbuka selama emulasi. Pastikan lokasi di peta sesuai. GPS penumpang tidak ikut bergerak ketika simulator kendaraan berjalan.

## Urutan klik

| Langkah | Tindakan dan hasil yang diharapkan | Kontrak/backend |
|---|---|---|
| 1 | P membuka landing, Lihat Peta Live, lalu Cari Trayek; kolom tujuan langsung fokus, lalu pilih arah yang sesuai | GET /api/routes, /api/search/route; katalog nyata |
| 2 | D login akun pengemudi seed; P login akun penumpang seed pada profil berbeda | Supabase Auth dan GET /api/me; role server |
| 3 | D di /pengemudi memeriksa plat, arah, verifikasi dan koneksi | GET /api/driver/assignment; snapshot duty |
| 4 | Bila ada sesi aktif, pilih Offline terlebih dahulu. Pilih Sumber posisi pengemudi: Simulasi pengujian lokal | Simulator hanya ditawarkan jika /api/tracking/config mengizinkan |
| 5 | Atur Titik mulai simulasi 0%, segmen pertama bila pemilih tersedia, Kecepatan simulasi 0 | Koordinat awal sama dengan output script |
| 6 | D pilih Narik; tunggu Simulasi aktif dan pengakuan server | POST /api/driver/duty; WS driver:position; sumber simulation |
| 7 | P di /penumpang pilih Arah jurusan megat yang sama, lalu Megat Angkot | GPS browser dikirim; request menjadi searching jika dekat jalur |
| 8 | D melihat Penumpang menunggu dan pilih Saya melihat penumpang | POST /api/driver/requests/respond; status accepted |
| 9 | P membaca respons, memastikan kendaraan dekat, lalu pilih Saya naik D 1000 AB | POST /api/passenger/trips; route, chain, freshness dan jarak diperiksa |
| 10 | P melihat /penumpang/perjalanan. Reload sekali; perjalanan pulih | Snapshot memuat trip aktif dari database |
| 11 | Bila ingin memperagakan gerak, D ubah Kecepatan simulasi menjadi 15; P tetap di titik browser awal | Sampel simulasi memakai jalur aktual; tidak mengubah GPS P |
| 12 | P pilih Saya sudah turun — selesai, lalu Lihat riwayat | POST /api/passenger/trips/complete; riwayat GET /api/passenger/trips |
| 13 | D pilih Offline; kendaraan hilang dari peta aktif | Duty ditutup dan snapshot berhenti menampilkan kendaraan |

Kecepatan 0 membuat boarding dapat diulang. Untuk narasi kendaraan mendekat, mulai pada offset lebih awal dari titik penumpang yang dipilih dari geometri, lalu kembali ke skenario statis jika waktu terbatas. Jangan mengarang posisi mendekat pada skenario statis.

Boarding mensyaratkan kendaraan berjarak paling jauh sekitar 100 meter, GPS segar, route dan chain yang sesuai. Jangan mengubah validator bila boarding ditolak. Gunakan [recovery](KNOWN_ISSUES_AND_RECOVERY.md). Retry boarding menggunakan idempotency server; perjalanan aktif tidak boleh digandakan.

Megat memiliki status walking, searching, accepted, boarded, cancelled dan expired. Walking berarti masih harus mendekati jalur; sinyal belum muncul sebagai penumpang siap naik. Durasi aktif ditampilkan oleh UI berdasarkan expiry server. Respons driver bukan reservasi kursi atau jaminan jemput. Pengemudi tidak wajib merespons sebelum penumpang dapat naik.

## Rehearsal otomatis

```bash
npm run demo:preflight
npm run demo:rehearse
```

Suite existing memakai akun sementara dan konteks Playwright terpisah, geolocation penumpang, onboarding, persetujuan, simulasi, walking/searching, respons, boarding ganda, reload, completion dan laporan. Default tiga iterasi; beberapa skenario memakai driver respons dan satu tanpa respons. Suite membuat trayek pengujian tersendiri dan membersihkan fixture; jangan jalankan paralel dengan fleet atau demo manual.

Jika terputus paksa, pastikan proses rehearsal benar-benar berhenti, lalu jalankan `npm run demo:cleanup:rehearsal`. Perintah ini menghapus akun/berkas fixture rehearsal berpola `s45-*`, bukan akun utama. Periksa source dan jangan jalankan saat rehearsal lain aktif.

## Mengulang demo manual

Selesaikan perjalanan aktif terlebih dahulu, batalkan Megat yang tertinggal, lalu Offline pada driver. Kembalikan offset simulasi 0%, kecepatan 0, dan Sensors ke koordinat output script. Mulai Narik kembali. Riwayat demo manual tetap tersimpan dan berlabel simulasi; tidak perlu menghapus perjalanan.

Setelah demo, kembalikan Sensors ke No override agar browser memakai lokasi perangkat normal. Hentikan layanan mengikuti [setup](INSTALLATION_AND_SETUP.md).
