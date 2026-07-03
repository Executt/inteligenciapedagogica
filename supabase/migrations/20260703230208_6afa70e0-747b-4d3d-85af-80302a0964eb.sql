
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.match_documento_chunks(text, vector, int, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_documento_chunks(text, vector, int, uuid) TO authenticated, service_role;

-- Storage policies for dossies bucket (path: <userId>/<alunoId>/<file>)
CREATE POLICY "dossies_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dossies' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "dossies_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dossies' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "dossies_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dossies' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "dossies_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dossies' AND auth.uid()::text = (storage.foldername(name))[1]);
