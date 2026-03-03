
-- Allow admins (grade_level <= 2) and owners to update other profiles in the same org
CREATE POLICY "profiles_admin_update" ON public.profiles
FOR UPDATE
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  )
);
