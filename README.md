# PRD — Angkot-Live

**Platform pelacakan angkot realtime & transparansi layanan transportasi publik**

| | |
|---|---|
| Event | Multimedia In Action (MIA) 2026 — Kategori Web Development |
| Subtema | Public Service Tracking |
| Versi | 0.1 (draft) |
| Tanggal | 25 Oktober 2026 |
| Status | Draft untuk review tim |

---

## 1. Ringkasan

Angkot-Live adalah aplikasi web (PWA) yang menampilkan posisi angkot secara realtime di peta, membantu penumpang menemukan angkot dan jurusan yang tepat, membantu pengemudi mendapat informasi penumpang di sekitar rute, serta memberi admin/instansi alat untuk memverifikasi pengemudi, mengelola trayek, dan memantau kualitas layanan.

Aplikasi ini **bukan** ride-hailing. Framing-nya adalah *informasi keberadaan dan transparansi layanan*, bukan pemesanan angkot.

## 2. Latar belakang & masalah

| Masalah | Dampak |
|---|---|
| Penumpang tidak tahu angkot mana yang lewat, kapan datang, dan jurusan mana yang menuju tujuannya | Waktu tunggu tidak pasti, penumpang beralih ke kendaraan pribadi/ojol |
| Pengemudi tidak tahu di mana penumpang menunggu | Angkot ngetem lama atau lewat tanpa penumpang |
| Instansi tidak punya data realtime kondisi layanan dan kelayakan kendaraan | Pengawasan lambat dan manual |
| Tidak ada kanal pelaporan yang jelas untuk pengemudi ugal-ugalan atau fasilitas buruk | Keluhan tidak terdokumentasi dan tidak ditindaklanjuti |

## 3. Keselarasan dengan subtema

Subtema **Public Service Tracking**: website untuk memantau status/progres layanan publik dengan sistem tracking yang transparan dari sisi pengguna maupun instansi.

| Aspek subtema | Wujud di Angkot-Live |
|---|---|
| Tracking layanan | Posisi, status, dan ETA angkot realtime |
| Transparan bagi pengguna | Peta publik, status angkot, status tindak lanjut laporan |
| Transparan bagi instansi | Dashboard admin, verifikasi dokumen, monitoring trayek dan kendaraan |
| Partisipasi warga | Hotline pelaporan dan tracking status laporan |

## 4. Tujuan & metrik keberhasilan

### Tujuan
1. Penumpang dapat melihat angkot di sekitar dan mengetahui jurusan menuju tujuannya.
2. Pengemudi dapat membagikan posisi/status dan melihat penumpang di area rute.
3. Admin dapat memverifikasi pengemudi, mengelola trayek, dan memantau layanan.
4. Layanan dapat dipertanggungjawabkan lewat laporan dan statistik publik.

### Metrik (untuk demo & evaluasi)
| Metrik | Target |
|---|---|
| Latensi update posisi (pengemudi → peta penumpang) | ≤ 3 detik |
| Interval pengiriman GPS | 3–5 detik |
| Akurasi penempatan angkot di jalur (setelah map matching) | Titik berada pada polyline trayek |
| Waktu dari buka aplikasi ke melihat peta | ≤ 3 detik pada jaringan 4G |
| Alur demo end-to-end tanpa error | 100% pada skenario utama |

## 5. Persona & peran

| Peran | Deskripsi | Kebutuhan utama |
|---|---|---|
| **Penumpang** | Warga pengguna angkot harian | Tahu angkot mana yang datang, ETA, rekomendasi jurusan, melapor |
| **Pengemudi** | Sopir angkot terverifikasi | Lihat penumpang di rute, atur status, terima pesan, terima tip |
| **Admin** | Petugas/instansi pengelola | Verifikasi, kelola trayek, monitoring, tindak lanjut laporan |

## 6. Ruang lingkup & prioritas

### Prioritas

| Prioritas | Cakupan |
|---|---|
| **P0 — wajib jalan saat demo** | Auth & role, peta realtime (WebSocket), filter jurusan/radius, detail angkot + ETA, pencarian tujuan + rekomendasi jurusan langsung, mode pengemudi (kirim GPS + status), simulator GPS |
| **P1 — nilai tambah** | Verifikasi pengemudi, CRUD trayek, monitoring admin realtime, auto-ngetem 90 detik, megat angkot, dashboard ringkas tiap role, hotline laporan + tracking status, halaman statistik publik |
| **P2 — jika waktu cukup** | Transfer 2+ angkot, tip pengemudi, inbox, dashboard analitik lengkap, monitoring kondisi kendaraan dari dokumen, heatmap permintaan |

### Di luar cakupan (out of scope)
- Pemesanan/pembayaran angkot (bukan ride-hailing)
- Integrasi pembayaran riil (tip dapat disimulasikan)
- Aplikasi native Android/iOS (cukup PWA)
- Prediksi berbasis machine learning

## 7. Kebutuhan fungsional

### 7.1 Autentikasi & akun

| ID | Kebutuhan | Prioritas |
|---|---|---|
| AUTH-01 | Login/register dengan role-based access control: admin, pengemudi, penumpang | P0 |
| AUTH-02 | Penumpang mendaftar dengan email dan nomor telepon | P0 |
| AUTH-03 | Pengemudi mendaftar dengan data administrasi: SIM, NIK, STNK, KIR, foto kondisi mobil, jurusan | P1 |
| AUTH-04 | Status akun pengemudi: `pending` → `disetujui` / `ditolak` (dengan alasan) | P1 |
| AUTH-05 | Pengemudi belum terverifikasi tidak dapat tampil di peta publik | P1 |
| AUTH-06 | Token berbasis JWT dengan refresh; sesi dapat dicabut | P0 |

### 7.2 Admin

| ID | Kebutuhan | Prioritas |
|---|---|---|
| ADM-01 | Dashboard analitik: total angkot, angkot aktif, jumlah per jurusan | P1 |
| ADM-02 | CRUD trayek: data jurusan, rute (polyline GeoJSON), titik halte/terminal | P1 |
| ADM-03 | Verifikasi administrasi akun pengemudi (lihat dokumen, setujui/tolak) | P1 |
| ADM-04 | Monitoring posisi angkot realtime dengan filter radius dan jurusan | P1 |
| ADM-05 | Monitoring kondisi kendaraan berdasarkan dokumen (masa berlaku STNK/KIR, foto) dan penanda dokumen kedaluwarsa | P2 |
| ADM-06 | Kelola laporan masuk: ubah status (diterima → diproses → selesai) dan beri tanggapan | P1 |
| ADM-07 | Kirim pesan ke pengemudi (masuk ke inbox) | P2 |

### 7.3 Pengemudi

| ID | Kebutuhan | Prioritas |
|---|---|---|
| DRV-01 | Mengirim GPS secara berkala selama status aktif | P0 |
| DRV-02 | Status: `narik`, `ngetem`, `istirahat`, `offline` | P0 |
| DRV-03 | Peta trayek interaktif; hanya menampilkan mobil sendiri dan penumpang di sekitar rute | P0 |
| DRV-04 | Melihat penumpang yang sedang megat, hanya di area rute (halte, terminal, pinggir jalan) | P1 |
| DRV-05 | Dashboard: kendaraan, jarak tempuh, tip | P1 |
| DRV-06 | Inbox pesan dari sistem dan admin | P2 |
| DRV-07 | Pop-up konfirmasi ngetem (lihat aturan bisnis BR-01) | P1 |
| DRV-08 | Wake lock agar layar tidak mati saat bertugas | P1 |

### 7.4 Penumpang

| ID | Kebutuhan | Prioritas |
|---|---|---|
| PAX-01 | Peta trayek interaktif dengan angkot realtime | P0 |
| PAX-02 | Status angkot: `ngetem`, `jalan`, `merayap` | P0 |
| PAX-03 | Klik angkot → jurusan, nama pengemudi, plat nomor, ETA ke titik penumpang | P0 |
| PAX-04 | Pencarian lokasi tujuan + rekomendasi jurusan (rute langsung) | P0 |
| PAX-05 | Tombol "megat angkot" dengan mode otomatis (lihat BR-03) | P1 |
| PAX-06 | Mode perjalanan setelah naik angkot | P1 |
| PAX-07 | Hotline pelaporan di aplikasi (pengemudi ugal-ugalan, fasilitas tidak memadai) beserta tracking status laporan | P1 |
| PAX-08 | Dashboard: jumlah naik angkot, jarak tempuh, angkot yang sering dinaiki | P2 |
| PAX-09 | Rekomendasi perjalanan dengan transfer 2+ angkot (lihat bagian 9) | P2 |
| PAX-10 | Memberi tip kepada pengemudi | P2 |

### 7.5 Publik (tanpa login) — *rekomendasi*

| ID | Kebutuhan | Prioritas |
|---|---|---|
| PUB-01 | Melihat peta angkot realtime dan mencari rute tanpa login | P0 |
| PUB-02 | Halaman statistik transparansi: angkot aktif per jurusan, jumlah laporan, persentase laporan ditindaklanjuti | P1 |

## 8. Aturan bisnis

| ID | Aturan |
|---|---|
| BR-01 | **Auto-ngetem:** jika koordinat GPS pengemudi tidak berpindah (di bawah ambang jarak) selama **90 detik**, sistem menampilkan pop-up "Apakah Anda sedang ngetem?". Jika dikonfirmasi atau tidak ada respons selama T detik (ditentukan), status menjadi `ngetem`. |
| BR-02 | **Visibilitas penumpang:** pengemudi hanya melihat penumpang yang megat pada jurusan yang sama, dalam radius tertentu, dan berada di area rute. |
| BR-03 | **Megat angkot:** penumpang menekan tombol. Jika lokasi jauh dari area rute → mode **jalan kaki** (diarahkan ke titik rute terdekat). Jika sudah di area rute (pinggir jalan/halte/terminal) → otomatis mode **mencari pengemudi**, terlihat oleh pengemudi. |
| BR-04 | **Mode perjalanan** aktif setelah penumpang naik angkot; posisi penumpang tidak lagi ditampilkan sebagai "menunggu". |
| BR-05 | **Akurasi bersama:** pengemudi dan penumpang sama-sama mengirim GPS agar ETA dan pencocokan akurat. |
| BR-06 | **Merayap (macet):** kecepatan rata-rata di bawah ambang X km/jam selama Y detik (nilai ditentukan saat uji lapangan/simulasi). |
| BR-07 | **Angkot hilang:** tidak ada update GPS > N detik → ditandai terputus, lalu hilang dari peta publik. |
| BR-08 | **Timeout megat:** jika tidak ada pengemudi yang merespons dalam batas waktu, permintaan kedaluwarsa; penumpang dapat membatalkan kapan saja. |

### Pemetaan status

| Status pengemudi (manual/otomatis) | Tampilan ke penumpang |
|---|---|
| `narik` + kecepatan normal | `jalan` |
| `narik` + kecepatan rendah (BR-06) | `merayap` |
| `ngetem` | `ngetem` |
| `istirahat` / `offline` | Tidak ditampilkan |

## 9. Rekomendasi rute & transfer

1. **Rute langsung:** cari jurusan yang polyline-nya dekat dengan titik asal dan tujuan, dengan urutan sesuai arah trayek.
2. **Transfer:** bila tidak ada rute langsung, cari titik transfer di mana dua trayek berdekatan (jarak jalan kaki ≤ ±150–200 m).
3. **Algoritma:** graph berarah (directed). Node = titik sampling polyline (50–100 m). Edge = pergerakan searah trayek; edge transfer = jalan kaki antar trayek dengan penalti tunggu. Pencarian dengan Dijkstra/A*.
4. **Batas:** maksimal 1–2 transfer.
5. **Keluaran:** daftar leg (jalan kaki → angkot A → transfer → angkot B → jalan kaki) beserta estimasi waktu.

## 10. Kebutuhan non-fungsional

| Kategori | Kebutuhan |
|---|---|
| Performa | Update posisi ≤ 3 detik; peta tetap mulus dengan ≥ 50 marker simultan |
| Keandalan | WebSocket auto-reconnect + indikator status koneksi |
| Keamanan | Supabase Auth (password di-hash), JWT, RLS, validasi input, rate limit pada endpoint GPS, validasi tipe/ukuran file upload |
| Privasi | Dokumen SIM/NIK/STNK hanya dapat diakses admin (storage privat); lokasi penumpang hanya terlihat sesuai BR-02 dan hilang saat mode berhenti |
| Kompatibilitas | Responsif (mobile-first), PWA, browser modern |
| Baterai | Throttling GPS, hentikan pengiriman saat offline/istirahat |
| Aksesibilitas | Kontras warna memadai, label ikon status jelas, bukan hanya warna |

## 11. Arsitektur & tech stack

| Lapisan | Pilihan |
|---|---|
| Frontend | React + Vite (SPA/PWA), peta (Leaflet atau MapLibre) |
| Backend | Go + Fiber, **modular monolith** (modul: auth, tracking, trayek, laporan, notifikasi) yang siap dipecah menjadi service |
| Realtime | WebSocket (hub per jurusan/area) |
| Penyimpanan posisi | In-memory (atau Redis) untuk posisi terkini; snapshot berkala ke tabel `vehicle_positions` |
| Database | **Supabase (PostgreSQL + PostGIS)**, relational, dinormalisasi hingga 3NF; Supabase Auth + RLS untuk role |
| File | Supabase Storage (bucket privat) untuk dokumen dan foto kendaraan |
| Peta/geo | Geolocation API, map matching ke polyline trayek, index geospasial (PostGIS `GIST`) |
| Demo | **Simulator GPS** yang menjalankan beberapa angkot di trayek nyata |

> Catatan: arsitektur awal rencana adalah microservices. Untuk skala lomba, modular monolith memberi hasil demo yang sama dengan biaya pengembangan dan debugging jauh lebih rendah.

### 11.1 Diagram arsitektur sistem

```mermaid
flowchart LR
    FE["Frontend<br/>React + Vite PWA"] -->|REST| API["Backend<br/>Go Fiber"]
    FE <-->|WebSocket| API
    API --> DB[("Supabase<br/>PostgreSQL + PostGIS")]
    API --> MEM[("Redis / memori<br/>posisi terkini")]
    API --> FS[("Storage dokumen")]
    SIM["GPS Simulator"] -->|WebSocket| API
```

| Komponen | Peran |
|---|---|
| Frontend | Satu PWA untuk penumpang, pengemudi, admin, dan halaman publik |
| Backend | Auth, trayek, tracking, routing, laporan (modular monolith) |
| WebSocket | Update posisi dan status secara realtime |
| Redis / memori | Posisi terkini angkot (cepat, tanpa tulis ke database tiap titik) |
| Supabase | PostgreSQL + PostGIS, Auth, Storage, RLS |
| Storage dokumen | File SIM, STNK, KIR, foto (akses admin saja) |
| GPS Simulator | Angkot virtual untuk demo |

## 12. Model data & ERD (Supabase / PostgreSQL)

Database memakai **Supabase (PostgreSQL + PostGIS)**. Autentikasi memakai **Supabase Auth** (`auth.users` menyimpan email dan password hash), dokumen disimpan di **Supabase Storage** (bucket privat), dan akses data dibatasi per role dengan **Row Level Security (RLS)**.

### 12.1 Diagram ERD (3NF)

```mermaid
erDiagram
    PROFILES ||--o| DRIVER_PROFILES : "adalah"
    DRIVER_PROFILES ||--o{ DRIVER_DOCUMENTS : "mengunggah"
    DRIVER_PROFILES ||--o{ VEHICLES : "mengemudikan"
    VEHICLES ||--o{ VEHICLE_DOCUMENTS : "memiliki"
    VEHICLES ||--o{ VEHICLE_PHOTOS : "memiliki"
    ROUTES ||--o{ VEHICLES : "dilayani"
    ROUTES ||--o{ ROUTE_STOPS : "memiliki"
    VEHICLES ||--o{ VEHICLE_POSITIONS : "tercatat"
    PROFILES ||--o{ PASSENGER_REQUESTS : "megat"
    ROUTES ||--o{ PASSENGER_REQUESTS : "pada"
    PROFILES ||--o{ TRIPS : "melakukan"
    TRIPS ||--|{ TRIP_LEGS : "terdiri dari"
    VEHICLES ||--o{ TRIP_LEGS : "dinaiki"
    TRIP_LEGS ||--o{ TIPS : "mendapat"
    PROFILES ||--o{ REPORTS : "membuat"
    VEHICLES ||--o{ REPORTS : "dilaporkan"
    REPORTS ||--|{ REPORT_UPDATES : "riwayat"
    PROFILES ||--o{ MESSAGES : "menerima"

    PROFILES {
        uuid id PK "sama dengan auth.users.id"
        user_role role
        string nama
        string telepon UK
        boolean is_active
        timestamptz created_at
    }
    DRIVER_PROFILES {
        uuid user_id PK, FK
        string nik_enc UK
        verif_status status_verifikasi
        string alasan_tolak
        uuid verified_by FK
        timestamptz verified_at
        work_status status_kerja
    }
    DRIVER_DOCUMENTS {
        uuid id PK
        uuid driver_id FK
        driver_doc_type jenis
        string nomor_enc
        string file_path
        date berlaku_hingga
    }
    VEHICLES {
        uuid id PK
        uuid driver_id FK
        uuid route_id FK
        string plat_nomor UK
    }
    VEHICLE_DOCUMENTS {
        uuid id PK
        uuid vehicle_id FK
        vehicle_doc_type jenis
        string nomor_enc
        string file_path
        date berlaku_hingga
    }
    VEHICLE_PHOTOS {
        uuid id PK
        uuid vehicle_id FK
        string file_path
        timestamptz created_at
    }
    ROUTES {
        uuid id PK
        string kode UK
        string nama
        string warna
        geography path
        boolean is_active
    }
    ROUTE_STOPS {
        uuid id PK
        uuid route_id FK
        string nama
        stop_type jenis
        geography lokasi
        int urutan
    }
    VEHICLE_POSITIONS {
        bigint id PK
        uuid vehicle_id FK
        geography lokasi
        float kecepatan
        float arah
        timestamptz recorded_at
    }
    PASSENGER_REQUESTS {
        uuid id PK
        uuid passenger_id FK
        uuid route_id FK
        geography lokasi
        request_mode mode
        request_status status
        timestamptz expires_at
    }
    TRIPS {
        uuid id PK
        uuid passenger_id FK
        geography asal
        geography tujuan
        timestamptz mulai
        timestamptz selesai
    }
    TRIP_LEGS {
        uuid id PK
        uuid trip_id FK
        uuid vehicle_id FK
        int urutan
        geography naik_lokasi
        geography turun_lokasi
    }
    TIPS {
        uuid id PK
        uuid trip_leg_id FK
        int jumlah
        timestamptz created_at
    }
    REPORTS {
        uuid id PK
        uuid reporter_id FK
        uuid vehicle_id FK
        report_category kategori
        string deskripsi
        timestamptz created_at
    }
    REPORT_UPDATES {
        uuid id PK
        uuid report_id FK
        uuid admin_id FK
        report_status status
        string tanggapan
        timestamptz created_at
    }
    MESSAGES {
        uuid id PK
        uuid penerima_id FK
        uuid pengirim_id FK
        string isi
        boolean dibaca
        timestamptz created_at
    }
```

Relasi audit yang tidak digambar agar diagram tetap bersih (semuanya mengarah ke `PROFILES`): `driver_profiles.verified_by`, `report_updates.admin_id`, `messages.pengirim_id` (null = pesan sistem).

Tipe enum PostgreSQL:

| Enum | Nilai |
|---|---|
| `user_role` | admin, pengemudi, penumpang |
| `verif_status` | pending, disetujui, ditolak |
| `work_status` | narik, ngetem, istirahat, offline |
| `driver_doc_type` | SIM |
| `vehicle_doc_type` | STNK, KIR |
| `stop_type` | halte, terminal, titik_naik |
| `request_mode` | jalan_kaki, mencari, perjalanan |
| `request_status` | aktif, selesai, batal, kedaluwarsa |
| `report_category` | ugal_ugalan, fasilitas, lainnya |
| `report_status` | diterima, diproses, selesai |

> Pakai enum untuk himpunan nilai yang tetap dan kecil. Bila suatu saat nilainya perlu dikelola admin (misal kategori laporan), ubah jadi tabel referensi.

### 12.2 Penerapan normalisasi

**1NF — nilai atomik, tanpa grup berulang**

| Masalah jika tidak dinormalisasi | Solusi |
|---|---|
| Kolom `foto1, foto2, foto3` pada kendaraan | Tabel `vehicle_photos` (satu baris per foto) |
| Kolom `sim, stnk, kir` sekaligus dalam satu baris | Tabel `driver_documents` dan `vehicle_documents` (satu baris per dokumen) |
| Perjalanan yang menumpang 2 angkot disimpan di satu kolom | Tabel `trip_legs` (satu baris per angkot yang dinaiki) |
| Rute disimpan sebagai teks koordinat | Satu kolom bertipe `geography` (nilai atomik bagi PostGIS) |
| Riwayat status laporan dalam satu kolom | Tabel `report_updates` |

**2NF — tidak ada ketergantungan parsial**

Seluruh tabel memakai primary key tunggal (`uuid`/`bigint`), sehingga ketergantungan parsial pada kunci komposit tidak mungkin terjadi. Kombinasi yang harus unik dijaga dengan `UNIQUE`, bukan PK komposit:

| Tabel | Constraint unik |
|---|---|
| `driver_documents` | `(driver_id, jenis)` |
| `vehicle_documents` | `(vehicle_id, jenis)` |
| `route_stops` | `(route_id, urutan)` |
| `trip_legs` | `(trip_id, urutan)` |

**3NF — tidak ada ketergantungan transitif**

| Atribut yang sengaja **tidak** disimpan | Alasan | Cara mendapatkannya |
|---|---|---|
| Nama/kode jurusan di `vehicles` | Bergantung pada `route_id`, bukan pada kendaraan | `JOIN routes` |
| Nama pengemudi di `vehicles` atau `trips` | Bergantung pada `driver_id` | `JOIN profiles` |
| Email di `profiles` | Sudah ada di `auth.users` | `JOIN auth.users` |
| `route_id` di `trip_legs` dan `reports` | Ditentukan oleh `vehicle_id` | `JOIN vehicles` |
| Pengemudi penerima di `tips` | Ditentukan oleh `trip_leg_id → vehicle_id → driver_id` | `JOIN` berantai |
| Status laporan saat ini di `reports` | Sama dengan status baris `report_updates` terbaru | View `report_current_status` |
| Total jarak di `trips` / `driver_profiles` | Hasil agregasi | `SUM` dari `trip_legs` / `vehicle_positions` |
| Status `jalan` / `merayap` di posisi | Turunan dari kecepatan dan `status_kerja` | Dihitung di backend |

**Pengecualian yang disengaja**

| Kasus | Pertimbangan |
|---|---|
| `vehicle_positions` berisi banyak baris per kendaraan | Data deret waktu (histori), bukan duplikasi. Posisi terkini untuk peta tetap dari memori/Redis |
| `passenger_requests.route_id` | Fakta pada saat megat (jurusan yang ditunggu), bukan turunan dari kendaraan |

> Jika di kemudian hari satu pengemudi bisa berganti kendaraan atau kendaraan berganti jurusan, tambahkan tabel `vehicle_assignments (vehicle_id, driver_id, mulai, selesai)` agar riwayat tetap akurat.

### 12.3 Catatan implementasi Supabase

| Topik | Keputusan |
|---|---|
| Ekstensi | `postgis` untuk `geography`, `pgcrypto` / Vault untuk enkripsi NIK dan nomor dokumen |
| Index | `GIST` pada `routes.path`, `route_stops.lokasi`, `vehicle_positions.lokasi`, `passenger_requests.lokasi`; B-tree pada seluruh FK dan `vehicle_positions(vehicle_id, recorded_at)` |
| Posisi realtime | Dari WebSocket + memori; ke tabel `vehicle_positions` hanya snapshot berkala (misal tiap 10-30 detik) |
| Pembersihan data | Job `pg_cron` menghapus `vehicle_positions` lama dan menandai `passenger_requests` kedaluwarsa |
| RLS | Penumpang hanya melihat data sendiri; pengemudi hanya kendaraan dan penumpang di jurusannya; admin akses penuh; `driver_documents` dan `vehicle_documents` hanya admin dan pemilik |
| Storage | Bucket privat untuk dokumen dan foto kendaraan, akses lewat signed URL |
| View | `report_current_status` (status terbaru per laporan), `driver_stats` (jarak, jumlah trip), `public_stats` (statistik transparansi) |

## 13. Antarmuka API & WebSocket (ringkas)

### REST
| Endpoint | Fungsi |
|---|---|
| `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` | Autentikasi |
| `GET /routes`, `GET /routes/:id` | Daftar/detail trayek |
| `POST/PUT/DELETE /admin/routes` | CRUD trayek |
| `GET /admin/drivers?status=pending`, `PATCH /admin/drivers/:id/verify` | Verifikasi pengemudi |
| `GET /search/route?from=&to=` | Rekomendasi jurusan/transfer |
| `POST /reports`, `GET /reports/:id`, `PATCH /admin/reports/:id` | Laporan |
| `GET /stats/public` | Statistik transparansi |

### WebSocket (event)
| Event | Arah | Isi |
|---|---|---|
| `driver:position` | Pengemudi → server | lat, lng, speed, heading |
| `driver:status` | Pengemudi → server | narik/ngetem/istirahat/offline |
| `vehicles:update` | Server → klien | posisi + status angkot dalam area/jurusan yang di-subscribe |
| `passenger:position` | Penumpang → server | lat, lng, mode |
| `passengers:nearby` | Server → pengemudi | penumpang megat di area rute |
| `ngetem:prompt` | Server → pengemudi | konfirmasi ngetem (BR-01) |
| `message:new` | Server → pengguna | pesan inbox |

## 14. Alur kerja (flowchart)

### 14.1 Proses bisnis keseluruhan

```mermaid
flowchart TD
    subgraph DRV["Pengemudi"]
        D1["Daftar + upload dokumen"]
        D2["Set status narik, kirim GPS"]
        D3["Lihat penumpang menunggu"]
    end
    subgraph ADM["Admin"]
        A1{"Dokumen valid?"}
        A2["Tindak lanjut laporan"]
    end
    subgraph SYS["Sistem"]
        S1["Tampilkan angkot realtime di peta"]
        S2{"Penumpang di area rute?"}
        S3["Statistik publik diperbarui"]
    end
    subgraph PAX["Penumpang"]
        P1["Cari tujuan, lihat jurusan + ETA"]
        P2["Tekan megat"]
        P3["Jalan kaki ke titik rute"]
        P4["Naik angkot, mode perjalanan"]
        P5["Selesai: beri tip atau lapor"]
    end

    D1 --> A1
    A1 -->|Ditolak| D1
    A1 -->|Disetujui| D2
    D2 --> S1
    S1 --> P1
    P1 --> P2
    P2 --> S2
    S2 -->|Belum| P3
    P3 --> S2
    S2 -->|Sudah| D3
    D3 --> P4
    P4 --> P5
    P5 -->|Laporan| A2
    A2 --> S3
```

### 14.2 Alur penumpang

```mermaid
flowchart TD
    A(["Buka aplikasi"]) --> B["Lihat peta angkot realtime"]
    B --> C["Cari tujuan"]
    C --> D["Rekomendasi jurusan + ETA"]
    D --> E{"Perlu transfer?"}
    E -->|Tidak| F["Pilih angkot"]
    E -->|Ya, P2| G["Lihat rute 2+ angkot"]
    G --> F
    F --> H["Tekan megat"]
    H --> I{"Di area rute?"}
    I -->|Tidak| J["Mode jalan kaki ke titik rute"]
    J --> I
    I -->|Ya| K["Mode mencari pengemudi"]
    K --> L{"Angkot datang?"}
    L -->|Batal atau timeout| B
    L -->|Ya| M["Naik angkot, mode perjalanan"]
    M --> N["Turun, trip selesai"]
    N --> O{"Ada masalah?"}
    O -->|Ya| P["Kirim laporan, pantau status"]
    O -->|Tidak| Q["Beri tip, opsional"]
    P --> R(["Selesai"])
    Q --> R
```

### 14.3 Alur pengemudi

```mermaid
flowchart TD
    A(["Login"]) --> B{"Akun terverifikasi?"}
    B -->|Belum| C["Lengkapi dokumen"]
    C --> D["Tunggu verifikasi admin"]
    D --> B
    B -->|Ya| E["Set status narik"]
    E --> F["Kirim GPS + lihat penumpang menunggu"]
    F --> G{"Diam 90 detik?"}
    G -->|Ya| H["Pop-up: apakah ngetem?"]
    H -->|Ya| I["Status ngetem"]
    I --> F
    H -->|Tidak| F
    G -->|Tidak| J{"Selesai atau istirahat?"}
    J -->|Belum| F
    J -->|Istirahat| K["Status istirahat"]
    K --> E
    J -->|Selesai| L(["Offline"])
```

### 14.4 Alur admin

```mermaid
flowchart TD
    A(["Login admin"]) --> B["Dashboard"]

    B --> C["Verifikasi pengemudi"]
    C --> C1{"Dokumen valid?"}
    C1 -->|Ya| C2["Setujui"]
    C1 -->|Tidak| C3["Tolak + alasan"]
    C2 --> C4["Kirim pesan ke pengemudi"]
    C3 --> C4

    B --> D["Kelola trayek: tambah, ubah, hapus"]

    B --> E["Monitoring realtime + filter radius / jurusan"]

    B --> F["Tinjau laporan"]
    F --> F1["Ubah status: diproses"]
    F1 --> F2["Selesai + tanggapan"]
    F2 --> F3["Masuk statistik publik"]
```

## 15. Rencana demo (±3 menit)

| Menit | Adegan |
|---|---|
| 0:00 | Masalah dan nilai tambah dalam satu kalimat |
| 0:30 | Penumpang: peta realtime → cari tujuan → rekomendasi jurusan |
| 1:15 | Pengemudi: status, penumpang megat muncul di peta |
| 1:45 | Admin: verifikasi pengemudi dan monitoring realtime |
| 2:15 | Laporan penumpang → status berubah di sisi admin → terlihat di statistik publik |
| 2:45 | Penutup: keselarasan dengan Public Service Tracking |

Seluruh adegan memakai simulator GPS agar peta tidak kosong.

## 16. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Scope terlalu besar | Fitur setengah jadi | Kerjakan berurutan P0 → P1 → P2; bekukan fitur P2 bila mepet |
| Data trayek tidak rapi | Rekomendasi rute salah | Rapikan trayek yang dipakai demo saja; simpan sebagai GeoJSON |
| GPS tidak akurat/loncat | Angkot "terbang" dari jalur | Map matching ke polyline + filter kecepatan wajar |
| Browser membatasi GPS di background | Posisi berhenti terkirim | Wake lock, peringatan "biarkan aplikasi terbuka", catat sebagai batasan |
| Tidak ada angkot asli saat penjurian | Demo kosong | Simulator GPS |
| Kebocoran data dokumen | Pelanggaran privasi | Storage privat, akses admin saja, validasi upload |
| Koneksi WebSocket terputus | Peta tidak update | Auto-reconnect + indikator koneksi |

## 17. Keputusan terbuka

| # | Pertanyaan | Rekomendasi sementara |
|---|---|---|
| 1 | Apakah tracking publik boleh tanpa login? | Boleh; login hanya untuk dashboard, laporan, tip |
| 2 | Database | **Supabase (PostgreSQL)**, sudah diputuskan. Yang masih terbuka: backend Go memverifikasi JWT Supabase Auth, atau Go hanya dipakai untuk modul realtime dan routing |
| 3 | Microservices atau modular monolith? | Modular monolith |
| 4 | Ambang nilai (jarak diam, X km/jam, T detik, radius) | Tentukan lewat uji simulasi |
| 5 | Skema tip (simulasi atau integrasi nyata)? | Simulasi untuk lomba |
| 6 | Cakupan kota/trayek untuk demo | 2–3 trayek saja yang datanya rapi |

## 18. Linimasa

> Isi tanggal setelah deadline MIA dikonfirmasi. Urutan yang disarankan:

| Fase | Isi |
|---|---|
| 1. Fondasi | Desain, ERD, auth, data trayek (GeoJSON) |
| 2. Inti realtime | WebSocket, mode pengemudi, peta penumpang, simulator GPS (P0) |
| 3. Fitur nilai tambah | Admin, verifikasi, megat, auto-ngetem, laporan, statistik publik (P1) |
| 4. Polesan | Transfer rute, tip, dashboard, heatmap (P2) bila waktu cukup |
| 5. Final | Uji end-to-end, rekam demo, dokumen dan presentasi |

## 19. Struktur repository

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
│   ├── PRD.md                        # dokumen ini
│   ├── architecture.md
│   ├── erd.md
│   └── demo-script.md
│
├── .github/workflows/                # CI: lint, test, build
├── .gitignore
├── Makefile                          # make dev, make seed, make simulate
└── README.md
```

### Konvensi

| Topik | Aturan |
|---|---|
| Struktur modul Go | Tiap modul di `internal/<modul>/` berisi `handler.go`, `service.go`, `repository.go`, `model.go`, `dto.go`; antar modul hanya lewat interface service |
| Struktur fitur FE | Tiap fitur mandiri (komponen, hook, api, tipe) di `features/<nama>/` |
| Kontrak API | `openapi.yaml` jadi sumber kebenaran; tipe FE dapat digenerate dari sana |
| Branch | `main` (stabil/demo), `develop`, `feat/<nama-fitur>`, `fix/<nama>` |
| Commit | Conventional Commits (`feat:`, `fix:`, `docs:`) |
| Environment | Semua secret lewat `.env`, hanya `.env.example` yang di-commit |
| Prioritas pengerjaan | Ikuti P0 → P1 → P2 pada bagian 6; modul P2 (`tip`, transfer di `routing`) boleh dikosongkan dulu |
