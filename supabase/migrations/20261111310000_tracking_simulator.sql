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
