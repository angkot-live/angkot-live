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
