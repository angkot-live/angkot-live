-- Apply after the two original migrations in an isolated test database only.
INSERT INTO auth.users(id,email,raw_user_meta_data)
 VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','upgrade@test.local','{"role":"pengemudi"}');
UPDATE public.driver_profiles SET onboarding='{"address":"Alamat draft lama","simExpiry":"2030-12-31"}'
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
INSERT INTO public.routes(id,code,name,origin,destination,segments,polyline,endstops)
 VALUES('upgrade-test','UP','Legacy chains','A','B','[[[-6.9,107.6],[-6.91,107.61]],[[-6.8,107.7],[-6.81,107.71]]]','[[-6.9,107.6],[-6.91,107.61]]','[{"name":"A","position":[-6.9,107.6]}]');
INSERT INTO public.driver_documents(driver_id,document_type,file_path,file_size,uploaded_at) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','sim','legacy/old',10,'2026-10-01'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','sim','legacy/new',20,'2026-10-02');
INSERT INTO public.passenger_requests(passenger_id,route_id,location,status,mode,is_active)
 VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','upgrade-test',ST_SetSRID(ST_MakePoint(107.6,-6.9),4326),'walking','mencari',false);
