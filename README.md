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
