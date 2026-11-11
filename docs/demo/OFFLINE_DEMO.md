# Demo kilat tanpa Docker/Supabase (fixture)

Dipakai saat waktu sangat terbatas dan Docker/Supabase tidak tersedia. Demo ini **tidak** membuktikan Auth, PostgreSQL/PostGIS, WebSocket Go, atau GPS perangkat. Semua respons API dan snapshot realtime ditiru oleh skrip; setiap halaman menampilkan label **DEMO FIXTURE — data simulasi, bukan backend nyata**. Jangan menyebutnya sebagai backend nyata saat presentasi.

## Satu perintah

Dari root proyek:

```bash
npm run demo:offline
```

Yang terjadi:

1. Vite dijalankan pada `http://127.0.0.1:5188` (port lain otomatis dicari bila terpakai) dengan Supabase tiruan.
2. Dua jendela Chromium terbuka: **PENUMPANG** (1280×800) dan **PENGEMUDI** (430×900).
3. Keduanya sudah login, sumber posisi pengemudi sudah **Simulasi pengujian lokal**, kecepatan `0`, titik mulai `0%`.
4. Terminal mencetak urutan klik.

Tidak perlu `npm run local:start`, `npm run dev:api`, `npm run dev:web`, atau Supabase.

## Urutan klik saat presentasi

| # | Jendela | Tindakan | Yang terlihat |
|---|---|---|---|
| 1 | PENGEMUDI | tekan **Narik** | `Simulasi aktif`, kendaraan `D 1000 AB` di peta |
| 2 | PENUMPANG | tekan **Megat Angkot** | `Mencari pengemudi`, titik penumpang di trayek |
| 3 | PENGEMUDI | tekan **Saya melihat penumpang** | `Penumpang menunggu (1)` → `Anda sudah merespons` |
| 4 | PENUMPANG | tekan **Saya naik D 1000 AB** | halaman **Perjalanan aktif** |
| 5 | PENUMPANG | reload halaman | perjalanan tetap tampil (dipulihkan dari fixture) |
| 6 | PENUMPANG | tekan **Saya sudah turun — selesai**, lalu **Lihat riwayat** | **Perjalanan selesai**, riwayat berisi 1 trip |
| 7 | PENGEMUDI | tekan **Offline** | `GPS tidak dibagikan`, kendaraan hilang dari peta |

Boleh juga mendemokan halaman publik lebih dulu: buka `http://127.0.0.1:5188/` atau `/peta` di jendela penumpang.

## Jika jendela tidak muncul

```bash
DEMO_HEADLESS=1 npm run demo:offline
```

Mode ini tetap menjalankan dua konteks tetapi tanpa jendela; gunakan hanya untuk memastikan skrip berjalan. Untuk presentasi tetap butuh jendela terlihat.

Port lain: `DEMO_PORT=5200 npm run demo:offline`.

Cek cepat tanpa interaksi (tidak membuka jendela, keluar sendiri):

```bash
DEMO_SMOKE=1 npm run demo:offline
```

Cocok untuk memastikan skrip sehat 2 menit sebelum tampil.

## Batasan yang harus disebut jujur

- Login tidak melewati Supabase Auth; token hanya fixture berformat JWT valid.
- Data tidak tersimpan di database. Restart skrip mengosongkan riwayat.
- WebSocket ditiru di sisi browser; tidak ada proses Go.
- GPS penumpang berasal dari emulasi Playwright, bukan sensor perangkat.
- Tidak ada validasi server untuk boarding, radius, atau freshness.
- Durasi Megat diperpanjang otomatis oleh fixture agar presentasi tidak terputus.

Untuk bukti integrasi nyata, tetap jalankan stack penuh sesuai [INSTALLATION_AND_SETUP.md](INSTALLATION_AND_SETUP.md) lalu [PASSENGER_DRIVER_DEMO.md](PASSENGER_DRIVER_DEMO.md).

## Jika ada yang gagal saat presentasi

| Gejala | Tindakan cepat |
|---|---|
| `Cannot find package 'playwright'` | `npm --prefix apps/web ci --include=dev` lalu ulangi |
| Browser tidak mau terbuka (tanpa display) | `DEMO_HEADLESS=1 npm run demo:offline` lalu pindah ke slide/screenshot |
| Port 5188 dipakai | `DEMO_PORT=5200 npm run demo:offline` |
| Kedua jendela muncul sebagai tab | Tarik salah satu tab ke luar jendela agar bisa ditampilkan berdampingan |
| Tombol Narik/Megat tidak aktif | Tunggu 3 detik; status harus `Realtime tersambung`. Jika tetap, Ctrl+C dan jalankan ulang |
| Skrip berhenti dengan error | Ctrl+C, jalankan ulang; state kembali bersih. Bila masih gagal, tampilkan screenshot fixture yang tersimpan di `/tmp/opencode/angkot-demo/` (jika masih ada) atau slide arsitektur, lalu lanjutkan narasi |

Semua langkah di atas tetap harus disampaikan sebagai **demo fixture**, bukan integrasi nyata.

## Menghentikan

Tekan `Ctrl+C` di terminal demo. Kedua jendela dan server Vite ditutup otomatis.
