
-- Create unified document access function
CREATE OR REPLACE FUNCTION public.can_access_document(_user_id uuid, _doc_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    JOIN public.profiles p ON p.id = _user_id
    WHERE d.id = _doc_id
      AND d.organization_id = p.organization_id
      AND (
        COALESCE(p.grade_level, 8) <= 2
        OR d.uploaded_by = _user_id
        OR EXISTS (SELECT 1 FROM public.document_shares ds WHERE ds.document_id = d.id AND ds.shared_with = _user_id)
        OR (d.mission_id IS NOT NULL AND public.can_access_mission(_user_id, d.mission_id))
        OR (d.project_id IS NOT NULL AND public.can_access_project(_user_id, d.project_id))
        OR (d.committee_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.committee_members cm WHERE cm.committee_id = d.committee_id AND cm.user_id = _user_id
        ))
        OR (d.mission_id IS NULL AND d.project_id IS NULL AND d.committee_id IS NULL AND COALESCE(p.grade_level, 8) <= 3)
      )
  )
$$;

REVOKE ALL ON FUNCTION public.can_access_document(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_document(uuid, uuid) TO authenticated, service_role;

-- Drop all SELECT policies on documents and document_folders, recreate cleanly
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('documents','document_folders') AND cmd='SELECT'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename); END LOOP;
END $$;

-- Documents: single SELECT policy via function
CREATE POLICY "documents_select_v2_secure" ON public.documents
FOR SELECT TO authenticated
USING (public.can_access_document(auth.uid(), id));

-- Folders: visible if same org AND (grade<=3 OR linked to accessible project OR no project)
CREATE POLICY "document_folders_select_v2_secure" ON public.document_folders
FOR SELECT TO authenticated
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    public.get_user_grade_level(auth.uid()) <= 3
    OR project_id IS NULL
    OR public.can_access_project(auth.uid(), project_id)
  )
);
