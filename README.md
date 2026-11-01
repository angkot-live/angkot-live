# Angkot-Live

Platform pelacakan angkot realtime dan transparansi layanan transportasi publik.

Angkot-Live adalah aplikasi web (PWA) yang menampilkan posisi angkot secara realtime di peta, membantu penumpang menemukan angkot dan jurusan yang tepat, serta memberi pengemudi dan instansi alat untuk memantau dan mempertanggungjawabkan kualitas layanan. Aplikasi ini bukan ride-hailing, fokusnya pada informasi keberadaan angkot dan transparansi layanan publik.

**Event:** Multimedia In Action (MIA) 2026, Web In Action (WIA)
**Subtema:** Public Service Tracking
**Tim:** unjuk kebolehan
**Tahap:** First Draft Submission

---

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React + Vite (SPA/PWA), Leaflet / MapLibre |
| Backend | Go + Fiber (modular monolith) |
| Realtime | WebSocket (hub per jurusan) |
| Database | Supabase (PostgreSQL + PostGIS), Supabase Auth + RLS |

---

## Fitur Utama

- **Penumpang:** peta angkot realtime, status angkot (`ngetem` / `jalan` / `merayap`), rekomendasi jurusan, megat angkot, hotline pelaporan.
- **Pengemudi:** kirim GPS berkala, atur status, lihat penumpang di sekitar rute.
- **Admin / instansi:** verifikasi pengemudi, kelola trayek, monitoring realtime, tindak lanjut laporan.
- **Publik:** peta tanpa login dan halaman statistik transparansi layanan.

---

## Cara menjalankan

Prasyarat: Node.js 20+ dan npm. Tidak perlu variabel environment atau service lain.

```bash
git clone <url-repository>
cd angkot-live/apps/web
npm install
npm run dev
```

Buka http://localhost:5173.

**Login demo:** di `/login`, pilih peran (Penumpang / Pengemudi / Admin). Email dan password sudah terisi (`demo@angkot-live.id` / `angkot123`) dan tidak diverifikasi. Aktifkan opsi "pengemudi menunggu verifikasi" untuk mencoba gate verifikasi pengemudi.

Perintah lain:

```bash
npm run build      # type-check (tsc -b) + build produksi ke dist/
npm run preview    # jalankan hasil build
npm run lint       # oxlint
node scripts/shot.mjs   # screenshot semua route (dev server harus berjalan)
```

Tidak ada test runner. Screenshot ditulis ke `shots/` dalam ukuran desktop dan mobile.

## Progress saat ini

Legenda: **Ada** = halaman berfungsi dengan data mock · **Sebagian** = UI/alur ada, sebagian masih simulasi · **Belum** = belum dikerjakan.

### Publik

| Fitur (PRD) | Status | Catatan |
|---|---|---|
| Landing page | Ada | `/` |
| Peta angkot realtime | Ada | `/peta`: marker bergerak tiap 3 detik (simulasi), filter trayek & radius, detail angkot + ETA |
| Cari rute | Sebagian | `/rute`: pencarian asal/tujuan + rekomendasi langsung dan alternatif transfer (heuristik, belum graph/Dijkstra) |
| Daftar & detail trayek | Ada | `/trayek`, `/trayek/:id` |
| Statistik transparansi | Ada | `/statistik`: agregat dari mock + store laporan |
| Login / register / lupa password | Sebagian | UI lengkap, autentikasi masih mock |

### Penumpang

| Fitur (PRD) | Status | Catatan |
|---|---|---|
| Peta + megat angkot | Sebagian | Alur `idle → jalan kaki → mencari → cocok` dengan timer; belum memakai GPS/WebSocket asli |
| Perjalanan aktif | Ada | `/penumpang/perjalanan` (data mock) |
| Dashboard & riwayat | Ada | Statistik perjalanan dan daftar trip mock |
| Laporan + tracking status | Ada | Buat laporan, daftar, detail; status/tanggapan dari admin tersimpan di localStorage |
| Profil & notifikasi | Ada | Ubah profil (store auth), daftar notifikasi mock |

### Pengemudi

| Fitur (PRD) | Status | Catatan |
|---|---|---|
| Peta kerja & status | Sebagian | Pilih `narik/ngetem/istirahat/offline`, GPS dan kecepatan disimulasikan |
| Auto-ngetem 90 detik (BR-01) | Sebagian | Prompt muncul setelah diam 90 detik; belum ada default otomatis tanpa respons |
| Onboarding dokumen | Sebagian | Stepper UI, belum ada upload/penyimpanan dokumen |
| Status verifikasi | Sebagian | Membaca status dari auth mock |
| Dashboard, inbox, profil | Ada | Inbox memakai store pesan yang sama dengan admin |

### Admin

| Fitur (PRD) | Status | Catatan |
|---|---|---|
| Dashboard & monitoring | Ada | Monitoring memakai posisi simulasi + filter |
| Verifikasi pengemudi | Ada | Antrean + detail, setujui/tolak tersimpan di store demo |
| Trayek & editor | Sebagian | Data trayek dari mock; ubah halte/status hanya di state lokal, simpan belum persisten |
| Kendaraan | Ada | Tabel kondisi & masa berlaku dokumen (mock) |
| Laporan | Ada | Ubah status dan tanggapan, terlihat di sisi penumpang |
| Pesan & pengguna | Ada | Kirim pesan masuk ke inbox pengemudi; daftar pengguna mock |

### Fondasi

- Route guard per peran, redirect setelah login, gate verifikasi pengemudi (`src/app/router.tsx`).
- PWA: manifest + service worker (hanya aktif di build produksi).
- Design system dengan token warna/radius/shadow dan galeri komponen di `/dev/ui`.

### Belum dikerjakan (sesuai PRD)

Backend Go + Fiber, Supabase/PostgreSQL + PostGIS, JWT/RLS, WebSocket realtime, GPS asli + map matching, simulator GPS, graph routing (Dijkstra/A*) dengan batas transfer, tip pengemudi, wake lock, notifikasi push, serta test/CI.

## Struktur Repository

Monorepo agar frontend, backend, simulator, dan data trayek mudah disinkronkan.

```text
angkot-live/
├── apps/
│   ├── web/                          # Frontend: React + Vite (PWA)
│   │   ├── public/                   # manifest.webmanifest, ikon, service worker
│   │   ├── src/
│   │   │   ├── app/                  # entry, router, providers, guard role
│   │   │   ├── features/
│   │   │   │   ├── auth/             # login, register, upload dokumen pengemudi
│   │   │   │   ├── map/              # komponen peta, layer angkot, marker, filter
│   │   │   │   ├── tracking/         # hook WebSocket, store posisi, status angkot
│   │   │   │   ├── passenger/        # dashboard, megat, mode perjalanan, riwayat
│   │   │   │   ├── driver/           # dashboard, status, penumpang sekitar, inbox
│   │   │   │   ├── admin/            # verifikasi, CRUD trayek, monitoring, laporan
│   │   │   │   ├── routing/          # pencarian tujuan, hasil rekomendasi, transfer
│   │   │   │   ├── reports/          # form laporan, tracking status laporan
│   │   │   │   └── stats/            # halaman statistik publik
│   │   │   ├── components/           # UI bersama (button, modal, toast, badge status)
│   │   │   ├── hooks/                # useGeolocation, useWakeLock, useWebSocket
│   │   │   ├── lib/                  # api client, ws client, geo utils, format
│   │   │   ├── store/                # state global (Zustand / Redux Toolkit)
│   │   │   ├── styles/
│   │   │   └── types/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                          # Backend: Go + Fiber (modular monolith)
│       ├── cmd/
│       │   └── api/main.go           # entry point, wiring dependency
│       ├── internal/
│       │   ├── config/               # env, konfigurasi ambang (90 detik, radius, dll)
│       │   ├── platform/
│       │   │   ├── postgres/         # koneksi Supabase (pgx), query, transaksi
│       │   │   ├── redis/            # opsional, cache posisi
│       │   │   ├── ws/               # hub, client, room per jurusan
│       │   │   └── storage/          # penyimpanan file privat + signed URL
│       │   ├── middleware/           # JWT, RBAC, rate limit, logger, recover
│       │   ├── auth/                 # handler, service, repository, dto
│       │   ├── user/
│       │   ├── driver/               # profil, dokumen, verifikasi
│       │   ├── vehicle/
│       │   ├── route/                # trayek + halte (CRUD, GeoJSON)
│       │   ├── tracking/             # validasi GPS, map matching, status, ngetem
│       │   ├── passenger/            # megat, mode, request
│       │   ├── trip/
│       │   ├── routing/              # graph, Dijkstra/A*, transfer, ETA
│       │   ├── report/               # laporan + report_updates
│       │   ├── message/              # inbox
│       │   ├── tip/
│       │   └── stats/                # statistik publik + dashboard
│       ├── pkg/                      # util bersama: geo (haversine), errors, response
│       ├── api/                      # openapi.yaml (kontrak REST)
│       ├── go.mod
│       └── Dockerfile
│
├── tools/
│   └── simulator/                    # GPS simulator: angkot virtual di trayek nyata
│       ├── main.go
│       └── scenarios/                # konfigurasi skenario demo (jumlah angkot, kecepatan)
│
├── data/
│   ├── routes/                       # GeoJSON per trayek (rute + halte)
│   └── seed/                         # data awal: user admin, contoh pengemudi
│
├── deploy/
│   ├── docker-compose.yml            # web, api, redis, simulator
│   ├── nginx.conf                    # proxy HTTP + WebSocket
│   └── .env.example
│
├── docs/
│   ├── PRD.md                        # dokumen perancangan produk
│   ├── architecture.md
│   ├── erd.md
│   └── demo-script.md
│
├── .github/workflows/                # CI: lint, test, build
├── .gitignore
├── Makefile                          # make dev, make seed, make simulate
└── README.md
```

---

## Tim

| Nama Lengkap | Peran |
|---|---|
| Raditya Rizki R | Fullstack |
| Ridwan Hakim R | Fullstack |
| WIldan Satya N | Fullstack |

---

## Lisensi

Hak cipta karya tetap milik peserta sesuai ketentuan MIA 2026.
