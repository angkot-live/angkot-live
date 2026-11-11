-- Run with ON_ERROR_STOP on the local database. Every fixture is rolled back.
BEGIN;
DO $$
DECLARE d public.driver_profiles; doc public.driver_documents; previous uuid; r text; v uuid;
BEGIN
 IF (SELECT count(*) FROM public.routes)<>82 THEN RAISE EXCEPTION 'Expected 82 directions'; END IF;
 IF (SELECT count(DISTINCT code) FROM public.routes)<>37 THEN RAISE EXCEPTION 'Expected 37 codes'; END IF;
 IF EXISTS(SELECT 1 FROM public.routes r WHERE NOT EXISTS(SELECT 1 FROM public.route_segments s WHERE s.route_id=r.id)) THEN RAISE EXCEPTION 'Missing route chain'; END IF;
 IF EXISTS(SELECT 1 FROM public.route_segments WHERE ST_SRID(path)<>4326 OR ST_NPoints(path)<2 OR NOT ST_IsValid(path)) THEN RAISE EXCEPTION 'Invalid geometry'; END IF;
 IF EXISTS(SELECT 1 FROM public.route_segments WHERE ST_Y(ST_StartPoint(path)) NOT BETWEEN -7.5 AND -6 OR ST_X(ST_StartPoint(path)) NOT BETWEEN 106 AND 109) THEN RAISE EXCEPTION 'Lat/lng reversed'; END IF;
 SELECT * INTO d FROM public.driver_profiles WHERE verification_status='disetujui' LIMIT 1;
 BEGIN
  UPDATE public.driver_profiles SET route_id=(SELECT id FROM public.routes WHERE id<>d.route_id LIMIT 1) WHERE id=d.id;
  RAISE EXCEPTION 'Mismatched assignment accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE '%Assignment kendaraan%' THEN RAISE; END IF;
 END;
 BEGIN
  UPDATE public.vehicles SET capacity=0 WHERE id=d.vehicle_id;
  RAISE EXCEPTION 'Invalid capacity accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.passenger_requests SET status='searching',is_active=false WHERE status='cancelled';
  RAISE EXCEPTION 'Invalid request state accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.passenger_trips SET finished_at=started_at-interval '1 minute';
  RAISE EXCEPTION 'Invalid trip time accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.passenger_trips SET finished_at=NULL WHERE status='completed';
  RAISE EXCEPTION 'Missing completion time accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.passenger_trips SET distance_km=-1;
  RAISE EXCEPTION 'Negative distance accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 SELECT * INTO doc FROM public.driver_documents WHERE driver_id=d.id AND document_type='sim' AND superseded_at IS NULL;
 previous:=doc.id;
 INSERT INTO public.driver_documents(driver_id,document_type,file_path,file_name,file_size,mime_type,expires_at)
  VALUES(d.id,'sim',d.id::text||'/'||gen_random_uuid()::text,'revision-test.pdf',100,'application/pdf','2030-12-31');
 IF (SELECT count(*) FROM public.driver_documents WHERE driver_id=d.id AND document_type='sim' AND superseded_at IS NULL)<>1 THEN RAISE EXCEPTION 'Multiple current revisions'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.driver_documents WHERE id=previous AND superseded_at IS NOT NULL) THEN RAISE EXCEPTION 'Previous revision not superseded'; END IF;
 -- New metadata cannot stand in for a file which is absent from Storage.
 UPDATE public.driver_profiles SET verification_status='ditolak',submitted_at=NULL WHERE id=d.id;
 BEGIN
  PERFORM public.flow_command(d.id,'submit','{}');
  RAISE EXCEPTION 'Missing storage object accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM NOT LIKE '%Storage%' THEN RAISE; END IF;
 END;
 -- Preserve disconnected chains: two segments, no legacy connecting line.
 r:=d.route_id;
 PERFORM public.sync_route_geometry(r,'[[[-6.9,107.6],[-6.91,107.61]],[[-6.8,107.7],[-6.81,107.71]]]','[]');
 IF (SELECT count(*) FROM public.route_segments WHERE route_id=r)<>2 OR (SELECT path IS NOT NULL FROM public.routes WHERE id=r) THEN RAISE EXCEPTION 'Disconnected chains bridged'; END IF;
END $$;
ROLLBACK;
