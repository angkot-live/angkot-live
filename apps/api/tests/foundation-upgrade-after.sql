-- Assert backfill after the MVP migration, then remove only these test fixtures.
DO $$ BEGIN
 ASSERT (SELECT address='Alamat draft lama' AND sim_expires_at='2030-12-31'::date FROM public.driver_profiles WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'Typed profile backfill failed';
 ASSERT (SELECT count(*) FROM public.route_segments WHERE route_id='upgrade-test')=2,'Legacy chains not imported';
 ASSERT (SELECT path IS NULL FROM public.routes WHERE id='upgrade-test'),'Legacy disconnected chains bridged';
 ASSERT (SELECT count(*) FROM public.route_stops WHERE route_id='upgrade-test')=1,'Legacy stop missing';
 ASSERT (SELECT count(*) FROM public.driver_documents WHERE driver_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND superseded_at IS NULL)=1,'Legacy revisions not backfilled';
 ASSERT EXISTS(SELECT 1 FROM public.driver_documents WHERE file_path='legacy/new' AND superseded_at IS NULL),'Latest document not retained';
 ASSERT EXISTS(SELECT 1 FROM public.passenger_requests WHERE route_id='upgrade-test' AND mode='jalan_kaki' AND is_active),'Legacy request state not normalized';
END $$;
DELETE FROM auth.users WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
DELETE FROM public.routes WHERE id='upgrade-test';
