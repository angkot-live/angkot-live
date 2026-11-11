BEGIN;
DO $$
DECLARE driver_actor uuid; duty_id uuid; authorizations jsonb; before_distance double precision;
BEGIN
 ASSERT NOT has_function_privilege('anon','public.tracking_authorizations()','EXECUTE');
 ASSERT NOT has_function_privilege('authenticated','public.end_tracking(uuid,text,double precision,text)','EXECUTE');
 SELECT id INTO driver_actor FROM public.driver_profiles WHERE verification_status='disetujui' AND vehicle_id IS NOT NULL LIMIT 1;
 PERFORM public.flow_command(driver_actor,'duty','{"mode":"narik","session":"sprint3-sql-first"}');
 SELECT id INTO duty_id FROM public.driver_duties WHERE driver_id=driver_actor AND finished_at IS NULL;
 ASSERT (SELECT session_id='sprint3-sql-first' AND mode='narik' FROM public.driver_duties WHERE id=duty_id);
 authorizations:=public.tracking_authorizations();
 ASSERT EXISTS(SELECT 1 FROM jsonb_array_elements(authorizations) a WHERE a->>'driverId'=driver_actor::text AND a->>'session'='sprint3-sql-first');
 BEGIN
  PERFORM public.flow_command(driver_actor,'duty','{"mode":"narik","session":"sprint3-sql-other"}');
  RAISE EXCEPTION 'Other session was accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%perangkat lain%' THEN RAISE; END IF; END;
 PERFORM public.flow_command(driver_actor,'progress','{"session":"sprint3-sql-other","distanceKm":99,"offsetKm":0,"chain":0}');
 ASSERT (SELECT distance_km=0 FROM public.driver_duties WHERE id=duty_id),'Old progress changed active duty';
 PERFORM public.end_tracking(driver_actor,'sprint3-sql-other',99,'gps_timeout');
 ASSERT (SELECT finished_at IS NULL FROM public.driver_duties WHERE id=duty_id),'Old timeout closed replacement duty';
 UPDATE public.driver_profiles SET verification_status='menunggu' WHERE id=driver_actor;
 ASSERT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.tracking_authorizations()) a WHERE a->>'driverId'=driver_actor::text);
 UPDATE public.driver_profiles SET verification_status='disetujui' WHERE id=driver_actor;
 UPDATE auth.users SET banned_until=now()+interval '1 hour' WHERE id=driver_actor;
 ASSERT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.tracking_authorizations()) a WHERE a->>'driverId'=driver_actor::text);
 UPDATE auth.users SET banned_until=NULL WHERE id=driver_actor;
 PERFORM public.end_tracking(driver_actor,'sprint3-sql-first',1.25,'gps_timeout');
 ASSERT (SELECT finished_at IS NOT NULL AND end_reason='gps_timeout' AND distance_km=1.25 FROM public.driver_duties WHERE id=duty_id);
 ASSERT (SELECT NOT is_active_duty FROM public.driver_profiles WHERE id=driver_actor);
 before_distance:=(public.flow_command(driver_actor,'dashboard','{}')->>'distanceKm')::float8;
 PERFORM public.flow_command(driver_actor,'duty','{"mode":"narik","session":"sprint3-sql-simulation","telemetrySource":"simulation"}');
 ASSERT (SELECT telemetry_source='simulation' FROM public.driver_duties WHERE driver_id=driver_actor AND finished_at IS NULL);
 PERFORM public.flow_command(driver_actor,'progress','{"session":"sprint3-sql-simulation","distanceKm":999,"offsetKm":0,"chain":0}');
 ASSERT (public.flow_command(driver_actor,'dashboard','{}')->>'distanceKm')::float8=before_distance,'Simulation inflated operational distance';
 BEGIN
  PERFORM public.flow_command(driver_actor,'duty','{"mode":"narik","session":"sprint3-sql-simulation","telemetrySource":"gps"}');
  RAISE EXCEPTION 'Source changed during duty';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%Offline%' THEN RAISE; END IF; END;
 PERFORM public.end_tracking(driver_actor,'sprint3-sql-simulation',999,'offline');
 RAISE NOTICE 'PASS Sprint 3 SQL: session ownership, revoked/banned auth, old progress/timeout isolation, final distance and grants';
END $$;
ROLLBACK;
