-- ==============================================================================
-- Angkot-Live: Supabase Database Seed Data
-- ==============================================================================

-- 1. SEED USERS & PROFILES
-- Fixed UUIDs for demo
-- Admin: 11111111-1111-1111-1111-111111111111
-- Driver: 22222222-2222-2222-2222-222222222222
-- Passenger: 33333333-3333-3333-3333-333333333333

INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'admin@angkot-live.id', '{"name": "Petugas Dishub", "role": "admin"}', now()),
    ('22222222-2222-2222-2222-222222222222', 'asep@angkot-live.id', '{"name": "Asep Sunandar", "role": "pengemudi", "phone": "081234567891"}', now()),
    ('33333333-3333-3333-3333-333333333333', 'sari@angkot-live.id', '{"name": "Sari Wulandari", "role": "penumpang", "phone": "081234567890"}', now())
ON CONFLICT (id) DO NOTHING;

-- Explicit profiles insert (if trigger doesn't execute or for direct seeding)
INSERT INTO public.profiles (id, role, name, email, phone)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin', 'Petugas Dishub', 'admin@angkot-live.id', '081234567892'),
    ('22222222-2222-2222-2222-222222222222', 'pengemudi', 'Asep Sunandar', 'asep@angkot-live.id', '081234567891'),
    ('33333333-3333-3333-3333-333333333333', 'penumpang', 'Sari Wulandari', 'sari@angkot-live.id', '081234567890')
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    name = EXCLUDED.name;

-- 2. SEED ROUTES (Sampel Trayek Populer Bandung)
INSERT INTO public.routes (id, code, name, origin, destination, color, path, streets, fare_standard, fare_student, is_active)
VALUES 
    (
        '3415464', 
        '01A', 
        'Abdul Muis → Cicaheum via Binong', 
        'Terminal Abdul Muis/Kebon Kalapa', 
        'Terminal Angkot Cicaheum', 
        '#1F5C3A',
        ST_GeomFromText('LINESTRING(107.604 -6.928, 107.618 -6.920, 107.635 -6.915, 107.656 -6.903)', 4326),
        ARRAY['Jalan Dewi Sartika', 'Jalan BKR', 'Jalan Pelajar Pejuang 45', 'Jalan Jenderal Gatot Subroto', 'Jalan Cicaheum'],
        5000, 
        3000, 
        true
    ),
    (
        '3415465', 
        '08', 
        'Cicaheum → Leuwipanjang', 
        'Terminal Cicaheum', 
        'Terminal Leuwipanjang', 
        '#325F99',
        ST_GeomFromText('LINESTRING(107.656 -6.903, 107.630 -6.922, 107.605 -6.938, 107.595 -6.945)', 4326),
        ARRAY['Jalan Jenderal Ahmad Yani', 'Jalan Jakarta', 'Jalan Sukabumi', 'Jalan Laswi', 'Jalan Soekarno Hatta'],
        6000, 
        3000, 
        true
    ),
    (
        '3415466', 
        '05', 
        'Cicaheum → Ledeng', 
        'Terminal Cicaheum', 
        'Terminal Ledeng', 
        '#B45309',
        ST_GeomFromText('LINESTRING(107.656 -6.903, 107.625 -6.895, 107.608 -6.875, 107.598 -6.858)', 4326),
        ARRAY['Jalan PH. H. Mustofa', 'Jalan Surapati', 'Jalan Prabu Dimuntur', 'Jalan Cihampelas', 'Jalan Dr. Setiabudi'],
        5000, 
        3000, 
        true
    )
ON CONFLICT (id) DO NOTHING;

-- 3. SEED VEHICLES
INSERT INTO public.vehicles (id, plate_number, route_id, model, year, capacity, status, stnk_expiry, kir_expiry)
VALUES
    ('44444444-4444-4444-4444-444444444441', 'D 1982 AB', '3415464', 'Suzuki Carry 1.5 Futura', 2018, 12, 'jalan', '2027-08-15', '2027-02-10'),
    ('44444444-4444-4444-4444-444444444442', 'D 1402 CA', '3415464', 'Daihatsu Gran Max 1.3', 2020, 14, 'merayap', '2026-12-01', '2026-11-20'),
    ('44444444-4444-4444-4444-444444444443', 'D 1765 BC', '3415465', 'Mitsubishi Colt T120SS', 2017, 12, 'ngetem', '2027-05-14', '2026-10-05'),
    ('44444444-4444-4444-4444-444444444444', 'D 1899 KL', '3415466', 'Suzuki Carry 1.5 Futura', 2019, 12, 'jalan', '2027-09-30', '2027-03-15')
ON CONFLICT (plate_number) DO NOTHING;

-- 4. SEED DRIVER PROFILE
INSERT INTO public.driver_profiles (id, vehicle_id, route_id, nik, sim_number, verification_status, verified_at, verified_by, is_active_duty)
VALUES
    (
        '22222222-2222-2222-2222-222222222222',
        '44444444-4444-4444-4444-444444444441',
        '3415464',
        '3273011204850003',
        'SIM-9823-1102-44',
        'disetujui',
        now() - interval '30 days',
        '11111111-1111-1111-1111-111111111111',
        true
    )
ON CONFLICT (id) DO UPDATE SET
    verification_status = EXCLUDED.verification_status,
    is_active_duty = EXCLUDED.is_active_duty;

-- 5. SEED LIVE LOCATIONS
INSERT INTO public.live_locations (vehicle_id, driver_id, location, heading, speed_kph, status, seats_available, last_seen_at)
VALUES
    (
        '44444444-4444-4444-4444-444444444441',
        '22222222-2222-2222-2222-222222222222',
        ST_SetSRID(ST_MakePoint(107.618, -6.920), 4326),
        45.0,
        28.5,
        'jalan',
        5,
        now()
    )
ON CONFLICT (vehicle_id) DO UPDATE SET
    location = EXCLUDED.location,
    speed_kph = EXCLUDED.speed_kph,
    status = EXCLUDED.status,
    last_seen_at = now();

-- 6. SEED REPORTS
INSERT INTO public.reports (id, code, reporter_id, vehicle_id, plate_number, category, subject, description, status, created_at)
VALUES
    (
        '55555555-5555-5555-5555-555555555551',
        'LPR-1021',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444443',
        'D 1765 BC',
        'tarif',
        'Tarif dinaikkan sepihak di malam hari',
        'Sopir meminta tarif Rp 9.000 padahal tarif resmi yang tertera Rp 6.000 rute Cicaheum - Leuwipanjang.',
        'diproses',
        now() - interval '2 days'
    ),
    (
        '55555555-5555-5555-5555-555555555552',
        'LPR-1022',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444441',
        'D 1982 AB',
        'pengemudi',
        'Ngetem terlalu lama di perempatan Gatot Subroto',
        'Mobil berhenti lebih dari 15 menit menghalangi lajur kiri dan membuat penumpang terlambat.',
        'selesai',
        now() - interval '5 days'
    )
ON CONFLICT (id) DO NOTHING;

-- 7. SEED REPORT UPDATES
INSERT INTO public.report_updates (report_id, admin_id, status, notes, created_at)
VALUES
    (
        '55555555-5555-5555-5555-555555555552',
        '11111111-1111-1111-1111-111111111111',
        'selesai',
        'Laporan telah ditindaklanjuti. Pengemudi yang bersangkutan telah dipanggil dan diberikan surat teguran pertama.',
        now() - interval '3 days'
    );

