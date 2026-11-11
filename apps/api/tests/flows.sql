\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('11111111-1111-4111-8111-111111111111','admin@test.local','{"name":"Admin Test","role":"penumpang"}'),
 ('22222222-2222-4222-8222-222222222222','driver@test.local','{"name":"Driver Test","role":"pengemudi"}'),
 ('33333333-3333-4333-8333-333333333333','passenger@test.local','{"name":"Passenger Test","role":"penumpang"}'),
 ('44444444-4444-4444-8444-444444444444','other@test.local','{"name":"Other Passenger","role":"penumpang"}');
UPDATE public.profiles SET role='admin' WHERE id='11111111-1111-4111-8111-111111111111';
INSERT INTO public.routes(id,code,name,origin,destination,color) VALUES ('test-out','T','Test outbound','A','B','#004425'),('test-back','T','Test return','B','A','#004425');
DO $$
DECLARE
 admin_id uuid:='11111111-1111-4111-8111-111111111111';
 driver_id uuid:='22222222-2222-4222-8222-222222222222';
 pax_id uuid:='33333333-3333-4333-8333-333333333333';
 other_id uuid:='44444444-4444-4444-8444-444444444444';
 result jsonb; retry jsonb; request_id uuid; trip_id uuid; vehicle_id uuid; report_id uuid; kind text; blocked boolean;
BEGIN
 UPDATE auth.users SET email='updated-passenger@test.local' WHERE id=pax_id;
 result:=public.flow_command(pax_id,'me','{}');ASSERT result->>'email'='updated-passenger@test.local','Confirmed email not synchronized';
 UPDATE auth.users SET raw_user_meta_data='{"role":"admin"}' WHERE id=pax_id;
 result:=public.flow_command(pax_id,'me','{}');ASSERT result->>'role'='penumpang','Mutable metadata changed trusted role';
 ASSERT NOT has_table_privilege('authenticated','public.profiles','UPDATE'),'Self escalation still allowed';
 ASSERT NOT has_table_privilege('anon','public.driver_profiles','SELECT'),'Identity fields publicly readable';
 ASSERT NOT has_function_privilege('authenticated','public.flow_command(uuid,text,jsonb)','EXECUTE'),'Privileged command executable by browser';
 ASSERT NOT has_function_privilege('anon','public.get_nearby_passengers_for_driver(text,double precision,double precision,double precision)','EXECUTE'),'Legacy location leak still open';
 blocked:=false;
 BEGIN INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(gen_random_uuid(),'attacker@test.local','{"role":"admin"}'); EXCEPTION WHEN OTHERS THEN blocked:=true; END;
 ASSERT blocked,'Public admin registration allowed';
 result:=public.flow_command(driver_id,'save_onboarding',jsonb_build_object('name','Driver Test','nik','3273010101010101','sim','SIM-TEST','simExpiry','2030-12-31','stnkExpiry','2030-12-31','kirExpiry','2030-12-31','plate','D TEST 001','model','Carry','year','2020','capacity','12','routeId','test-out'));
 FOREACH kind IN ARRAY ARRAY['sim','stnk','kir','foto_kendaraan'] LOOP
  INSERT INTO storage.objects(bucket_id,name) VALUES('driver-documents',driver_id||'/'||kind);
  PERFORM public.flow_command(driver_id,'document',jsonb_build_object('type',kind,'path',driver_id||'/'||kind,'name',kind||'.pdf','mime','application/pdf','size',100));
 END LOOP;
 PERFORM public.flow_command(driver_id,'submit','{}');
 blocked:=false;BEGIN PERFORM public.flow_command(pax_id,'verify',jsonb_build_object('id',driver_id,'status','disetujui'));EXCEPTION WHEN OTHERS THEN blocked:=true;END;ASSERT blocked,'Passenger approved driver';
 PERFORM public.flow_command(admin_id,'verify',jsonb_build_object('id',driver_id,'status','ditolak','reason','SIM kurang terbaca'));
 result:=public.flow_command(driver_id,'onboarding','{}');ASSERT result->>'status'='ditolak';ASSERT result->>'reason'='SIM kurang terbaca';
 PERFORM public.flow_command(driver_id,'submit','{}');
 PERFORM public.flow_command(admin_id,'verify',jsonb_build_object('id',driver_id,'status','disetujui','key','approve-one'));
 PERFORM public.flow_command(admin_id,'verify',jsonb_build_object('id',driver_id,'status','disetujui','key','approve-one'));
 result:=public.flow_command(driver_id,'assignment','{}');vehicle_id:=(result->>'vehicleId')::uuid;ASSERT vehicle_id IS NOT NULL;
 PERFORM public.flow_command(driver_id,'duty','{"mode":"narik","session":"sql-test-session"}');
 result:=public.flow_command(pax_id,'request','{"routeId":"test-out","position":[-6.9,107.6],"pickup":[-6.9,107.6],"status":"walking","accuracy":10,"destination":"B","key":"request-one"}');
 request_id:=(result->>'id')::uuid;
 retry:=public.flow_command(pax_id,'request','{"key":"request-one"}');ASSERT retry->>'id'=result->>'id','Create idempotency failed';
 result:=public.flow_command(driver_id,'requests','{}');ASSERT jsonb_array_length(result)=0,'Walking passenger visible';
 PERFORM public.flow_command(pax_id,'request_position',jsonb_build_object('id',request_id,'position',jsonb_build_array(-6.9,107.6),'pickup',jsonb_build_array(-6.9,107.6),'accuracy',10,'arrived',true));
 result:=public.flow_command(driver_id,'requests','{}');ASSERT jsonb_array_length(result)=1,'Searching passenger missing';
 blocked:=false;BEGIN PERFORM public.flow_command(other_id,'cancel',jsonb_build_object('id',request_id));EXCEPTION WHEN OTHERS THEN blocked:=true;END;ASSERT blocked,'Other passenger cancelled request';
 PERFORM public.flow_command(driver_id,'respond',jsonb_build_object('id',request_id));
 result:=public.flow_command(pax_id,'board',jsonb_build_object('id',request_id,'vehicleId',vehicle_id,'offsetKm',1,'chain',0,'key','board-one'));trip_id:=(result->>'id')::uuid;
 retry:=public.flow_command(pax_id,'board',jsonb_build_object('id',request_id,'key','board-one'));ASSERT retry->>'id'=trip_id::text,'Boarding idempotency failed';
 result:=public.flow_command(driver_id,'requests','{}');ASSERT jsonb_array_length(result)=0,'Boarded passenger still visible';
 blocked:=false;BEGIN PERFORM public.flow_command(pax_id,'request','{"routeId":"test-out","position":[-6.9,107.6],"pickup":[-6.9,107.6],"status":"searching","accuracy":10}');EXCEPTION WHEN OTHERS THEN blocked:=true;END;ASSERT blocked,'Request created during active trip';
 PERFORM public.flow_command(driver_id,'progress','{"offsetKm":3,"chain":0,"distanceKm":2,"session":"sql-test-session"}');
 result:=public.flow_command(pax_id,'trip_active','{}');ASSERT (result->>'distance_km')::float8=2;
 result:=public.flow_command(pax_id,'complete',jsonb_build_object('id',trip_id,'distanceKm',2,'key','complete-one'));ASSERT result->>'status'='completed';
 retry:=public.flow_command(pax_id,'complete',jsonb_build_object('id',trip_id,'distanceKm',999));ASSERT (retry->>'distance_km')::float8=2,'Completion overwrote final distance';
 result:=public.flow_command(pax_id,'report',jsonb_build_object('category','pengemudi','subject','Laporan test','description','Pengemudi berhenti terlalu lama di jalur.','vehicleId',vehicle_id,'key','report-one'));report_id:=(result->>'id')::uuid;
 result:=public.flow_command(other_id,'reports','{}');ASSERT jsonb_array_length(result)=0,'Reports leaked between accounts';
 PERFORM public.flow_command(admin_id,'report_update',jsonb_build_object('id',report_id,'status','diproses','response','Sedang diperiksa'));
 PERFORM public.flow_command(admin_id,'report_update',jsonb_build_object('id',report_id,'status','selesai','response','Sudah ditindaklanjuti'));
 result:=public.flow_command(pax_id,'reports','{}');ASSERT result->0->>'status'='selesai';ASSERT jsonb_array_length(result->0->'updates')=2,'Timeline not persisted';
 result:=public.flow_command(pax_id,'request','{"routeId":"test-out","position":[-6.9,107.6],"pickup":[-6.9,107.6],"status":"searching","accuracy":10}');request_id:=(result->>'id')::uuid;
 PERFORM public.flow_command(pax_id,'cancel',jsonb_build_object('id',request_id));
 blocked:=false;BEGIN PERFORM public.flow_command(driver_id,'respond',jsonb_build_object('id',request_id));EXCEPTION WHEN OTHERS THEN blocked:=true;END;ASSERT blocked,'Cancelled request resurrected';
 result:=public.flow_command(pax_id,'request','{"routeId":"test-out","position":[-6.9,107.6],"pickup":[-6.9,107.6],"status":"searching","accuracy":10}');request_id:=(result->>'id')::uuid;
 result:=public.flow_command(pax_id,'board',jsonb_build_object('id',request_id,'vehicleId',vehicle_id,'offsetKm',1,'chain',0));trip_id:=(result->>'id')::uuid;
 ASSERT trip_id IS NOT NULL,'Boarding required a reservation/driver response';
 PERFORM public.flow_command(pax_id,'complete',jsonb_build_object('id',trip_id,'distanceKm',1));
 result:=public.flow_command(pax_id,'request','{"routeId":"test-out","position":[-6.9,107.6],"pickup":[-6.9,107.6],"status":"searching","accuracy":10}');request_id:=(result->>'id')::uuid;
 UPDATE public.passenger_requests SET expires_at=now()-interval '1 second' WHERE id=request_id;
 result:=public.flow_command(pax_id,'request_current','{}');ASSERT result->>'status'='expired';
 blocked:=false;BEGIN PERFORM public.flow_command(driver_id,'respond',jsonb_build_object('id',request_id));EXCEPTION WHEN OTHERS THEN blocked:=true;END;ASSERT blocked,'Expired request resurrected';
 RAISE NOTICE 'PASS: privilege, registration, verification, megat, trip, idempotency, report isolation/timeline and expiry';
END $$;
ROLLBACK;
