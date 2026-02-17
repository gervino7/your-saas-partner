
-- Fix 1: Restrict invoices access to grade_level <= 2 (DA, DM) instead of <= 3
DROP POLICY IF EXISTS "invoices_grade_select" ON invoices;
CREATE POLICY "invoices_grade_select" ON invoices
  FOR SELECT USING (
    (organization_id = get_user_organization_id(auth.uid()))
    AND (
      (( SELECT profiles.grade_level FROM profiles WHERE profiles.id = auth.uid()) <= 2)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'owner'::app_role)
    )
  );

-- Fix 2: Ensure profiles require authentication for SELECT
-- First check existing policies and add auth requirement
-- The profiles_safe view already masks sensitive data, but we need to ensure
-- the base profiles table requires auth
DO $$
BEGIN
  -- Drop the existing permissive select policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_same_org_select') THEN
    DROP POLICY "profiles_same_org_select" ON profiles;
  END IF;
END $$;

CREATE POLICY "profiles_same_org_select" ON profiles
  FOR SELECT
  TO authenticated
  USING (organization_id = get_user_organization_id(auth.uid()));
