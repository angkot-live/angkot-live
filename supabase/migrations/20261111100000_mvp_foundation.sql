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
