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
