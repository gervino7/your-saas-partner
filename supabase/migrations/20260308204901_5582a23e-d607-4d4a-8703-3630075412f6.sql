-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "doc_shares_select" ON public.document_shares;

-- New SELECT policy: user can see shares if they are shared_with, shared_by,
-- or they uploaded the document, or they are admin/grade ≤ 3 in the same org
CREATE POLICY "doc_shares_select" ON public.document_shares
FOR SELECT USING (
  (shared_with = auth.uid())
  OR (shared_by = auth.uid())
  OR (document_id IN (
    SELECT id FROM public.documents WHERE uploaded_by = auth.uid()
  ))
  OR (document_id IN (
    SELECT d.id FROM public.documents d
    WHERE d.organization_id = get_user_organization_id(auth.uid())
      AND (
        (SELECT p.grade_level FROM public.profiles p WHERE p.id = auth.uid()) <= 3
        OR has_role(auth.uid(), 'admin'::app_role)
      )
  ))
);

-- Add DELETE policy so users can remove shares they created or if they are admin
CREATE POLICY "doc_shares_delete" ON public.document_shares
FOR DELETE USING (
  (shared_by = auth.uid())
  OR (document_id IN (
    SELECT id FROM public.documents WHERE uploaded_by = auth.uid()
  ))
  OR (document_id IN (
    SELECT d.id FROM public.documents d
    WHERE d.organization_id = get_user_organization_id(auth.uid())
      AND (
        (SELECT p.grade_level FROM public.profiles p WHERE p.id = auth.uid()) <= 2
        OR has_role(auth.uid(), 'admin'::app_role)
      )
  ))
);