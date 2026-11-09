-- ==============================================================================
-- Angkot-Live: Supabase Database Schema Migration
-- Event: Multimedia In Action (MIA) 2026 — Web In Action (WIA)
-- Subtema: Public Service Tracking
-- Description: Skema database PostgreSQL + PostGIS lengkap dengan Row Level Security
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('penumpang', 'pengemudi', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE driver_verification_status AS ENUM ('menunggu', 'disetujui', 'ditolak');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vehicle_status AS ENUM ('jalan', 'merayap', 'ngetem', 'istirahat', 'offline');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE passenger_mode AS ENUM ('idle', 'jalan_kaki', 'mencari', 'perjalanan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_category AS ENUM ('pengemudi', 'fasilitas', 'tarif', 'lainnya');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_status AS ENUM ('diterima', 'diproses', 'selesai');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('sim', 'ktp', 'stnk', 'kir', 'foto_kendaraan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. HELPER FUNCTIONS & TRIGGERS
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TABLES DEFINITION

-- ------------------------------------------------------------------------------
-- 4.1. PROFILES (Terhubung ke auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'penumpang',
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helper check role user
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 4.2. ROUTES (Data Trayek Angkot)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.routes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#1F5C3A',
    path GEOMETRY(LineString, 4326),
    polyline JSONB NOT NULL DEFAULT '[]'::jsonb,
    segments JSONB,
    streets TEXT[] DEFAULT ARRAY[]::TEXT[],
    fare_standard INTEGER NOT NULL DEFAULT 5000,
    fare_student INTEGER NOT NULL DEFAULT 3000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_routes_updated_at
BEFORE UPDATE ON public.routes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 4.3. ROUTE_STOPS (Halte & Terminal)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id TEXT NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stop_order INTEGER NOT NULL DEFAULT 0,
    is_terminal BOOLEAN NOT NULL DEFAULT false,
    location GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4.4. VEHICLES (Armada Angkot)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number TEXT NOT NULL UNIQUE,
    route_id TEXT NOT NULL REFERENCES public.routes(id) ON DELETE RESTRICT,
    model TEXT,
    year INTEGER,
    capacity INTEGER NOT NULL DEFAULT 12,
    status vehicle_status NOT NULL DEFAULT 'offline',
    stnk_expiry DATE,
    kir_expiry DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 4.5. DRIVER_PROFILES (Data Pengemudi & Verifikasi)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    route_id TEXT REFERENCES public.routes(id) ON DELETE SET NULL,
    nik VARCHAR(16),
    sim_number VARCHAR(20),
    verification_status driver_verification_status NOT NULL DEFAULT 'menunggu',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    is_active_duty BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_driver_profiles_updated_at
BEFORE UPDATE ON public.driver_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 4.6. DRIVER_DOCUMENTS (Dokumen Administrasi Pengemudi)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.driver_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4.7. LIVE_LOCATIONS (Posisi Realtime Angkot)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_locations (
    vehicle_id UUID PRIMARY KEY REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    heading REAL NOT NULL DEFAULT 0,
    speed_kph REAL NOT NULL DEFAULT 0,
    status vehicle_status NOT NULL DEFAULT 'jalan',
    seats_available INTEGER NOT NULL DEFAULT 12,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4.8. PASSENGER_REQUESTS (Fitur Megat Angkot)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.passenger_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    route_id TEXT NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    location GEOMETRY(Point, 4326) NOT NULL,
    mode passenger_mode NOT NULL DEFAULT 'mencari',
    matched_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 seconds'),
    matched_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 4.9. PASSENGER_TRIPS (Riwayat Perjalanan Penumpang)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.passenger_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    route_id TEXT REFERENCES public.routes(id) ON DELETE SET NULL,
    origin_name TEXT NOT NULL,
    destination_name TEXT NOT NULL,
    origin_location GEOMETRY(Point, 4326),
    destination_location GEOMETRY(Point, 4326),
    fare INTEGER NOT NULL DEFAULT 5000,
    rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 4.10. REPORTS (Hotline Pelaporan & Pengaduan Warga)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    plate_number TEXT,
    category report_category NOT NULL DEFAULT 'lainnya',
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    status report_status NOT NULL DEFAULT 'diterima',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 4.11. REPORT_UPDATES (Log Riwayat & Tanggapan Laporan oleh Admin)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.report_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status report_status NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4.12. MESSAGES (Inbox & Broadcast Petugas ke Pengemudi)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL jika broadcast umum
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_broadcast BOOLEAN NOT NULL DEFAULT false,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. SPATIAL & PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
-- PostGIS Spatial GIST Indexes
CREATE INDEX IF NOT EXISTS idx_routes_path ON public.routes USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_route_stops_location ON public.route_stops USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_live_locations_location ON public.live_locations USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_passenger_requests_location ON public.passenger_requests USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_passenger_trips_origin ON public.passenger_trips USING GIST (origin_location);

-- B-Tree Performance Indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_route_id ON public.vehicles (route_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles (status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_verification ON public.driver_profiles (verification_status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_route ON public.driver_profiles (route_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_status ON public.live_locations (status);
CREATE INDEX IF NOT EXISTS idx_passenger_requests_active ON public.passenger_requests (is_active, route_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports (reporter_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages (recipient_id, is_read);

-- ------------------------------------------------------------------------------
-- 6. AUTH INTEGRATION TRIGGER (Supabase auth.users -> public.profiles)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role user_role := 'penumpang';
BEGIN
    IF (NEW.raw_user_meta_data->>'role') IS NOT NULL THEN
        default_role := (NEW.raw_user_meta_data->>'role')::user_role;
    END IF;

    INSERT INTO public.profiles (id, email, name, role, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        default_role,
        NEW.raw_user_meta_data->>'phone'
    );

    -- Bila mendaftar sebagai pengemudi, otomatis buat entri di driver_profiles
    IF default_role = 'pengemudi' THEN
        INSERT INTO public.driver_profiles (id, verification_status)
        VALUES (NEW.id, 'menunggu');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 7. SPATIAL RPC FUNCTIONS (PostGIS API untuk Backend / Frontend)
-- ------------------------------------------------------------------------------

-- 7.1. Cari angkot aktif dalam radius tertentu
CREATE OR REPLACE FUNCTION public.get_nearby_vehicles(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 3.0,
    p_route_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    vehicle_id UUID,
    plate_number TEXT,
    route_id TEXT,
    route_code TEXT,
    route_name TEXT,
    driver_name TEXT,
    status vehicle_status,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    heading REAL,
    speed_kph REAL,
    seats_available INTEGER,
    distance_meters DOUBLE PRECISION
) AS $$
DECLARE
    center_point GEOMETRY(Point, 4326);
BEGIN
    center_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    RETURN QUERY
    SELECT
        v.id AS vehicle_id,
        v.plate_number,
        r.id AS route_id,
        r.code AS route_code,
        r.name AS route_name,
        p.name AS driver_name,
        loc.status,
        ST_Y(loc.location) AS lat,
        ST_X(loc.location) AS lng,
        loc.heading,
        loc.speed_kph,
        loc.seats_available,
        ST_Distance(loc.location::geography, center_point::geography) AS distance_meters
    FROM public.live_locations loc
    JOIN public.vehicles v ON v.id = loc.vehicle_id
    JOIN public.routes r ON r.id = v.route_id
    JOIN public.driver_profiles dp ON dp.id = loc.driver_id
    JOIN public.profiles p ON p.id = dp.id
    WHERE loc.status != 'offline'
      AND (p_route_id IS NULL OR r.id = p_route_id)
      AND ST_DWithin(loc.location::geography, center_point::geography, p_radius_km * 1000)
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7.2. Cari penumpang menunggu di sekitar rute untuk pengemudi
CREATE OR REPLACE FUNCTION public.get_nearby_passengers_for_driver(
    p_route_id TEXT,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 2.0
)
RETURNS TABLE (
    request_id UUID,
    passenger_name TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    mode passenger_mode,
    distance_meters DOUBLE PRECISION,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    driver_point GEOMETRY(Point, 4326);
BEGIN
    driver_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);

    RETURN QUERY
    SELECT
        pr.id AS request_id,
        p.name AS passenger_name,
        ST_Y(pr.location) AS lat,
        ST_X(pr.location) AS lng,
        pr.mode,
        ST_Distance(pr.location::geography, driver_point::geography) AS distance_meters,
        pr.created_at
    FROM public.passenger_requests pr
    JOIN public.profiles p ON p.id = pr.passenger_id
    WHERE pr.is_active = true
      AND pr.route_id = p_route_id
      AND pr.expires_at > now()
      AND ST_DWithin(pr.location::geography, driver_point::geography, p_radius_km * 1000)
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 8. VIEW: STATISTIK TRANSPARANSI PUBLIK
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.view_public_stats AS
SELECT
    (SELECT count(*) FROM public.routes WHERE is_active = true) AS total_active_routes,
    (SELECT count(*) FROM public.vehicles WHERE status IN ('jalan', 'merayap', 'ngetem')) AS total_active_vehicles,
    (SELECT count(*) FROM public.driver_profiles WHERE verification_status = 'disetujui') AS total_verified_drivers,
    (SELECT count(*) FROM public.reports) AS total_reports,
    (SELECT count(*) FROM public.reports WHERE status = 'selesai') AS total_resolved_reports,
    CASE 
        WHEN (SELECT count(*) FROM public.reports) > 0 THEN
            ROUND(((SELECT count(*)::decimal FROM public.reports WHERE status = 'selesai') / (SELECT count(*) FROM public.reports)) * 100, 1)
        ELSE 100.0
    END AS report_resolution_rate;

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passenger_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 9.1. PROFILES POLICIES
CREATE POLICY "Profiles viewable by self and admins"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 9.2. ROUTES & STOPS (Publik dapat membaca, Admin dapat mengelola)
CREATE POLICY "Public read active routes"
    ON public.routes FOR SELECT
    USING (true);

CREATE POLICY "Admin manage routes"
    ON public.routes FOR ALL
    USING (public.is_admin());

CREATE POLICY "Public read route stops"
    ON public.route_stops FOR SELECT
    USING (true);

CREATE POLICY "Admin manage route stops"
    ON public.route_stops FOR ALL
    USING (public.is_admin());

-- 9.3. VEHICLES (Publik membaca, Admin mengelola)
CREATE POLICY "Public read vehicles"
    ON public.vehicles FOR SELECT
    USING (true);

CREATE POLICY "Admin manage vehicles"
    ON public.vehicles FOR ALL
    USING (public.is_admin());

-- 9.4. DRIVER_PROFILES & DOCUMENTS
CREATE POLICY "Driver profile viewable by self, verified names by public, and admin"
    ON public.driver_profiles FOR SELECT
    USING (
        auth.uid() = id 
        OR public.is_admin() 
        OR (verification_status = 'disetujui')
    );

CREATE POLICY "Driver can update own basic profile"
    ON public.driver_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admin manage driver verification"
    ON public.driver_profiles FOR ALL
    USING (public.is_admin());

CREATE POLICY "Driver view own documents"
    ON public.driver_documents FOR SELECT
    USING (driver_id = auth.uid() OR public.is_admin());

CREATE POLICY "Driver upload own documents"
    ON public.driver_documents FOR INSERT
    WITH CHECK (driver_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admin delete/review driver documents"
    ON public.driver_documents FOR DELETE
    USING (public.is_admin());

-- 9.5. LIVE_LOCATIONS (Publik membaca, Pengemudi update lokasinya sendiri)
CREATE POLICY "Public read live vehicle locations"
    ON public.live_locations FOR SELECT
    USING (true);

CREATE POLICY "Driver update own vehicle location"
    ON public.live_locations FOR ALL
    USING (
        driver_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.driver_profiles
            WHERE id = auth.uid() AND verification_status = 'disetujui'
        )
    );

CREATE POLICY "Admin manage live locations"
    ON public.live_locations FOR ALL
    USING (public.is_admin());

-- 9.6. PASSENGER_REQUESTS (Megat)
CREATE POLICY "Passenger manage own hailing request"
    ON public.passenger_requests FOR ALL
    USING (passenger_id = auth.uid());

CREATE POLICY "Verified drivers see nearby requests on same route"
    ON public.passenger_requests FOR SELECT
    USING (
        is_active = true 
        AND expires_at > now()
        AND EXISTS (
            SELECT 1 FROM public.driver_profiles dp
            WHERE dp.id = auth.uid()
              AND dp.verification_status = 'disetujui'
              AND dp.route_id = route_id
        )
    );

-- 9.7. PASSENGER_TRIPS
CREATE POLICY "Users read own trips"
    ON public.passenger_trips FOR SELECT
    USING (passenger_id = auth.uid() OR driver_id = auth.uid() OR public.is_admin());

CREATE POLICY "Passenger create trip"
    ON public.passenger_trips FOR INSERT
    WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Passenger/Driver update trip"
    ON public.passenger_trips FOR UPDATE
    USING (passenger_id = auth.uid() OR driver_id = auth.uid() OR public.is_admin());

-- 9.8. REPORTS & UPDATES
CREATE POLICY "Reporter view own reports and admin view all"
    ON public.reports FOR SELECT
    USING (reporter_id = auth.uid() OR public.is_admin());

CREATE POLICY "Authenticated user create report"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());

CREATE POLICY "Admin update report status"
    ON public.reports FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Public/involved parties read report updates"
    ON public.report_updates FOR SELECT
    USING (
        public.is_admin() 
        OR EXISTS (
            SELECT 1 FROM public.reports r 
            WHERE r.id = report_id AND r.reporter_id = auth.uid()
        )
    );

CREATE POLICY "Admin create report updates"
    ON public.report_updates FOR INSERT
    WITH CHECK (public.is_admin());

-- 9.9. MESSAGES
CREATE POLICY "Users view own incoming messages or broadcasts"
    ON public.messages FOR SELECT
    USING (recipient_id = auth.uid() OR is_broadcast = true OR sender_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admin send messages"
    ON public.messages FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Recipient mark message read"
    ON public.messages FOR UPDATE
    USING (recipient_id = auth.uid());

