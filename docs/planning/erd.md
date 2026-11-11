# ERD Angkot-Live — skema MVP

Diperbarui 11 November 2026 berdasarkan delapan migration yang sudah diterapkan pada Supabase lokal PostgreSQL 17/PostGIS. Tipe kolom lengkap dihasilkan dari database pada [database.generated.ts](../apps/web/src/types/database.generated.ts).

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : extends
    PROFILES ||--o| DRIVER_PROFILES : driver
    PROFILES ||--o{ PASSENGER_REQUESTS : requests
    PROFILES ||--o{ PASSENGER_TRIPS : passenger
    PROFILES ||--o{ REPORTS : reporter
    PROFILES ||--o{ REPORT_UPDATES : reviewer
    PROFILES ||--o{ MESSAGES : sender_recipient
    PROFILES ||--o| NOTIFICATION_PREFERENCES : owns
    PROFILES ||--o{ FLOW_IDEMPOTENCY : actor
    ROUTES ||--o{ ROUTE_SEGMENTS : directed_chains
    ROUTES ||--o{ ROUTE_STOPS : ordered_stops
    ROUTES ||--o{ VEHICLES : direction
    ROUTES ||--o{ DRIVER_PROFILES : assignment
    ROUTES ||--o{ PASSENGER_REQUESTS : direction
    ROUTES ||--o{ PASSENGER_TRIPS : direction
    VEHICLES ||--o| DRIVER_PROFILES : current_driver
    VEHICLES ||--o{ DRIVER_DOCUMENTS : vehicle_document
    VEHICLES ||--o| LIVE_LOCATIONS : legacy_live
    VEHICLES ||--o{ VEHICLE_POSITIONS : snapshots
    VEHICLES ||--o{ PASSENGER_TRIPS : ride
    VEHICLES ||--o{ REPORTS : optional_vehicle
    DRIVER_PROFILES ||--o{ DRIVER_DOCUMENTS : revisions
    DRIVER_PROFILES ||--o{ DRIVER_DUTIES : shifts
    VEHICLES ||--o{ DRIVER_DUTIES : assignment_history
    ROUTES ||--o{ DRIVER_DUTIES : direction_history
    DRIVER_PROFILES ||--o{ VEHICLE_POSITIONS : sampled_driver
    DRIVER_PROFILES ||--o{ PASSENGER_TRIPS : driver
    PASSENGER_REQUESTS |o--o| PASSENGER_TRIPS : boards_once
    REPORTS ||--o{ REPORT_UPDATES : timeline
    REPORTS |o--o{ MESSAGES : related_report

    PROFILES {
        uuid id PK,FK
        user_role role
        text name
        text email
        text phone
    }
    DRIVER_PROFILES {
        uuid id PK,FK
        uuid vehicle_id FK,UK
        text route_id FK
        varchar nik
        varchar sim_number
        text address
        date sim_expires_at
        jsonb onboarding
        timestamp submitted_at
        driver_verification_status verification_status
        uuid verified_by FK
        timestamp verified_at
        text rejection_reason
        boolean is_active_duty
    }
    ROUTES {
        text id PK
        text code
        text name
        text origin
        text destination
        boolean is_active
        geometry path
        jsonb segments
        jsonb polyline
        jsonb endstops
        jsonb street_runs
        text_array streets
        integer fare_standard
        integer fare_student
    }
    ROUTE_SEGMENTS {
        text route_id PK,FK
        integer segment_order PK
        geometry path
    }
    ROUTE_STOPS {
        uuid id PK
        text route_id FK
        integer stop_order
        text name
        geometry location
        boolean is_terminal
    }
    VEHICLES {
        uuid id PK
        text plate_number UK
        text route_id FK
        text model
        integer year
        integer capacity
        vehicle_status status
        date stnk_expiry
        date kir_expiry
    }
    DRIVER_DOCUMENTS {
        uuid id PK
        uuid driver_id FK
        uuid vehicle_id FK
        document_type document_type
        text file_path
        text file_name
        integer file_size
        text mime_type
        date expires_at
        timestamp uploaded_at
        timestamp superseded_at
    }
    LIVE_LOCATIONS {
        uuid vehicle_id PK,FK
        uuid driver_id FK
        geometry location
        vehicle_status status
        timestamp last_seen_at
    }
    VEHICLE_POSITIONS {
        bigint id PK
        uuid vehicle_id FK
        uuid driver_id FK
        jsonb position
        jsonb raw_position
        real accuracy
        real speed_kph
        text telemetry_source
        text telemetry_source
        timestamp sampled_at
        timestamp received_at
    }
    DRIVER_DUTIES {
        uuid id PK
        uuid driver_id FK
        uuid vehicle_id FK
        text route_id FK
        text mode
        text session_id
        text end_reason
        text telemetry_source
        double distance_km
        timestamp started_at
        timestamp finished_at
    }
    PASSENGER_REQUESTS {
        uuid id PK
        uuid passenger_id FK
        text route_id FK
        geometry location
        text status
        passenger_mode mode
        boolean is_active
        jsonb pickup
        jsonb destination_point
        text destination
        real accuracy
        bigint revision
        uuid matched_vehicle_id FK
        timestamp created_at
        timestamp expires_at
        timestamp last_seen_at
    }
    PASSENGER_TRIPS {
        uuid id PK
        uuid request_id FK,UK
        uuid passenger_id FK
        uuid driver_id FK
        uuid vehicle_id FK
        text route_id FK
        text status
        text origin_name
        text destination_name
        jsonb destination_point
        jsonb last_passenger_position
        double distance_km
        double start_offset_km
        integer chain_index
        integer fare
        text telemetry_source
        timestamp started_at
        timestamp finished_at
    }
    REPORTS {
        uuid id PK
        text code UK
        uuid reporter_id FK
        uuid vehicle_id FK
        text plate_number
        report_category category
        text subject
        text description
        text_array evidence_urls
        report_status status
    }
    REPORT_UPDATES {
        uuid id PK
        uuid report_id FK
        uuid admin_id FK
        report_status status
        text notes
        timestamp created_at
    }
    MESSAGES {
        uuid id PK
        uuid sender_id FK
        uuid recipient_id FK
        text title
        text content
        text kind
        uuid related_report_id FK
        boolean is_read
        boolean is_broadcast
        timestamp created_at
    }
    NOTIFICATION_PREFERENCES {
        uuid profile_id PK,FK
        boolean report_updates
        timestamp updated_at
    }
    FLOW_IDEMPOTENCY {
        uuid actor_id PK,FK
        text action PK
        text key PK
        jsonb result
        timestamp created_at
    }
```

## Invariant dan geometri

- Identitas trayek adalah `routes.id` per arah; **code tidak unik**. Kedua arah boleh memakai kode yang sama.
- `route_segments` menyimpan LineString terurut per chain, SRID 4326 dengan GIST. UI `[lat,lng]` dikonversi eksplisit ke geometri `[lng,lat]`. Celah antar-chain tidak disambung. `routes.path` bernilai null untuk rute multichain.
- Admin CRUD memakai RPC `admin_route_command`; importer/seeder memanggil RPC `sync_route_geometry` untuk menulis segmen, halte, dan cache JSON dalam satu transaksi. `route_stops` unik pada `(route_id,stop_order)`. API/planner memakai `route_catalog()` dari database sejak Sprint 2, dengan cache Go 3 detik dan invalidasi langsung setelah mutasi admin.
- Assignment kendaraan pada driver unik. SIM/KTP/STNK/KIR memiliki satu revisi aktif per driver/jenis; foto dapat banyak. Revisi lama ditandai `superseded_at`. Submit/review memeriksa revisi aktif dan keberadaan objek privat di Storage.
- Satu request aktif per penumpang, satu trip aktif per penumpang, satu duty terbuka per driver. `request_id` trip unik; boarding dan penutupan request satu transaksi.
- Request aktif hanya untuk walking/searching/accepted, mode sesuai status; trip completed harus memiliki waktu selesai yang berurutan. Jarak, akurasi dan kapasitas dibatasi.
- Duty menyimpan assignment, mode, identitas sesi penerbit GPS dan sumber `gps`/`simulation`. Sesi lain ditolak saat duty aktif; expiry memakai session ID agar tidak menutup sesi pengganti. `tracking_authorizations()` memeriksa approval, assignment, arah aktif dan status akun Auth. `end_tracking()` menyimpan alasan penutupan dan jarak terakhir. Riwayat simulasi ditandai dan tidak menambah ringkasan operasional pengemudi.
- Duty menyimpan assignment dan mode. API tunggal menutup duty lama saat restart; snapshot historis tidak dipakai untuk menghidupkan kendaraan tanpa GPS baru.

## Auth, akses dan Storage

`auth.users` dimiliki Supabase Auth; profil dibentuk trigger registrasi. Role publik hanya penumpang/pengemudi. Seeder admin membuat akun penumpang terkonfirmasi terlebih dahulu, lalu mengubah role profil memakai service role lokal. Tidak ada tabel password aplikasi.

Browser hanya memiliki grant baca pada routes/route_stops. Tabel sensitif dan RPC mutation dicabut dari anon/authenticated; API memvalidasi JWT melalui Auth dan menjalankan command memakai service role. RLS aktif, tetapi policy lama tidak berarti direct read diizinkan ketika grant sudah dicabut. Hak admin/ownership diterapkan pada API/command, bukan klaim role kiriman browser.

Bucket `driver-documents` dan `report-evidence` privat, maksimal 5 MiB, tipe JPG/PNG/PDF. Path berformat `ownerUUID/objectUUID`. Referensi path tidak berupa FK SQL ke Storage; submit/review memeriksa keberadaan objek. Admin mendapat signed URL dokumen pengemudi, penumpang hanya bukti miliknya. Signed URL berlaku 120 detik dan melewati proxy origin frontend.

## Batas skema MVP

Tidak ada tabel tip, trip multi-leg atau analitik materialized. Preferensi notifikasi tanggapan laporan tersedia pada Sprint 4; pengaturan lain tidak ditawarkan. DB-05 di [audit](./SCHEMA_AUDIT_MVP.md) tetap opsional/backlog. `messages.kind` dan relasi laporan sudah tersedia; pengiriman pesan admin serta sinkronisasi preferensi UI mengikuti sprint berikutnya.

## Penutupan Sprint 4–5

`notification_preferences` hanya dapat diakses melalui command pemilik akun. Transisi laporan dikunci dan berurutan, retry memakai key yang sama tidak menggandakan timeline/pesan, dan setiap bukti harus ada di Storage privat milik actor. Trip menyimpan provenance posisi dan snapshot tarif kanonis saat boarding; perubahan tarif selanjutnya tidak mengubah histori. Signed URL berumur 120 detik dan tidak masuk cache service worker.
