
-- Allow directors (grade <= 2) and admins to delete projects in their org
CREATE POLICY "projects_org_delete" ON projects
FOR DELETE USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
