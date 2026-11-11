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
