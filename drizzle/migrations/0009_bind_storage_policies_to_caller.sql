CREATE OR REPLACE FUNCTION public.est_direction_du_cabinet(_org text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.organization_id::text = _org AND p.grade_level <= 2)
$$;
REVOKE EXECUTE ON FUNCTION public.est_direction_du_cabinet(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.est_direction_du_cabinet(text) TO authenticated;

-- attachments
DROP POLICY IF EXISTS attachments_org_select ON storage.objects;
CREATE POLICY attachments_org_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid())
  AND (
    owner_id = (SELECT auth.uid()::text)
    OR public.est_direction_du_cabinet((storage.foldername(name))[1])
    OR ((storage.foldername(name))[2] = 'submissions'
        AND (storage.foldername(name))[3] ~ '^[0-9a-fA-F-]{36}$'
        AND public.can_access_task(auth.uid(), ((storage.foldername(name))[3])::uuid))
    OR ((storage.foldername(name))[2] = 'messages'
        AND EXISTS (SELECT 1 FROM public.messages m
          WHERE m.conversation_id IN (SELECT public.get_user_conversation_ids(auth.uid()))
            AND m.attachments::text LIKE '%' || replace(replace(objects.name, '\', '\\'), '"', '\"') || '%'))
  )
);
DROP POLICY IF EXISTS attachments_org_update ON storage.objects;
CREATE POLICY attachments_org_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'attachments' AND owner_id = (SELECT auth.uid()::text))
  WITH CHECK (bucket_id = 'attachments' AND owner_id = (SELECT auth.uid()::text));
DROP POLICY IF EXISTS attachments_org_delete ON storage.objects;
CREATE POLICY attachments_org_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'attachments'
  AND (owner_id = (SELECT auth.uid()::text) OR public.est_direction_du_cabinet((storage.foldername(name))[1])));

-- documents
DROP POLICY IF EXISTS documents_org_update ON storage.objects;
CREATE POLICY documents_org_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (owner_id = (SELECT auth.uid()::text) OR public.est_direction_du_cabinet((storage.foldername(name))[1])))
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()));

-- org-assets
DROP POLICY IF EXISTS org_assets_org_update ON storage.objects;
CREATE POLICY org_assets_org_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'org-assets' AND public.est_direction_du_cabinet((storage.foldername(name))[1]))
  WITH CHECK (bucket_id = 'org-assets' AND public.est_direction_du_cabinet((storage.foldername(name))[1]));
DROP POLICY IF EXISTS org_assets_org_delete ON storage.objects;
CREATE POLICY org_assets_org_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'org-assets' AND public.est_direction_du_cabinet((storage.foldername(name))[1]));

-- evaluations: archives read only by the export function (service role)
DROP POLICY IF EXISTS eval_pdf_read ON storage.objects;

-- portal-shared (portal retired)
DROP POLICY IF EXISTS portal_shared_staff ON storage.objects;
CREATE POLICY portal_shared_staff ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'portal-shared' AND (owner_id = (SELECT auth.uid()::text) OR public.est_direction_du_cabinet((storage.foldername(name))[1])))
  WITH CHECK (bucket_id = 'portal-shared' AND owner_id = (SELECT auth.uid()::text)
    AND (storage.foldername(name))[1] = (SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()));

-- workspace: superiors only within their own cabinet
DROP POLICY IF EXISTS workspace_storage_superior_select ON storage.objects;
CREATE POLICY workspace_storage_superior_select ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'workspace'
  AND (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
  AND EXISTS (SELECT 1 FROM public.profiles owner_p, public.profiles me
     WHERE owner_p.id = ((storage.foldername(name))[1])::uuid AND me.id = auth.uid()
       AND owner_p.organization_id = me.organization_id
       AND (me.grade_level <= 2 OR owner_p.id IN (
         SELECT pm.user_id FROM public.project_members pm JOIN public.projects pr ON pr.id = pm.project_id
         WHERE pr.lead_id = auth.uid()))));