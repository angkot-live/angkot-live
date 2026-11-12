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

-- Operational flows. Run after 20261109000000_initial_schema.sql.
-- All privileged commands are callable only by the API service role.
BEGIN;
ALTER TABLE public.routes DROP CONSTRAINT IF EXISTS routes_code_key;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS endstops jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS street_runs jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS onboarding jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.driver_profiles ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.driver_documents ADD COLUMN IF NOT EXISTS expires_at date;
ALTER TABLE public.passenger_requests ALTER COLUMN created_at SET DEFAULT clock_timestamp();
ALTER TABLE public.passenger_requests ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'expired'
  CHECK (status IN ('walking','searching','accepted','boarded','cancelled','expired'));
ALTER TABLE public.passenger_requests ADD COLUMN IF NOT EXISTS pickup jsonb;
ALTER TABLE public.passenger_requests ADD COLUMN IF NOT EXISTS destination_point jsonb;
ALTER TABLE public.passenger_requests ADD COLUMN IF NOT EXISTS destination text NOT NULL DEFAULT '';
ALTER TABLE public.passenger_requests ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 1;
ALTER TABLE public.passenger_requests ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.passenger_requests ADD COLUMN IF NOT EXISTS accuracy real NOT NULL DEFAULT 0;
UPDATE public.passenger_requests SET is_active = false WHERE status = 'expired';
CREATE UNIQUE INDEX IF NOT EXISTS one_active_request ON public.passenger_requests(passenger_id)
  WHERE status IN ('walking','searching','accepted');
ALTER TABLE public.passenger_trips ADD COLUMN IF NOT EXISTS destination_point jsonb;
ALTER TABLE public.passenger_trips ADD COLUMN IF NOT EXISTS last_passenger_position jsonb;
ALTER TABLE public.passenger_trips ADD COLUMN IF NOT EXISTS last_passenger_at timestamptz;
ALTER TABLE public.passenger_trips ADD COLUMN IF NOT EXISTS request_id uuid UNIQUE REFERENCES public.passenger_requests(id);
ALTER TABLE public.passenger_trips ADD COLUMN IF NOT EXISTS distance_km double precision NOT NULL DEFAULT 0;
ALTER TABLE public.passenger_trips ADD COLUMN IF NOT EXISTS start_offset_km double precision NOT NULL DEFAULT 0;
ALTER TABLE public.passenger_trips ADD COLUMN IF NOT EXISTS chain_index integer NOT NULL DEFAULT 0;
ALTER TABLE public.passenger_trips ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed'));
UPDATE public.passenger_trips SET status = 'completed' WHERE finished_at IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS one_active_trip ON public.passenger_trips(passenger_id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS one_driver_vehicle ON public.driver_profiles(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE TABLE public.vehicle_positions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 vehicle_id uuid NOT NULL REFERENCES public.vehicles(id),
 driver_id uuid NOT NULL REFERENCES public.driver_profiles(id),
 position jsonb NOT NULL, raw_position jsonb NOT NULL, accuracy real NOT NULL,
 speed_kph real NOT NULL, sampled_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.driver_duties (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), driver_id uuid NOT NULL REFERENCES public.driver_profiles(id),
 started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, distance_km double precision NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX one_open_duty ON public.driver_duties(driver_id) WHERE finished_at IS NULL;
ALTER TABLE public.vehicle_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_duties ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.flow_idempotency (
 actor_id uuid NOT NULL REFERENCES public.profiles(id), action text NOT NULL, key text NOT NULL,
 result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,action,key)
);
ALTER TABLE public.flow_idempotency ENABLE ROW LEVEL SECURITY;

-- Remove broad policies and direct write grants. Existing RPCs bypass RLS: revoke them too.
REVOKE ALL ON public.profiles, public.driver_profiles, public.driver_documents,
 public.vehicles, public.live_locations, public.passenger_requests, public.passenger_trips,
 public.reports, public.report_updates, public.messages, public.vehicle_positions,
 public.driver_duties, public.flow_idempotency FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_nearby_vehicles(double precision,double precision,double precision,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_nearby_passengers_for_driver(text,double precision,double precision,double precision) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.view_public_stats FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.routes, public.route_stops TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE requested text := coalesce(NEW.raw_user_meta_data->>'role','penumpang');
BEGIN
 IF requested NOT IN ('penumpang','pengemudi') THEN RAISE EXCEPTION 'Invalid registration role'; END IF;
 INSERT INTO public.profiles(id,email,name,role,phone)
 VALUES(NEW.id,NEW.email,coalesce(nullif(NEW.raw_user_meta_data->>'name',''),split_part(NEW.email,'@',1)),requested::user_role,NEW.raw_user_meta_data->>'phone');
 IF requested = 'pengemudi' THEN INSERT INTO public.driver_profiles(id) VALUES(NEW.id); END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.sync_profile_email() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.profiles SET email=NEW.email WHERE id=NEW.id AND email IS DISTINCT FROM NEW.email;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_profile_email() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER on_auth_email_changed AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();
ALTER FUNCTION public.current_user_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('driver-documents','driver-documents',false,5242880,ARRAY['image/jpeg','image/png','application/pdf']),
 ('report-evidence','report-evidence',false,5242880,ARRAY['image/jpeg','image/png','application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=false, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;
-- Storage is accessed through API only; no public/owner SELECT policies are introduced.

CREATE OR REPLACE FUNCTION public.flow_command(p_actor uuid, p_action text, p_input jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
 actor public.profiles; dp public.driver_profiles; req public.passenger_requests; trip public.passenger_trips;
 rep public.reports; result jsonb; target uuid; vehicle uuid; doc_count integer; item jsonb;
 idempotency_key text := nullif(p_input->>'key',''); target_status text; pos geometry;
BEGIN
 SELECT * INTO actor FROM public.profiles WHERE id=p_actor;
 IF actor.id IS NULL THEN RAISE EXCEPTION 'Akun tidak ditemukan'; END IF;
 -- Serialize all lifecycle commands for one account, including competing boarding calls.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 IF idempotency_key IS NOT NULL THEN
  SELECT f.result INTO result FROM public.flow_idempotency f WHERE actor_id=p_actor AND action=p_action AND f.key=idempotency_key;
  IF result IS NOT NULL THEN RETURN result; END IF;
 END IF;
 IF p_action='me' THEN
  SELECT * INTO dp FROM public.driver_profiles WHERE id=p_actor;
  result := jsonb_build_object('id',actor.id,'name',actor.name,'email',actor.email,'phone',actor.phone,'role',actor.role,'driverVerification',dp.verification_status);
 ELSIF p_action='profile' THEN
  UPDATE public.profiles SET name=coalesce(nullif(trim(p_input->>'name'),''),name),phone=coalesce(p_input->>'phone',phone) WHERE id=p_actor;
  RETURN public.flow_command(p_actor,'me','{}');
 ELSIF p_action IN ('onboarding','save_onboarding','submit','document','assignment') THEN
  IF actor.role <> 'pengemudi' THEN RAISE EXCEPTION 'Akses pengemudi diperlukan'; END IF;
  SELECT * INTO dp FROM public.driver_profiles WHERE id=p_actor FOR UPDATE;
  IF p_action='save_onboarding' THEN
   IF dp.verification_status='disetujui' OR dp.submitted_at IS NOT NULL AND dp.verification_status='menunggu' THEN RAISE EXCEPTION 'Berkas sedang diperiksa atau sudah disetujui'; END IF;
   UPDATE public.driver_profiles SET onboarding=p_input-'key' WHERE id=p_actor RETURNING * INTO dp;
  ELSIF p_action='document' THEN
   IF dp.verification_status='disetujui' OR dp.submitted_at IS NOT NULL AND dp.verification_status='menunggu' THEN RAISE EXCEPTION 'Berkas tidak dapat diubah'; END IF;
   INSERT INTO public.driver_documents(driver_id,document_type,file_path,file_name,mime_type,file_size,expires_at)
   VALUES(p_actor,(p_input->>'type')::document_type,p_input->>'path',p_input->>'name',p_input->>'mime',(p_input->>'size')::integer,nullif(p_input->>'expiresAt','')::date);
  ELSIF p_action='submit' THEN
   IF dp.verification_status='disetujui' THEN RAISE EXCEPTION 'Akun sudah disetujui'; END IF;
   IF coalesce(dp.onboarding->>'simExpiry','')='' OR coalesce(dp.onboarding->>'stnkExpiry','')='' OR coalesce(dp.onboarding->>'kirExpiry','')='' OR nullif(dp.onboarding->>'stnkExpiry','')::date<current_date OR nullif(dp.onboarding->>'kirExpiry','')::date<current_date OR coalesce(dp.onboarding->>'nik','') !~ '^[0-9]{16}$' OR length(coalesce(dp.onboarding->>'sim',''))<3 OR nullif(dp.onboarding->>'simExpiry','')::date < current_date
     OR coalesce(dp.onboarding->>'name','')='' OR coalesce(dp.onboarding->>'plate','')='' OR coalesce(dp.onboarding->>'capacity','') !~ '^[0-9]+$' OR nullif(dp.onboarding->>'capacity','')::integer NOT BETWEEN 1 AND 30 OR coalesce(dp.onboarding->>'year','') !~ '^[0-9]{4}$' OR nullif(dp.onboarding->>'year','')::integer NOT BETWEEN 1950 AND extract(year FROM now())::integer+1 THEN RAISE EXCEPTION 'Lengkapi identitas, SIM aktif dan kendaraan'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.routes WHERE id=dp.onboarding->>'routeId' AND is_active) THEN RAISE EXCEPTION 'Trayek tidak tersedia'; END IF;
   SELECT count(DISTINCT document_type) INTO doc_count FROM public.driver_documents WHERE driver_id=p_actor AND document_type IN ('sim','stnk','kir','foto_kendaraan');
   IF doc_count<4 THEN RAISE EXCEPTION 'Unggah SIM, STNK, KIR dan foto kendaraan'; END IF;
   UPDATE public.driver_profiles SET verification_status='menunggu',submitted_at=now(), rejection_reason=NULL,
    nik=onboarding->>'nik',sim_number=onboarding->>'sim' WHERE id=p_actor RETURNING * INTO dp;
   UPDATE public.profiles SET name=dp.onboarding->>'name' WHERE id=p_actor;
  END IF;
  SELECT jsonb_build_object('id',dp.id,'form',dp.onboarding,'status',dp.verification_status,'submittedAt',dp.submitted_at,'reason',dp.rejection_reason,
   'vehicleId',dp.vehicle_id,'routeId',dp.route_id,
   'documents',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'type',d.document_type,'name',d.file_name,'size',d.file_size,'uploadedAt',d.uploaded_at)) FROM public.driver_documents d WHERE driver_id=p_actor),'[]'),
   'vehicle',(SELECT jsonb_build_object('id',v.id,'plate',v.plate_number,'capacity',v.capacity) FROM public.vehicles v WHERE v.id=dp.vehicle_id)) INTO result;
 ELSIF p_action='applicants' THEN
  IF actor.role<>'admin' THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(d)||jsonb_build_object('name',p.name,'email',p.email,'phone',p.phone,'documents',coalesce((SELECT jsonb_agg(to_jsonb(doc)) FROM public.driver_documents doc WHERE driver_id=d.id),'[]'))),'[]') INTO result
   FROM public.driver_profiles d JOIN public.profiles p ON p.id=d.id WHERE d.submitted_at IS NOT NULL;
 ELSIF p_action='verify' THEN
  IF actor.role<>'admin' THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
  target:=(p_input->>'id')::uuid;
  SELECT * INTO dp FROM public.driver_profiles WHERE id=target FOR UPDATE;
  IF dp.id IS NULL OR dp.submitted_at IS NULL THEN RAISE EXCEPTION 'Pendaftaran tidak ditemukan'; END IF;
  IF dp.verification_status <> 'menunggu' THEN RAISE EXCEPTION 'Pendaftaran sudah diputuskan'; END IF;
  target_status:=p_input->>'status';
  IF target_status NOT IN ('disetujui','ditolak') THEN RAISE EXCEPTION 'Status tidak valid'; END IF;
  IF target_status='ditolak' AND length(trim(coalesce(p_input->>'reason','')))<5 THEN RAISE EXCEPTION 'Alasan penolakan wajib diisi'; END IF;
  IF target_status='disetujui' THEN
   INSERT INTO public.vehicles(plate_number,route_id,model,year,capacity,stnk_expiry,kir_expiry)
    VALUES(upper(trim(dp.onboarding->>'plate')),dp.onboarding->>'routeId',dp.onboarding->>'model',(dp.onboarding->>'year')::integer,(dp.onboarding->>'capacity')::integer,
    nullif(dp.onboarding->>'stnkExpiry','')::date,nullif(dp.onboarding->>'kirExpiry','')::date) RETURNING id INTO vehicle;
  END IF;
  UPDATE public.driver_profiles SET verification_status=target_status::driver_verification_status,verified_at=now(),verified_by=p_actor,
   rejection_reason=CASE WHEN target_status='ditolak' THEN p_input->>'reason' END,
   vehicle_id=coalesce(vehicle,vehicle_id),route_id=onboarding->>'routeId',is_active_duty=false WHERE id=target;
  INSERT INTO public.messages(sender_id,recipient_id,title,content) VALUES(p_actor,target,'Status verifikasi: '||target_status,CASE WHEN target_status='ditolak' THEN p_input->>'reason' ELSE 'Akun pengemudi Anda disetujui. Anda dapat mulai bertugas.' END);
  result:=jsonb_build_object('ok',true);
 ELSIF p_action='duty' THEN
  IF actor.role<>'pengemudi' OR NOT EXISTS(SELECT 1 FROM public.driver_profiles WHERE id=p_actor AND verification_status='disetujui' AND vehicle_id IS NOT NULL) THEN RAISE EXCEPTION 'Pengemudi belum terverifikasi'; END IF;
  IF p_input->>'mode' IN ('narik','ngetem') THEN
   INSERT INTO public.driver_duties(driver_id) VALUES(p_actor) ON CONFLICT(driver_id) WHERE finished_at IS NULL DO NOTHING;
   UPDATE public.driver_profiles SET is_active_duty=true WHERE id=p_actor;
  ELSE
   UPDATE public.driver_duties SET finished_at=now(),distance_km=greatest(distance_km,coalesce((p_input->>'distanceKm')::float8,0)) WHERE driver_id=p_actor AND finished_at IS NULL;
   UPDATE public.driver_profiles SET is_active_duty=false WHERE id=p_actor;
  END IF;
  result:=jsonb_build_object('ok',true);
 ELSIF p_action IN ('request','request_position','cancel','respond','board','request_current','requests') THEN
  IF p_action='requests' THEN
   IF actor.role<>'pengemudi' THEN RAISE EXCEPTION 'Akses pengemudi diperlukan'; END IF;
   UPDATE public.passenger_requests SET status='expired',is_active=false,revision=revision+1 WHERE is_active AND expires_at<=now();
   SELECT coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('position',jsonb_build_array(ST_Y(r.location),ST_X(r.location)),'name',p.name)),'[]') INTO result
    FROM public.passenger_requests r JOIN public.profiles p ON p.id=r.passenger_id
    JOIN public.driver_profiles d ON d.id=p_actor AND d.route_id=r.route_id AND d.verification_status='disetujui'
    WHERE r.is_active AND r.expires_at>now() AND r.status IN ('searching','accepted') AND r.last_seen_at>now()-interval '30 seconds';
  ELSIF p_action='request_current' THEN
   UPDATE public.passenger_requests SET status='expired',is_active=false,revision=revision+1 WHERE passenger_id=p_actor AND is_active AND expires_at<=now();
   SELECT to_jsonb(r)||jsonb_build_object('position',jsonb_build_array(ST_Y(r.location),ST_X(r.location)),'name',actor.name) INTO result FROM public.passenger_requests r WHERE passenger_id=p_actor ORDER BY created_at DESC LIMIT 1;
  ELSIF p_action='request' THEN
   IF actor.role<>'penumpang' THEN RAISE EXCEPTION 'Akses penumpang diperlukan'; END IF;
   IF EXISTS(SELECT 1 FROM public.passenger_trips WHERE passenger_id=p_actor AND status='active') THEN RAISE EXCEPTION 'Selesaikan perjalanan aktif terlebih dahulu'; END IF;
   UPDATE public.passenger_requests SET status='cancelled',is_active=false,revision=revision+1 WHERE passenger_id=p_actor AND is_active;
   pos:=ST_SetSRID(ST_MakePoint((p_input->'position'->>1)::float8,(p_input->'position'->>0)::float8),4326);
   INSERT INTO public.passenger_requests(passenger_id,route_id,location,pickup,destination,destination_point,status,mode,accuracy,expires_at)
    VALUES(p_actor,p_input->>'routeId',pos,p_input->'pickup',coalesce(p_input->>'destination','Belum dipilih'),p_input->'destinationPoint',p_input->>'status',CASE WHEN p_input->>'status'='walking' THEN 'jalan_kaki'::passenger_mode ELSE 'mencari'::passenger_mode END,(p_input->>'accuracy')::real,
    now()+CASE WHEN p_input->>'status'='walking' THEN interval '5 minutes' ELSE interval '60 seconds' END) RETURNING * INTO req;
   result:=to_jsonb(req)||jsonb_build_object('position',p_input->'position','name',actor.name);
  ELSE
   SELECT * INTO req FROM public.passenger_requests WHERE id=(p_input->>'id')::uuid FOR UPDATE;
   IF req.id IS NULL THEN RAISE EXCEPTION 'Permintaan tidak ditemukan'; END IF;
   IF p_action<>'respond' AND req.passenger_id<>p_actor THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
   IF p_action='board' THEN
    SELECT * INTO trip FROM public.passenger_trips WHERE request_id=req.id;
    IF trip.id IS NOT NULL THEN RETURN to_jsonb(trip); END IF;
   END IF;
   IF NOT req.is_active OR req.expires_at<=now() THEN RAISE EXCEPTION 'Permintaan sudah tidak aktif'; END IF;
   IF p_action='cancel' THEN
    UPDATE public.passenger_requests SET status='cancelled',is_active=false,revision=revision+1 WHERE id=req.id RETURNING * INTO req;
   ELSIF p_action='request_position' THEN
    pos:=ST_SetSRID(ST_MakePoint((p_input->'position'->>1)::float8,(p_input->'position'->>0)::float8),4326);
    UPDATE public.passenger_requests SET location=pos,accuracy=(p_input->>'accuracy')::real,pickup=p_input->'pickup',last_seen_at=now(),revision=revision+1,
     status=CASE WHEN p_input->>'arrived'='false' THEN 'walking' WHEN req.status='walking' THEN 'searching' ELSE req.status END,
     matched_vehicle_id=CASE WHEN p_input->>'arrived'='false' THEN NULL ELSE req.matched_vehicle_id END,
     mode=CASE WHEN p_input->>'arrived'='false' THEN 'jalan_kaki'::passenger_mode WHEN req.status='walking' THEN 'mencari'::passenger_mode ELSE req.mode END,
     expires_at=CASE WHEN req.status='walking' AND p_input->>'arrived'='true' THEN now()+interval '60 seconds' ELSE req.expires_at END WHERE id=req.id RETURNING * INTO req;
   ELSIF p_action='respond' THEN
    SELECT * INTO dp FROM public.driver_profiles WHERE id=p_actor;
    IF actor.role<>'pengemudi' OR dp.id IS NULL OR dp.verification_status<>'disetujui' OR dp.route_id IS DISTINCT FROM req.route_id OR req.status<>'searching' THEN RAISE EXCEPTION 'Permintaan tidak dapat direspons'; END IF;
    UPDATE public.passenger_requests SET status='accepted',matched_vehicle_id=dp.vehicle_id,matched_at=now(),expires_at=now()+interval '5 minutes',revision=revision+1 WHERE id=req.id RETURNING * INTO req;
   ELSIF p_action='board' THEN
    IF req.status NOT IN ('searching','accepted') THEN RAISE EXCEPTION 'Belum berada di titik naik'; END IF;
    vehicle:=(p_input->>'vehicleId')::uuid;
    SELECT * INTO dp FROM public.driver_profiles WHERE vehicle_id=vehicle AND verification_status='disetujui' AND route_id=req.route_id;
    IF dp.id IS NULL OR req.status='accepted' AND req.matched_vehicle_id IS DISTINCT FROM vehicle THEN RAISE EXCEPTION 'Kendaraan tidak sesuai'; END IF;
    INSERT INTO public.passenger_trips(passenger_id,driver_id,vehicle_id,route_id,request_id,origin_name,destination_name,origin_location,destination_point,start_offset_km,chain_index)
     VALUES(p_actor,dp.id,vehicle,req.route_id,req.id,'Titik naik',req.destination,req.location,req.destination_point,(p_input->>'offsetKm')::float8,(p_input->>'chain')::integer) RETURNING * INTO trip;
    UPDATE public.passenger_requests SET status='boarded',mode='perjalanan',is_active=false,revision=revision+1 WHERE id=req.id;
    result:=to_jsonb(trip);
   END IF;
   IF result IS NULL THEN result:=to_jsonb(req)||jsonb_build_object('position',jsonb_build_array(ST_Y(req.location),ST_X(req.location)),'name',actor.name); END IF;
  END IF;
 ELSIF p_action='trip_position' THEN
  IF actor.role<>'penumpang' THEN RAISE EXCEPTION 'Akses penumpang diperlukan'; END IF;
  UPDATE public.passenger_trips SET last_passenger_position=p_input->'position',last_passenger_at=now() WHERE passenger_id=p_actor AND status='active';
  result:=jsonb_build_object('ok',true);
 ELSIF p_action IN ('trips','trip_active','complete') THEN
  IF actor.role<>'penumpang' THEN RAISE EXCEPTION 'Akses penumpang diperlukan'; END IF;
  IF p_action='complete' THEN
   SELECT * INTO trip FROM public.passenger_trips WHERE id=(p_input->>'id')::uuid AND passenger_id=p_actor FOR UPDATE;
   IF trip.id IS NULL THEN RAISE EXCEPTION 'Perjalanan tidak ditemukan'; END IF;
   UPDATE public.passenger_trips SET status='completed',finished_at=coalesce(finished_at,now()),distance_km=CASE WHEN status='active' THEN greatest(0,(p_input->>'distanceKm')::float8) ELSE distance_km END WHERE id=trip.id RETURNING * INTO trip;
   result:=to_jsonb(trip);
  ELSIF p_action='trip_active' THEN
   SELECT to_jsonb(t) INTO result FROM public.passenger_trips t WHERE passenger_id=p_actor AND status='active';
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY started_at DESC),'[]') INTO result FROM public.passenger_trips t WHERE passenger_id=p_actor;
  END IF;
 ELSIF p_action IN ('reports','report','report_update') THEN
  IF p_action='report' THEN
   IF actor.role<>'penumpang' OR length(trim(coalesce(p_input->>'description','')))<20 THEN RAISE EXCEPTION 'Kronologi minimal 20 karakter'; END IF;
   INSERT INTO public.reports(code,reporter_id,vehicle_id,plate_number,category,subject,description,evidence_urls)
    VALUES('LPR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),p_actor,nullif(p_input->>'vehicleId','')::uuid,p_input->>'plate',(p_input->>'category')::report_category,
    p_input->>'subject',p_input->>'description',ARRAY(SELECT jsonb_array_elements_text(coalesce(p_input->'evidence','[]')))) RETURNING * INTO rep;
   result:=to_jsonb(rep);
  ELSIF p_action='report_update' THEN
   IF actor.role<>'admin' OR length(trim(coalesce(p_input->>'response','')))<3 THEN RAISE EXCEPTION 'Akses admin dan tanggapan diperlukan'; END IF;
   UPDATE public.reports SET status=(p_input->>'status')::report_status WHERE id=(p_input->>'id')::uuid RETURNING * INTO rep;
   IF rep.id IS NULL THEN RAISE EXCEPTION 'Laporan tidak ditemukan'; END IF;
   INSERT INTO public.report_updates(report_id,admin_id,status,notes) VALUES(rep.id,p_actor,rep.status,p_input->>'response');
   INSERT INTO public.messages(sender_id,recipient_id,title,content) VALUES(p_actor,rep.reporter_id,'Laporan '||rep.code||': '||rep.status::text,p_input->>'response');
   result:=to_jsonb(rep);
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('updates',coalesce((SELECT jsonb_agg(to_jsonb(u) ORDER BY created_at) FROM public.report_updates u WHERE report_id=r.id),'[]')) ORDER BY r.created_at DESC),'[]') INTO result
    FROM public.reports r WHERE reporter_id=p_actor OR actor.role='admin';
  END IF;
 ELSIF p_action IN ('messages','message_read') THEN
  IF p_action='message_read' THEN UPDATE public.messages SET is_read=true WHERE recipient_id=p_actor AND (p_input->>'id' IS NULL OR id=(p_input->>'id')::uuid); END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY created_at DESC),'[]') INTO result FROM public.messages m WHERE recipient_id=p_actor;
 ELSIF p_action='progress' THEN
  IF actor.role<>'pengemudi' THEN RAISE EXCEPTION 'Akses pengemudi diperlukan'; END IF;
  UPDATE public.driver_duties SET distance_km=greatest(distance_km,(p_input->>'distanceKm')::float8) WHERE driver_id=p_actor AND finished_at IS NULL;
  UPDATE public.passenger_trips SET distance_km=greatest(distance_km,(p_input->>'offsetKm')::float8-start_offset_km) WHERE driver_id=p_actor AND status='active' AND chain_index=(p_input->>'chain')::integer;
  result:=jsonb_build_object('ok',true);
 ELSIF p_action='dashboard' THEN
  SELECT jsonb_build_object('distanceKm',coalesce(sum(distance_km),0),'duties',count(*)) INTO result FROM public.driver_duties WHERE driver_id=p_actor;
 ELSE RAISE EXCEPTION 'Perintah tidak dikenal';
 END IF;
 IF idempotency_key IS NOT NULL THEN INSERT INTO public.flow_idempotency(actor_id,action,key,result) VALUES(p_actor,p_action,idempotency_key,coalesce(result,'null')); END IF;
 RETURN coalesce(result,'null'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.flow_command(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flow_command(uuid,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.flow_public_stats() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('routes',(SELECT count(*) FROM public.routes WHERE is_active),
 'verifiedDrivers',(SELECT count(*) FROM public.driver_profiles WHERE verification_status='disetujui'),
 'reports',(SELECT count(*) FROM public.reports),'received',(SELECT count(*) FROM public.reports WHERE status='diterima'),
 'processing',(SELECT count(*) FROM public.reports WHERE status='diproses'),'resolved',(SELECT count(*) FROM public.reports WHERE status='selesai'));
$$;
REVOKE ALL ON FUNCTION public.flow_public_stats() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flow_public_stats() TO service_role;
COMMIT;
BEGIN;
-- Each disconnected chain stays separate; coordinates from the UI are [lat,lng].
CREATE TABLE public.route_segments (
 route_id text REFERENCES public.routes(id) ON DELETE CASCADE,
 segment_order integer CHECK(segment_order>=0),
 path geometry(LineString,4326) NOT NULL CHECK(ST_NPoints(path)>=2),
 PRIMARY KEY(route_id,segment_order)
);
CREATE INDEX route_segments_path_idx ON public.route_segments USING gist(path);
ALTER TABLE public.route_segments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.route_segments FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.route_segments TO service_role;
ALTER TABLE public.route_stops ADD CONSTRAINT route_stop_order_unique UNIQUE(route_id,stop_order);
ALTER TABLE public.route_stops ADD CONSTRAINT route_stop_order_positive CHECK(stop_order>=0);

CREATE FUNCTION public.sync_route_geometry(p_route text,p_segments jsonb,p_stops jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE chain jsonb; pt jsonb; stop jsonb; line geometry; coords geometry[]; n integer:=0;
BEGIN
 PERFORM 1 FROM public.routes WHERE id=p_route FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Route not found'; END IF;
 DELETE FROM public.route_segments WHERE route_id=p_route;
 FOR chain IN SELECT value FROM jsonb_array_elements(p_segments) LOOP
  coords:=ARRAY[]::geometry[];
  FOR pt IN SELECT value FROM jsonb_array_elements(chain) LOOP
   IF jsonb_array_length(pt)<>2 OR (pt->>0)::float8 NOT BETWEEN -90 AND 90 OR (pt->>1)::float8 NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid route coordinates'; END IF;
   coords:=array_append(coords,ST_SetSRID(ST_MakePoint((pt->>1)::float8,(pt->>0)::float8),4326));
  END LOOP;
  IF cardinality(coords)<2 THEN RAISE EXCEPTION 'Route chain must contain two points'; END IF;
  line:=ST_MakeLine(coords);
  INSERT INTO public.route_segments VALUES(p_route,n,line); n:=n+1;
 END LOOP;
 -- Keep stable stop IDs on repeated imports, scoped by direction and order.
 n:=0;
 FOR stop IN SELECT value FROM jsonb_array_elements(p_stops) LOOP
  pt:=stop->'position';
  IF jsonb_array_length(pt)<>2 OR (pt->>0)::float8 NOT BETWEEN -90 AND 90 OR (pt->>1)::float8 NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid stop coordinates'; END IF;
  INSERT INTO public.route_stops(route_id,name,stop_order,is_terminal,location)
   VALUES(p_route,stop->>'name',n,true,ST_SetSRID(ST_MakePoint((pt->>1)::float8,(pt->>0)::float8),4326))
   ON CONFLICT(route_id,stop_order) DO UPDATE SET name=EXCLUDED.name,location=EXCLUDED.location,is_terminal=true;
  n:=n+1;
 END LOOP;
 DELETE FROM public.route_stops WHERE route_id=p_route AND stop_order>=n;
 -- Compatibility cache; no artificial line joining disconnected chains.
 UPDATE public.routes SET segments=p_segments,polyline=coalesce(p_segments->0,'[]'),endstops=p_stops,
  path=CASE WHEN jsonb_array_length(p_segments)=1 THEN (SELECT path FROM public.route_segments WHERE route_id=p_route AND segment_order=0) ELSE NULL END,
  updated_at=now() WHERE id=p_route;
END $$;
REVOKE ALL ON FUNCTION public.sync_route_geometry(text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sync_route_geometry(text,jsonb,jsonb) TO service_role;
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM public.routes LOOP
  PERFORM public.sync_route_geometry(r.id,CASE WHEN jsonb_array_length(coalesce(r.segments,'[]'))>0 THEN r.segments WHEN jsonb_array_length(r.polyline)>1 THEN jsonb_build_array(r.polyline) ELSE '[]' END,r.endstops);
 END LOOP;
END $$;

ALTER TABLE public.driver_profiles ADD COLUMN address text;
ALTER TABLE public.driver_profiles ADD COLUMN sim_expires_at date;
UPDATE public.driver_profiles SET address=onboarding->>'address',sim_expires_at=CASE WHEN onboarding->>'simExpiry' ~ '^\d{4}-\d{2}-\d{2}$' AND pg_input_is_valid(onboarding->>'simExpiry','date') THEN (onboarding->>'simExpiry')::date END;
ALTER TABLE public.driver_documents ADD COLUMN vehicle_id uuid REFERENCES public.vehicles(id);
ALTER TABLE public.driver_documents ADD COLUMN superseded_at timestamptz;
WITH ranked AS (SELECT id,row_number() OVER(PARTITION BY driver_id,document_type ORDER BY uploaded_at DESC,id DESC) n FROM public.driver_documents WHERE document_type<>'foto_kendaraan')
 UPDATE public.driver_documents d SET superseded_at=now() FROM ranked r WHERE d.id=r.id AND r.n>1;
CREATE UNIQUE INDEX one_current_driver_document ON public.driver_documents(driver_id,document_type) WHERE superseded_at IS NULL AND document_type<>'foto_kendaraan';
CREATE FUNCTION public.current_document_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.driver_id::text,0));
 IF NEW.document_type<>'foto_kendaraan' AND NEW.superseded_at IS NULL THEN
  UPDATE public.driver_documents SET superseded_at=now() WHERE driver_id=NEW.driver_id AND document_type=NEW.document_type AND id<>NEW.id AND superseded_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER current_document_revision BEFORE INSERT ON public.driver_documents FOR EACH ROW EXECUTE FUNCTION public.current_document_revision();
REVOKE ALL ON FUNCTION public.current_document_revision() FROM PUBLIC,anon,authenticated;

ALTER TABLE public.vehicles ADD CONSTRAINT vehicle_capacity_range CHECK(capacity BETWEEN 1 AND 30);
ALTER TABLE public.driver_documents ADD CONSTRAINT document_size_positive CHECK(file_size IS NULL OR file_size>0);
ALTER TABLE public.passenger_requests ADD CONSTRAINT request_accuracy_positive CHECK(accuracy>=0 AND accuracy<'Infinity'::real);
UPDATE public.passenger_requests SET is_active=(status IN ('walking','searching','accepted')),mode=CASE WHEN status='walking' THEN 'jalan_kaki'::passenger_mode WHEN status IN ('searching','accepted') THEN 'mencari'::passenger_mode WHEN status='boarded' THEN 'perjalanan'::passenger_mode ELSE mode END;
ALTER TABLE public.passenger_requests ADD CONSTRAINT request_state_consistent CHECK(
 is_active=(status IN ('walking','searching','accepted')) AND
 (status<>'walking' OR mode='jalan_kaki') AND (status NOT IN ('searching','accepted') OR mode='mencari') AND (status<>'boarded' OR mode='perjalanan'));
ALTER TABLE public.passenger_requests ADD CONSTRAINT request_point_valid CHECK(ST_X(location) BETWEEN -180 AND 180 AND ST_Y(location) BETWEEN -90 AND 90);
ALTER TABLE public.passenger_trips ADD CONSTRAINT trip_distance_positive CHECK(distance_km>=0 AND distance_km<'Infinity'::float8 AND start_offset_km>=0 AND chain_index>=0);
ALTER TABLE public.passenger_trips ADD CONSTRAINT trip_time_consistent CHECK((status='active' AND finished_at IS NULL) OR (status='completed' AND finished_at IS NOT NULL AND finished_at>=started_at));
ALTER TABLE public.driver_duties ADD COLUMN vehicle_id uuid REFERENCES public.vehicles(id);
ALTER TABLE public.driver_duties ADD COLUMN route_id text REFERENCES public.routes(id);
ALTER TABLE public.driver_duties ADD COLUMN mode text NOT NULL DEFAULT 'offline' CHECK(mode IN ('narik','ngetem','istirahat','offline'));
UPDATE public.driver_duties d SET vehicle_id=p.vehicle_id,route_id=p.route_id FROM public.driver_profiles p WHERE p.id=d.driver_id;
ALTER TABLE public.driver_duties ADD CONSTRAINT duty_time_distance CHECK((finished_at IS NULL OR finished_at>=started_at) AND distance_km>=0 AND distance_km<'Infinity'::float8);
ALTER TABLE public.vehicle_positions ADD CONSTRAINT snapshot_values_valid CHECK(accuracy>=0 AND accuracy<'Infinity'::real AND speed_kph>=0 AND speed_kph<'Infinity'::real);
ALTER TABLE public.messages ADD COLUMN kind text NOT NULL DEFAULT 'system' CHECK(kind IN ('trip','report','system','admin'));
ALTER TABLE public.messages ADD COLUMN related_report_id uuid REFERENCES public.reports(id);

CREATE FUNCTION public.check_driver_assignment() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.vehicle_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.vehicles WHERE id=NEW.vehicle_id AND route_id=NEW.route_id) THEN RAISE EXCEPTION 'Assignment kendaraan dan arah trayek tidak sesuai'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER driver_assignment_consistent BEFORE INSERT OR UPDATE OF vehicle_id,route_id ON public.driver_profiles FOR EACH ROW EXECUTE FUNCTION public.check_driver_assignment();
CREATE FUNCTION public.check_request_assignment() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status='accepted' AND (NEW.matched_vehicle_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.driver_profiles d JOIN public.vehicles v ON v.id=d.vehicle_id WHERE d.vehicle_id=NEW.matched_vehicle_id AND d.route_id=NEW.route_id AND v.route_id=NEW.route_id AND d.verification_status='disetujui')) THEN RAISE EXCEPTION 'Kendaraan respons tidak sesuai'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER request_assignment_consistent BEFORE INSERT OR UPDATE OF status,matched_vehicle_id,route_id ON public.passenger_requests FOR EACH ROW EXECUTE FUNCTION public.check_request_assignment();
CREATE FUNCTION public.check_boarding_assignment() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.request_id IS NOT NULL AND NEW.status='active' THEN
  IF NOT EXISTS(SELECT 1 FROM public.passenger_requests r JOIN public.driver_profiles d ON d.id=NEW.driver_id JOIN public.vehicles v ON v.id=NEW.vehicle_id WHERE r.id=NEW.request_id AND r.passenger_id=NEW.passenger_id AND r.route_id=NEW.route_id AND d.vehicle_id=NEW.vehicle_id AND d.route_id=NEW.route_id AND v.route_id=NEW.route_id AND d.verification_status='disetujui' AND r.is_active AND r.expires_at>now() AND r.status IN ('searching','accepted') AND (r.status<>'accepted' OR r.matched_vehicle_id=NEW.vehicle_id)) THEN RAISE EXCEPTION 'Assignment boarding tidak sesuai'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER boarding_assignment_consistent BEFORE INSERT OR UPDATE OF request_id,passenger_id,driver_id,vehicle_id,route_id ON public.passenger_trips FOR EACH ROW EXECUTE FUNCTION public.check_boarding_assignment();
REVOKE ALL ON FUNCTION public.check_driver_assignment(),public.check_request_assignment(),public.check_boarding_assignment() FROM PUBLIC,anon,authenticated;

-- Extend the existing transactional command without duplicating its lifecycle implementation.
ALTER FUNCTION public.flow_command(uuid,text,jsonb) RENAME TO flow_command_v1;
CREATE FUNCTION public.flow_command(p_actor uuid,p_action text,p_input jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE result jsonb; target uuid; form jsonb; doc_row record; n integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 IF p_action='submit' OR (p_action='verify' AND p_input->>'status'='disetujui') THEN
  target:=CASE WHEN p_action='submit' THEN p_actor ELSE (p_input->>'id')::uuid END;
  SELECT onboarding INTO form FROM public.driver_profiles WHERE id=target;
  n:=0;
  FOR doc_row IN SELECT * FROM public.driver_documents WHERE driver_id=target AND superseded_at IS NULL AND document_type IN ('sim','stnk','kir','foto_kendaraan') LOOP
   IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='driver-documents' AND name=doc_row.file_path) THEN RAISE EXCEPTION 'Berkas dokumen tidak ditemukan di Storage'; END IF;
   IF doc_row.document_type='foto_kendaraan' THEN CONTINUE; END IF;
   IF doc_row.expires_at IS NOT NULL AND doc_row.expires_at<current_date THEN RAISE EXCEPTION 'Dokumen kedaluwarsa'; END IF;
  END LOOP;
  SELECT count(DISTINCT document_type) INTO n FROM public.driver_documents WHERE driver_id=target AND superseded_at IS NULL AND document_type IN ('sim','stnk','kir','foto_kendaraan');
  IF n<4 THEN RAISE EXCEPTION 'Unggah revisi aktif SIM, STNK, KIR dan foto'; END IF;
  IF nullif(form->>'simExpiry','')::date<current_date OR nullif(form->>'stnkExpiry','')::date<current_date OR nullif(form->>'kirExpiry','')::date<current_date THEN RAISE EXCEPTION 'Dokumen kedaluwarsa'; END IF;
 END IF;
 result:=public.flow_command_v1(p_actor,p_action,p_input);
 IF p_action IN ('submit','save_onboarding','verify') THEN
  target:=CASE WHEN p_action='verify' THEN (p_input->>'id')::uuid ELSE p_actor END;
  UPDATE public.driver_profiles SET address=onboarding->>'address',sim_expires_at=nullif(onboarding->>'simExpiry','')::date WHERE id=target;
  UPDATE public.driver_documents doc SET vehicle_id=CASE WHEN document_type IN ('stnk','kir','foto_kendaraan') THEN dp.vehicle_id ELSE NULL END,
   expires_at=CASE document_type WHEN 'sim' THEN nullif(dp.onboarding->>'simExpiry','')::date WHEN 'stnk' THEN nullif(dp.onboarding->>'stnkExpiry','')::date WHEN 'kir' THEN nullif(dp.onboarding->>'kirExpiry','')::date ELSE doc.expires_at END
   FROM public.driver_profiles dp WHERE dp.id=target AND doc.driver_id=target AND doc.superseded_at IS NULL;
 END IF;
 IF p_action='duty' THEN
  UPDATE public.driver_duties d SET vehicle_id=p.vehicle_id,route_id=p.route_id,mode=p_input->>'mode' FROM public.driver_profiles p WHERE p.id=p_actor AND d.driver_id=p_actor AND (d.finished_at IS NULL OR d.finished_at>=transaction_timestamp());
 END IF;
 IF p_action IN ('onboarding','assignment','document','submit','save_onboarding') THEN
  result:=jsonb_set(result,'{documents}',coalesce((SELECT jsonb_agg(jsonb_build_object('id',doc.id,'type',doc.document_type,'name',doc.file_name,'size',doc.file_size,'uploadedAt',doc.uploaded_at,'expiresAt',doc.expires_at)) FROM public.driver_documents doc WHERE driver_id=p_actor AND superseded_at IS NULL),'[]'));
 END IF;
 IF p_action='applicants' THEN
  SELECT coalesce(jsonb_agg(item || jsonb_build_object('documents',coalesce((SELECT jsonb_agg(to_jsonb(doc)) FROM public.driver_documents doc WHERE driver_id=(item->>'id')::uuid AND superseded_at IS NULL),'[]'))),'[]') INTO result FROM jsonb_array_elements(result) item;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.flow_command(uuid,text,jsonb),public.flow_command_v1(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flow_command(uuid,text,jsonb) TO service_role;

-- The tracker is single-process for MVP. A restart ends persisted duties; GPS must be acquired again.
CREATE FUNCTION public.reset_runtime_state() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 UPDATE public.driver_duties SET finished_at=greatest(now(),started_at),mode='offline' WHERE finished_at IS NULL;
 UPDATE public.driver_profiles SET is_active_duty=false WHERE is_active_duty;
 UPDATE public.vehicles SET status='offline' WHERE status<>'offline';
 DELETE FROM public.live_locations WHERE true;
END $$;
REVOKE ALL ON FUNCTION public.reset_runtime_state() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reset_runtime_state() TO service_role;
COMMIT;
BEGIN;
-- Browser roles can read the catalog, but every write must use the atomic API command.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.routes,public.route_stops FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.routes,public.route_stops TO anon,authenticated;
-- Read geometry from normalized chains/stops, never the legacy JSON cache.
CREATE FUNCTION public.route_catalog() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
 SELECT coalesce(jsonb_agg(item ORDER BY item->>'code',item->>'id'),'[]') FROM (
 SELECT jsonb_build_object('id',r.id,'code',r.code,'name',r.name,'origin',r.origin,'destination',r.destination,'color',r.color,
 'isActive',r.is_active,'updatedAt',r.updated_at,'fareStandard',r.fare_standard,'fareStudent',r.fare_student,
 'streets',coalesce(to_jsonb(r.streets),'[]'),'streetRuns',coalesce(r.street_runs,'[]'),
 'segments',coalesce(chains.lines,'[]'),'polyline',coalesce(chains.lines->0,'[]'),
 'lengthKm',coalesce(chains.km,0),'registeredVehicles',(SELECT count(*) FROM public.vehicles WHERE route_id=r.id),
 'endstops',coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'position',jsonb_build_array(ST_Y(s.location),ST_X(s.location)),'isTerminal',s.is_terminal) ORDER BY stop_order) FROM public.route_stops s WHERE s.route_id=r.id),'[]')) item
 FROM public.routes r LEFT JOIN LATERAL (
  SELECT jsonb_agg(points ORDER BY segment_order) lines,sum(ST_Length(path::geography))/1000 km FROM (
   SELECT s.segment_order,s.path,(SELECT jsonb_agg(jsonb_build_array(ST_Y(p.geom),ST_X(p.geom)) ORDER BY p.path) FROM ST_DumpPoints(s.path) p) points
   FROM public.route_segments s WHERE s.route_id=r.id
  ) x
 ) chains ON true
 ) catalog;
$$;
REVOKE ALL ON FUNCTION public.route_catalog() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.route_catalog() TO service_role;

-- Keep stop IDs when reordering, and distinguish intermediate stops from terminals.
CREATE OR REPLACE FUNCTION public.sync_route_geometry(p_route text,p_segments jsonb,p_stops jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE chain jsonb; pt jsonb; stop jsonb; coords geometry[]; n integer:=0; ids uuid[]; stop_id uuid;
BEGIN
 PERFORM 1 FROM public.routes WHERE id=p_route FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Trayek tidak ditemukan'; END IF;
 IF jsonb_typeof(p_segments) IS DISTINCT FROM 'array' OR jsonb_array_length(p_segments)=0 THEN RAISE EXCEPTION 'Segmen trayek wajib diisi'; END IF;
 IF jsonb_typeof(p_stops) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Daftar halte tidak valid'; END IF;
 DELETE FROM public.route_segments WHERE route_id=p_route;
 FOR chain IN SELECT value FROM jsonb_array_elements(p_segments) LOOP
  coords:=ARRAY[]::geometry[];
  FOR pt IN SELECT value FROM jsonb_array_elements(chain) LOOP
   IF jsonb_typeof(pt)<>'array' OR jsonb_array_length(pt)<>2 OR jsonb_typeof(pt->0)<>'number' OR jsonb_typeof(pt->1)<>'number' OR (pt->>0)::float8 NOT BETWEEN -90 AND 90 OR (pt->>1)::float8 NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Koordinat trayek tidak valid'; END IF;
   coords:=array_append(coords,ST_SetSRID(ST_MakePoint((pt->>1)::float8,(pt->>0)::float8),4326));
  END LOOP;
  IF cardinality(coords)<2 THEN RAISE EXCEPTION 'Setiap segmen memerlukan minimal dua titik'; END IF;
  INSERT INTO public.route_segments VALUES(p_route,n,ST_MakeLine(coords)); n:=n+1;
 END LOOP;
 SELECT array_agg(id ORDER BY stop_order) INTO ids FROM public.route_stops WHERE route_id=p_route;
 DELETE FROM public.route_stops WHERE route_id=p_route;
 n:=0;
 FOR stop IN SELECT value FROM jsonb_array_elements(p_stops) LOOP
  pt:=stop->'position';
  IF coalesce(trim(stop->>'name'),'')='' OR jsonb_typeof(pt)<>'array' OR jsonb_array_length(pt)<>2 OR jsonb_typeof(pt->0)<>'number' OR jsonb_typeof(pt->1)<>'number' OR (pt->>0)::float8 NOT BETWEEN -90 AND 90 OR (pt->>1)::float8 NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Nama/koordinat halte tidak valid'; END IF;
  stop_id:=CASE WHEN stop->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (stop->>'id')::uuid ELSE coalesce(ids[n+1],gen_random_uuid()) END;
  INSERT INTO public.route_stops(id,route_id,name,stop_order,is_terminal,location)
   VALUES(stop_id,p_route,trim(stop->>'name'),n,coalesce((stop->>'isTerminal')::boolean,n=0 OR n=jsonb_array_length(p_stops)-1),ST_SetSRID(ST_MakePoint((pt->>1)::float8,(pt->>0)::float8),4326)); n:=n+1;
 END LOOP;
 UPDATE public.routes SET segments=p_segments,polyline=p_segments->0,endstops=p_stops,
  path=CASE WHEN jsonb_array_length(p_segments)=1 THEN (SELECT path FROM public.route_segments WHERE route_id=p_route AND segment_order=0) ELSE NULL END,updated_at=clock_timestamp() WHERE id=p_route;
END $$;

CREATE FUNCTION public.admin_route_command(p_actor uuid,p_action text,p_id text,p_input jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE old public.routes; changed boolean; result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND role='admin') THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('route:'||p_id,0));
 SELECT * INTO old FROM public.routes WHERE id=p_id FOR UPDATE;
 IF p_action IN ('update','delete') AND old.id IS NULL THEN RAISE EXCEPTION 'Trayek tidak ditemukan'; END IF;
 IF old.id IS NOT NULL AND p_action='create' THEN RAISE EXCEPTION 'ID trayek sudah digunakan'; END IF;
 IF old.id IS NOT NULL AND (p_input->>'updatedAt')::timestamptz IS DISTINCT FROM old.updated_at THEN RAISE EXCEPTION 'Trayek telah berubah; muat ulang sebelum menyimpan'; END IF;
 IF p_action='delete' THEN
  IF EXISTS(SELECT 1 FROM public.vehicles WHERE route_id=p_id) OR EXISTS(SELECT 1 FROM public.driver_profiles WHERE route_id=p_id)
   OR EXISTS(SELECT 1 FROM public.passenger_requests WHERE route_id=p_id) OR EXISTS(SELECT 1 FROM public.passenger_trips WHERE route_id=p_id)
   OR EXISTS(SELECT 1 FROM public.driver_duties WHERE route_id=p_id) THEN RAISE EXCEPTION 'Trayek memiliki referensi atau histori; nonaktifkan trayek untuk mempertahankan data'; END IF;
  DELETE FROM public.routes WHERE id=p_id;
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF p_action NOT IN ('create','update') THEN RAISE EXCEPTION 'Operasi trayek tidak valid'; END IF;
 IF p_id !~ '^[A-Za-z0-9_-]{1,80}$' OR length(trim(coalesce(p_input->>'code',''))) NOT BETWEEN 1 AND 12
  OR length(trim(coalesce(p_input->>'name',''))) NOT BETWEEN 1 AND 160 OR coalesce(trim(p_input->>'origin'),'')='' OR coalesce(trim(p_input->>'destination'),'')=''
  OR coalesce(p_input->>'color','') !~ '^#[0-9a-fA-F]{6}$' OR (p_input->>'fareStandard')::int<0 OR (p_input->>'fareStudent')::int<0 THEN RAISE EXCEPTION 'Lengkapi kode, nama, asal, tujuan, warna dan tarif yang valid'; END IF;
 changed:=old.id IS NOT NULL AND (old.segments IS DISTINCT FROM p_input->'segments' OR old.is_active IS DISTINCT FROM coalesce((p_input->>'isActive')::boolean,true));
 IF old.id IS NOT NULL AND old.segments IS DISTINCT FROM p_input->'segments' AND EXISTS(SELECT 1 FROM public.passenger_trips WHERE route_id=p_id AND status='active') THEN RAISE EXCEPTION 'Selesaikan perjalanan aktif sebelum mengubah geometri'; END IF;
 INSERT INTO public.routes(id,code,name,origin,destination,color,is_active,fare_standard,fare_student,streets,street_runs)
 VALUES(p_id,trim(p_input->>'code'),trim(p_input->>'name'),trim(p_input->>'origin'),trim(p_input->>'destination'),p_input->>'color',coalesce((p_input->>'isActive')::boolean,true),coalesce((p_input->>'fareStandard')::int,5000),coalesce((p_input->>'fareStudent')::int,3000),ARRAY(SELECT jsonb_array_elements_text(coalesce(p_input->'streets','[]'))),coalesce(p_input->'streetRuns','[]'))
 ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,name=EXCLUDED.name,origin=EXCLUDED.origin,destination=EXCLUDED.destination,color=EXCLUDED.color,is_active=EXCLUDED.is_active,fare_standard=EXCLUDED.fare_standard,fare_student=EXCLUDED.fare_student,streets=CASE WHEN public.routes.segments IS DISTINCT FROM p_input->'segments' THEN ARRAY[]::text[] ELSE EXCLUDED.streets END,
 street_runs=CASE WHEN public.routes.segments IS DISTINCT FROM p_input->'segments' THEN '[]'::jsonb ELSE EXCLUDED.street_runs END;
 PERFORM public.sync_route_geometry(p_id,p_input->'segments',coalesce(p_input->'endstops','[]'));
 IF changed THEN
  UPDATE public.driver_duties SET finished_at=greatest(started_at,now()),mode='offline' WHERE finished_at IS NULL AND route_id=p_id;
  UPDATE public.driver_profiles SET is_active_duty=false WHERE route_id=p_id;
  UPDATE public.vehicles SET status='offline' WHERE route_id=p_id;
  DELETE FROM public.live_locations WHERE vehicle_id IN (SELECT id FROM public.vehicles WHERE route_id=p_id);
  UPDATE public.passenger_requests SET status='cancelled',is_active=false,revision=revision+1 WHERE route_id=p_id AND is_active;
 END IF;
 SELECT value INTO result FROM jsonb_array_elements(public.route_catalog()) WHERE value->>'id'=p_id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_route_command(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_route_command(uuid,text,text,jsonb) TO service_role;

-- Lock the selected route during transitions so deactivation cannot race with a new duty/boarding.
ALTER FUNCTION public.flow_command(uuid,text,jsonb) RENAME TO flow_command_s1;
CREATE FUNCTION public.flow_command(p_actor uuid,p_action text,p_input jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE route_id text; enabled boolean; cached jsonb;
BEGIN
 IF nullif(p_input->>'key','') IS NOT NULL THEN
  SELECT f.result INTO cached FROM public.flow_idempotency f WHERE f.actor_id=p_actor AND f.action=p_action AND f.key=p_input->>'key';
  IF cached IS NOT NULL THEN RETURN cached; END IF;
 END IF;
 IF p_action='board' AND EXISTS(SELECT 1 FROM public.passenger_trips WHERE request_id=(p_input->>'id')::uuid AND passenger_id=p_actor) THEN RETURN public.flow_command_s1(p_actor,p_action,p_input); END IF;
 IF p_action='request' THEN route_id:=p_input->>'routeId';
 ELSIF p_action='duty' AND p_input->>'mode' IN ('narik','ngetem') THEN SELECT d.route_id INTO route_id FROM public.driver_profiles d WHERE id=p_actor;
 ELSIF p_action='verify' AND p_input->>'status'='disetujui' THEN SELECT onboarding->>'routeId' INTO route_id FROM public.driver_profiles WHERE id=(p_input->>'id')::uuid;
 ELSIF p_action IN ('board','respond') THEN SELECT r.route_id INTO route_id FROM public.passenger_requests r WHERE id=(p_input->>'id')::uuid;
 END IF;
 IF route_id IS NOT NULL THEN
  SELECT is_active INTO enabled FROM public.routes r WHERE r.id=route_id FOR SHARE;
  IF enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'Trayek tidak aktif atau tidak tersedia'; END IF;
 END IF;
 RETURN public.flow_command_s1(p_actor,p_action,p_input);
END $$;
REVOKE ALL ON FUNCTION public.flow_command(uuid,text,jsonb),public.flow_command_s1(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flow_command(uuid,text,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.flow_public_stats() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT jsonb_build_object('routes',(SELECT count(*) FROM public.routes WHERE is_active),
 'routeCodes',(SELECT count(DISTINCT code) FROM public.routes WHERE is_active),'totalVehicles',(SELECT count(*) FROM public.vehicles),
 'verifiedDrivers',(SELECT count(*) FROM public.driver_profiles WHERE verification_status='disetujui'),
 'reports',(SELECT count(*) FROM public.reports),'received',(SELECT count(*) FROM public.reports WHERE status='diterima'),
 'processing',(SELECT count(*) FROM public.reports WHERE status='diproses'),'resolved',(SELECT count(*) FROM public.reports WHERE status='selesai'));
$$;
CREATE FUNCTION public.admin_dashboard(p_actor uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND role='admin') THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
 RETURN public.flow_public_stats() || jsonb_build_object('pendingDrivers',(SELECT count(*) FROM public.driver_profiles WHERE verification_status='menunggu' AND submitted_at IS NOT NULL),
 'queue',coalesce((SELECT jsonb_agg(row_to_json(q)) FROM (SELECT d.id,p.name,d.onboarding->>'routeId' AS "routeId",d.submitted_at AS "submittedAt" FROM public.driver_profiles d JOIN public.profiles p ON p.id=d.id WHERE d.verification_status='menunggu' AND d.submitted_at IS NOT NULL ORDER BY d.submitted_at LIMIT 5) q),'[]'),
 'latestReports',coalesce((SELECT jsonb_agg(row_to_json(q)) FROM (SELECT id,code,subject,plate_number,status,created_at FROM public.reports ORDER BY created_at DESC LIMIT 5) q),'[]'));
END $$;
REVOKE ALL ON FUNCTION public.admin_dashboard(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard(uuid) TO service_role;
COMMIT;
BEGIN;
ALTER TABLE public.driver_duties ADD COLUMN session_id text;
ALTER TABLE public.driver_duties ADD COLUMN end_reason text;
-- Pre-upgrade duties have no publisher identity and must acquire a new session.
UPDATE public.driver_duties SET finished_at=greatest(now(),started_at),mode='offline',end_reason='upgrade' WHERE finished_at IS NULL;
UPDATE public.driver_profiles SET is_active_duty=false WHERE is_active_duty;

CREATE FUNCTION public.tracking_authorizations() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('driverId',d.id,'vehicleId',v.id,'routeId',r.id,'session',duty.session_id)),'[]')
 FROM public.driver_profiles d JOIN public.profiles p ON p.id=d.id AND p.role='pengemudi'
 JOIN auth.users u ON u.id=d.id AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())
 JOIN public.vehicles v ON v.id=d.vehicle_id AND v.route_id=d.route_id
 JOIN public.routes r ON r.id=d.route_id AND r.is_active
 JOIN public.driver_duties duty ON duty.driver_id=d.id AND duty.finished_at IS NULL AND duty.session_id IS NOT NULL
 WHERE d.verification_status='disetujui' AND d.is_active_duty;
$$;
CREATE FUNCTION public.end_tracking(p_actor uuid,p_session text,p_distance double precision,p_reason text DEFAULT 'offline') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 UPDATE public.driver_duties SET finished_at=greatest(now(),started_at),distance_km=greatest(distance_km,coalesce(p_distance,0)),mode='offline',end_reason=p_reason
 WHERE driver_id=p_actor AND finished_at IS NULL AND (p_session IS NULL OR session_id=p_session);
 UPDATE public.driver_profiles SET is_active_duty=false WHERE id=p_actor AND NOT EXISTS(SELECT 1 FROM public.driver_duties WHERE driver_id=p_actor AND finished_at IS NULL);
 DELETE FROM public.live_locations WHERE driver_id=p_actor AND NOT EXISTS(SELECT 1 FROM public.driver_duties WHERE driver_id=p_actor AND finished_at IS NULL);
END $$;

ALTER FUNCTION public.flow_command(uuid,text,jsonb) RENAME TO flow_command_s2;
CREATE FUNCTION public.flow_command(p_actor uuid,p_action text,p_input jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; current_session text; requested_mode text:=p_input->>'mode';
BEGIN
 IF p_action='duty' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_actor AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<=now())) THEN RAISE EXCEPTION 'Akun pengemudi tidak aktif'; END IF;
  IF length(coalesce(p_input->>'session','')) NOT BETWEEN 8 AND 100 THEN RAISE EXCEPTION 'Sesi tugas tidak valid'; END IF;
  SELECT session_id INTO current_session FROM public.driver_duties WHERE driver_id=p_actor AND finished_at IS NULL FOR UPDATE;
  IF requested_mode IN ('narik','ngetem') AND current_session IS NOT NULL AND current_session<>p_input->>'session' THEN RAISE EXCEPTION 'Sesi tugas aktif pada perangkat lain'; END IF;
 END IF;
 IF p_action='progress' AND NOT EXISTS(SELECT 1 FROM public.driver_duties WHERE driver_id=p_actor AND finished_at IS NULL AND session_id=p_input->>'session') THEN RETURN jsonb_build_object('ok',false); END IF;
 result:=public.flow_command_s2(p_actor,p_action,p_input);
 IF p_action='duty' THEN
  UPDATE public.driver_duties SET session_id=p_input->>'session',mode=requested_mode WHERE driver_id=p_actor AND finished_at IS NULL;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.tracking_authorizations(),public.end_tracking(uuid,text,double precision,text),public.flow_command(uuid,text,jsonb),public.flow_command_s2(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.tracking_authorizations(),public.end_tracking(uuid,text,double precision,text),public.flow_command(uuid,text,jsonb) TO service_role;
COMMIT;
BEGIN;
-- Explicit provenance for the local-only simulator requested for testing.
ALTER TABLE public.driver_duties ADD COLUMN telemetry_source text NOT NULL DEFAULT 'gps' CHECK(telemetry_source IN ('gps','simulation'));
ALTER TABLE public.vehicle_positions ADD COLUMN telemetry_source text NOT NULL DEFAULT 'gps' CHECK(telemetry_source IN ('gps','simulation'));
ALTER FUNCTION public.flow_command(uuid,text,jsonb) RENAME TO flow_command_s3;
CREATE FUNCTION public.flow_command(p_actor uuid,p_action text,p_input jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; source text:=coalesce(p_input->>'telemetrySource','gps'); previous_source text;
BEGIN
 IF p_action='duty' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
  IF source NOT IN ('gps','simulation') THEN RAISE EXCEPTION 'Sumber posisi tidak valid'; END IF;
  SELECT telemetry_source INTO previous_source FROM public.driver_duties WHERE driver_id=p_actor AND finished_at IS NULL FOR UPDATE;
  IF p_input->>'mode' IN ('narik','ngetem') AND previous_source IS NOT NULL AND previous_source<>source THEN RAISE EXCEPTION 'Pilih Offline sebelum mengganti sumber posisi'; END IF;
 END IF;
 result:=public.flow_command_s3(p_actor,p_action,p_input);
 IF p_action='duty' THEN
  UPDATE public.driver_duties SET telemetry_source=source WHERE driver_id=p_actor AND finished_at IS NULL;
 ELSIF p_action='dashboard' THEN
  -- Test shifts must never inflate the driver's operational summary.
  SELECT jsonb_build_object('distanceKm',coalesce(sum(distance_km),0),'duties',count(*)) INTO result FROM public.driver_duties WHERE driver_id=p_actor AND telemetry_source='gps';
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.flow_command(uuid,text,jsonb),public.flow_command_s3(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flow_command(uuid,text,jsonb) TO service_role;
COMMIT;
BEGIN;
CREATE TABLE public.notification_preferences (
 profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 report_updates boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_preferences FROM PUBLIC,anon,authenticated;
ALTER TABLE public.passenger_trips ADD COLUMN telemetry_source text NOT NULL DEFAULT 'gps' CHECK(telemetry_source IN ('gps','simulation'));

ALTER FUNCTION public.flow_command(uuid,text,jsonb) RENAME TO flow_command_s4_base;
CREATE FUNCTION public.flow_command(p_actor uuid,p_action text,p_input jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor_role public.user_role; result jsonb; cached jsonb; rep public.reports; target_status public.report_status; evidence text; request_key text:=nullif(p_input->>'key','');
BEGIN
 SELECT role INTO actor_role FROM public.profiles WHERE id=p_actor;
 IF actor_role IS NULL THEN RAISE EXCEPTION 'Profil tidak ditemukan'; END IF;
 IF p_action='report_update' AND actor_role<>'admin' THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
 IF p_action IN ('report','preferences','preferences_update') AND actor_role<>'penumpang' THEN RAISE EXCEPTION 'Akses penumpang diperlukan'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 IF request_key IS NOT NULL THEN
  SELECT f.result INTO cached FROM public.flow_idempotency f WHERE f.actor_id=p_actor AND f.action=p_action AND f.key=request_key;
  IF FOUND THEN RETURN cached; END IF;
 END IF;
 IF p_action IN ('preferences','preferences_update') THEN
  INSERT INTO public.notification_preferences(profile_id) VALUES(p_actor) ON CONFLICT DO NOTHING;
  IF p_action='preferences_update' THEN
   IF jsonb_typeof(p_input->'report_updates') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Preferensi laporan harus berupa boolean'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_input) k WHERE k NOT IN ('report_updates','key')) THEN RAISE EXCEPTION 'Preferensi belum didukung'; END IF;
   UPDATE public.notification_preferences SET report_updates=(p_input->>'report_updates')::boolean,updated_at=now() WHERE profile_id=p_actor;
  END IF;
  SELECT jsonb_build_object('report_updates',report_updates,'updated_at',updated_at) INTO result FROM public.notification_preferences WHERE profile_id=p_actor;
 ELSIF p_action='report_update' THEN
  SELECT * INTO rep FROM public.reports WHERE id=(p_input->>'id')::uuid FOR UPDATE;
  IF rep.id IS NULL THEN RAISE EXCEPTION 'Laporan tidak ditemukan'; END IF;
  IF p_input ? 'expectedStatus' AND rep.status::text<>p_input->>'expectedStatus' THEN RAISE EXCEPTION 'Status laporan telah berubah. Muat ulang sebelum menyimpan'; END IF;
  target_status:=(p_input->>'status')::public.report_status;
  IF target_status IS NULL OR (rep.status='diterima' AND target_status NOT IN ('diterima','diproses')) OR (rep.status='diproses' AND target_status NOT IN ('diproses','selesai')) OR (rep.status='selesai' AND target_status<>'selesai') THEN RAISE EXCEPTION 'Status laporan harus berurutan: diterima, diproses, selesai'; END IF;
  IF length(trim(coalesce(p_input->>'response',''))) NOT BETWEEN 3 AND 4000 THEN RAISE EXCEPTION 'Tanggapan harus 3 sampai 4000 karakter'; END IF;
  UPDATE public.reports SET status=target_status WHERE id=rep.id RETURNING * INTO rep;
  INSERT INTO public.report_updates(report_id,admin_id,status,notes) VALUES(rep.id,p_actor,rep.status,trim(p_input->>'response'));
  IF coalesce((SELECT report_updates FROM public.notification_preferences WHERE profile_id=rep.reporter_id),true) THEN
   INSERT INTO public.messages(sender_id,recipient_id,title,content,kind,related_report_id) VALUES(p_actor,rep.reporter_id,'Laporan '||rep.code||': '||rep.status::text,trim(p_input->>'response'),'report',rep.id);
  END IF;
  result:=to_jsonb(rep);
 ELSE
  IF p_action='report' THEN
   IF length(coalesce(p_input->>'description',''))>5000 OR length(coalesce(p_input->>'subject',''))>200 THEN RAISE EXCEPTION 'Judul atau kronologi terlalu panjang'; END IF;
   IF jsonb_typeof(coalesce(p_input->'evidence','[]'))<>'array' OR jsonb_array_length(coalesce(p_input->'evidence','[]'))>5 THEN RAISE EXCEPTION 'Maksimal lima bukti'; END IF;
   FOR evidence IN SELECT jsonb_array_elements_text(coalesce(p_input->'evidence','[]')) LOOP
    IF evidence NOT LIKE p_actor::text||'/%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='report-evidence' AND name=evidence) THEN RAISE EXCEPTION 'Bukti bukan milik akun ini atau tidak ditemukan di Storage'; END IF;
   END LOOP;
  END IF;
  result:=public.flow_command_s4_base(p_actor,p_action,p_input);
  IF p_action='board' AND result->>'id' IS NOT NULL THEN
   UPDATE public.passenger_trips t SET telemetry_source=d.telemetry_source FROM public.driver_duties d WHERE t.id=(result->>'id')::uuid AND d.driver_id=t.driver_id AND d.finished_at IS NULL;
   SELECT to_jsonb(t) INTO result FROM public.passenger_trips t WHERE id=(result->>'id')::uuid;
   -- Qualify the PL/pgSQL value to avoid shadowing the column named result.
   IF request_key IS NOT NULL THEN UPDATE public.flow_idempotency f SET result=(SELECT to_jsonb(t) FROM public.passenger_trips t WHERE id=(f.result->>'id')::uuid) WHERE f.actor_id=p_actor AND f.action=p_action AND f.key=request_key; END IF;
  END IF;
  RETURN result;
 END IF;
 IF request_key IS NOT NULL THEN INSERT INTO public.flow_idempotency(actor_id,action,key,result) VALUES(p_actor,p_action,request_key,result); END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.flow_command(uuid,text,jsonb),public.flow_command_s4_base(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flow_command(uuid,text,jsonb) TO service_role;
COMMIT;
BEGIN;
ALTER FUNCTION public.flow_command(uuid,text,jsonb) RENAME TO flow_command_s5_base;
CREATE FUNCTION public.flow_command(p_actor uuid,p_action text,p_input jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result jsonb; previous_trip uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 IF p_action='board' THEN
  SELECT id INTO previous_trip FROM public.passenger_trips WHERE passenger_id=p_actor AND request_id=nullif(p_input->>'id','')::uuid;
 END IF;
 IF p_action='report' AND nullif(trim(p_input->>'plate'),'') IS NULL AND nullif(p_input->>'vehicleId','') IS NOT NULL THEN
  p_input:=jsonb_set(p_input,'{plate}',coalesce((SELECT to_jsonb(plate_number) FROM public.vehicles WHERE id=(p_input->>'vehicleId')::uuid),'null'));
 END IF;
 result:=public.flow_command_s5_base(p_actor,p_action,p_input);
 IF p_action='board' AND previous_trip IS NULL AND result->>'id' IS NOT NULL THEN
  -- Snapshot the canonical fare once. Retrying after a route edit preserves it.
  UPDATE public.passenger_trips t SET fare=r.fare_standard FROM public.routes r WHERE t.id=(result->>'id')::uuid AND r.id=t.route_id;
  SELECT to_jsonb(t) INTO result FROM public.passenger_trips t WHERE id=(result->>'id')::uuid;
  IF nullif(p_input->>'key','') IS NOT NULL THEN
   UPDATE public.flow_idempotency f SET result=(SELECT to_jsonb(t) FROM public.passenger_trips t WHERE id=(f.result->>'id')::uuid) WHERE f.actor_id=p_actor AND f.action=p_action AND f.key=p_input->>'key';
  END IF;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.flow_command(uuid,text,jsonb),public.flow_command_s5_base(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flow_command(uuid,text,jsonb) TO service_role;
COMMIT;
