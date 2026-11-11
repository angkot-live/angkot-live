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
