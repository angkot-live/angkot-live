BEGIN;
CREATE TABLE public.notification_preferences (
 profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 report_updates boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_preferences FROM PUBLIC,anon,authenticated;
ALTER TABLE public.passenger_trips ADD COLUMN telemetry_source text NOT NULL DEFAULT 'gps' CHECK(telemetry_source IN ('gps','simulation'));

ALTER FUNCTION public.flow_command(uuid,text,jsonb) RENAME TO flow_command_s4_base;
CREATE FUNCTION public.flow_command(p_actor uuid,p_action text,p_input jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor_role public.user_role; result jsonb; cached jsonb; rep public.reports; target_status public.report_status; evidence text; request_key text:=nullif(p_input->>'key','');
BEGIN
 SELECT role INTO actor_role FROM public.profiles WHERE id=p_actor;
 IF actor_role IS NULL THEN RAISE EXCEPTION 'Profil tidak ditemukan'; END IF;
 IF p_action='report_update' AND actor_role<>'admin' THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
 IF p_action IN ('report','preferences','preferences_update') AND actor_role<>'penumpang' THEN RAISE EXCEPTION 'Akses penumpang diperlukan'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 IF request_key IS NOT NULL THEN
  SELECT f.result INTO cached FROM public.flow_idempotency f WHERE f.actor_id=p_actor AND f.action=p_action AND f.key=request_key;
  IF FOUND THEN RETURN cached; END IF;
 END IF;
 IF p_action IN ('preferences','preferences_update') THEN
  INSERT INTO public.notification_preferences(profile_id) VALUES(p_actor) ON CONFLICT DO NOTHING;
  IF p_action='preferences_update' THEN
   IF jsonb_typeof(p_input->'report_updates') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Preferensi laporan harus berupa boolean'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_input) k WHERE k NOT IN ('report_updates','key')) THEN RAISE EXCEPTION 'Preferensi belum didukung'; END IF;
   UPDATE public.notification_preferences SET report_updates=(p_input->>'report_updates')::boolean,updated_at=now() WHERE profile_id=p_actor;
  END IF;
  SELECT jsonb_build_object('report_updates',report_updates,'updated_at',updated_at) INTO result FROM public.notification_preferences WHERE profile_id=p_actor;
 ELSIF p_action='report_update' THEN
  SELECT * INTO rep FROM public.reports WHERE id=(p_input->>'id')::uuid FOR UPDATE;
  IF rep.id IS NULL THEN RAISE EXCEPTION 'Laporan tidak ditemukan'; END IF;
  IF p_input ? 'expectedStatus' AND rep.status::text<>p_input->>'expectedStatus' THEN RAISE EXCEPTION 'Status laporan telah berubah. Muat ulang sebelum menyimpan'; END IF;
  target_status:=(p_input->>'status')::public.report_status;
  IF target_status IS NULL OR (rep.status='diterima' AND target_status NOT IN ('diterima','diproses')) OR (rep.status='diproses' AND target_status NOT IN ('diproses','selesai')) OR (rep.status='selesai' AND target_status<>'selesai') THEN RAISE EXCEPTION 'Status laporan harus berurutan: diterima, diproses, selesai'; END IF;
  IF length(trim(coalesce(p_input->>'response',''))) NOT BETWEEN 3 AND 4000 THEN RAISE EXCEPTION 'Tanggapan harus 3 sampai 4000 karakter'; END IF;
  UPDATE public.reports SET status=target_status WHERE id=rep.id RETURNING * INTO rep;
  INSERT INTO public.report_updates(report_id,admin_id,status,notes) VALUES(rep.id,p_actor,rep.status,trim(p_input->>'response'));
  IF coalesce((SELECT report_updates FROM public.notification_preferences WHERE profile_id=rep.reporter_id),true) THEN
   INSERT INTO public.messages(sender_id,recipient_id,title,content,kind,related_report_id) VALUES(p_actor,rep.reporter_id,'Laporan '||rep.code||': '||rep.status::text,trim(p_input->>'response'),'report',rep.id);
  END IF;
  result:=to_jsonb(rep);
 ELSE
  IF p_action='report' THEN
   IF length(coalesce(p_input->>'description',''))>5000 OR length(coalesce(p_input->>'subject',''))>200 THEN RAISE EXCEPTION 'Judul atau kronologi terlalu panjang'; END IF;
   IF jsonb_typeof(coalesce(p_input->'evidence','[]'))<>'array' OR jsonb_array_length(coalesce(p_input->'evidence','[]'))>5 THEN RAISE EXCEPTION 'Maksimal lima bukti'; END IF;
   FOR evidence IN SELECT jsonb_array_elements_text(coalesce(p_input->'evidence','[]')) LOOP
    IF evidence NOT LIKE p_actor::text||'/%' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='report-evidence' AND name=evidence) THEN RAISE EXCEPTION 'Bukti bukan milik akun ini atau tidak ditemukan di Storage'; END IF;
   END LOOP;
  END IF;
  result:=public.flow_command_s4_base(p_actor,p_action,p_input);
  IF p_action='board' AND result->>'id' IS NOT NULL THEN
   UPDATE public.passenger_trips t SET telemetry_source=d.telemetry_source FROM public.driver_duties d WHERE t.id=(result->>'id')::uuid AND d.driver_id=t.driver_id AND d.finished_at IS NULL;
   SELECT to_jsonb(t) INTO result FROM public.passenger_trips t WHERE id=(result->>'id')::uuid;
   -- Qualify the PL/pgSQL value to avoid shadowing the column named result.
   IF request_key IS NOT NULL THEN UPDATE public.flow_idempotency f SET result=(SELECT to_jsonb(t) FROM public.passenger_trips t WHERE id=(f.result->>'id')::uuid) WHERE f.actor_id=p_actor AND f.action=p_action AND f.key=request_key; END IF;
  END IF;
  RETURN result;
 END IF;
 IF request_key IS NOT NULL THEN INSERT INTO public.flow_idempotency(actor_id,action,key,result) VALUES(p_actor,p_action,request_key,result); END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.flow_command(uuid,text,jsonb),public.flow_command_s4_base(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flow_command(uuid,text,jsonb) TO service_role;
COMMIT;
