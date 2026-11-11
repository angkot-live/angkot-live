BEGIN;
DO $$
DECLARE admin_id uuid;driver_actor uuid;pax_id uuid;other_pax uuid;waiting jsonb;v uuid;r jsonb;old_version jsonb;req jsonb;t jsonb;payload jsonb;
BEGIN
 ASSERT NOT has_table_privilege('authenticated','public.routes','UPDATE'),'Direct route mutation still granted';
 ASSERT NOT has_table_privilege('authenticated','public.route_stops','INSERT'),'Direct stop mutation still granted';
 SELECT id INTO admin_id FROM public.profiles WHERE role='admin' LIMIT 1;
 SELECT id INTO driver_actor FROM public.driver_profiles WHERE verification_status='disetujui' LIMIT 1;
 SELECT id INTO pax_id FROM public.profiles WHERE role='penumpang' LIMIT 1;
 SELECT id INTO other_pax FROM public.profiles WHERE role='penumpang' AND id<>pax_id LIMIT 1;
 payload:='{"code":"S2","name":"SQL test","origin":"A","destination":"B","color":"#125738","isActive":true,"segments":[[[-6.9,107.6],[-6.9,107.62]],[[-6.8,107.7],[-6.8,107.72]]],"endstops":[{"name":"A","position":[-6.9,107.6]},{"name":"B","position":[-6.9,107.62]}]}';
 r:=public.admin_route_command(admin_id,'create','sprint2-sql',payload);
 ASSERT jsonb_array_length(r->'segments')=2;
 ASSERT (SELECT path IS NULL FROM public.routes WHERE id='sprint2-sql'),'Chains bridged';
 INSERT INTO public.vehicles(plate_number,route_id) VALUES('D TEST S2','sprint2-sql') RETURNING id INTO v;
 UPDATE public.driver_profiles SET vehicle_id=v,route_id='sprint2-sql' WHERE id=driver_actor;
 PERFORM public.flow_command(driver_actor,'duty','{"mode":"narik","session":"sql-test-session"}');
 req:=public.flow_command(pax_id,'request','{"routeId":"sprint2-sql","position":[-6.9,107.6],"pickup":[-6.9,107.6],"accuracy":10,"status":"searching"}');
 t:=public.flow_command(pax_id,'board',jsonb_build_object('id',req->>'id','vehicleId',v,'offsetKm',0,'chain',0));
 ASSERT (t->>'fare')::integer=(r->>'fareStandard')::integer;
 r:=public.admin_route_command(admin_id,'update','sprint2-sql',r||'{"fareStandard":6500}');
 ASSERT public.flow_command(pax_id,'board',jsonb_build_object('id',req->>'id'))->>'fare'=t->>'fare','Retry changed historical fare';
 BEGIN
  PERFORM public.admin_route_command(admin_id,'update','sprint2-sql',r||'{"segments":[[[-6.9,107.6],[-6.9,107.63]]]}');
  RAISE EXCEPTION 'Geometry changed during active trip';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%perjalanan aktif%' THEN RAISE; END IF; END;
 waiting:=public.flow_command(other_pax,'request','{"routeId":"sprint2-sql","position":[-6.9,107.6],"pickup":[-6.9,107.6],"accuracy":10,"status":"searching"}');
 r:=public.admin_route_command(admin_id,'update','sprint2-sql',r||'{"isActive":false}');
 ASSERT EXISTS(SELECT 1 FROM public.passenger_requests WHERE id=(waiting->>'id')::uuid AND status='cancelled' AND NOT is_active);
 ASSERT public.flow_command(pax_id,'board',jsonb_build_object('id',req->>'id'))->>'id'=t->>'id','Board retry lost after archive';
 ASSERT NOT EXISTS(SELECT 1 FROM public.driver_duties WHERE driver_id=driver_actor AND finished_at IS NULL);
 BEGIN
  PERFORM public.flow_command(driver_actor,'duty','{"mode":"narik","session":"sql-test-session"}');RAISE EXCEPTION 'Inactive duty accepted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%tidak aktif%' THEN RAISE; END IF; END;
 PERFORM public.flow_command(pax_id,'complete',jsonb_build_object('id',t->>'id','distanceKm',1));
 BEGIN
  PERFORM public.admin_route_command(admin_id,'delete','sprint2-sql',r);RAISE EXCEPTION 'Referenced route deleted';
 EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE '%referensi%' THEN RAISE; END IF; END;
 ASSERT EXISTS(SELECT 1 FROM public.passenger_trips WHERE id=(t->>'id')::uuid AND status='completed');
 RAISE NOTICE 'PASS Sprint 2 SQL: chain, duty/archive, trip geometry protection, completion/history';
END $$;
ROLLBACK;
