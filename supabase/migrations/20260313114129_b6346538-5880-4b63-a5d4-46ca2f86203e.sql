-- Allow profile deletion (needed by delete-user edge function via service role)
CREATE POLICY "profiles_admin_delete" ON public.profiles
FOR DELETE TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  )
);