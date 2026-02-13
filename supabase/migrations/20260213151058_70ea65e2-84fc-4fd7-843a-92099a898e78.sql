
-- 1. Fix clients table: restrict access to grade_level <= 4 (DA, DM, CM, SUP)
DROP POLICY IF EXISTS "clients_org_select" ON public.clients;

CREATE POLICY "clients_grade_select" ON public.clients
FOR SELECT USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    -- Only grades DA, DM, CM, SUP can see clients
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 4
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  )
);

-- 2. Fix profiles table: create a secure view hiding sensitive fields
-- First, create a view that hides email and phone for non-privileged users
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = on) AS
SELECT
  id,
  organization_id,
  full_name,
  avatar_url,
  grade,
  grade_level,
  is_online,
  last_seen_at,
  created_at,
  updated_at,
  skills,
  last_login_at,
  -- Only show email/phone to the user themselves or grade <= 3
  CASE
    WHEN id = auth.uid() THEN email
    WHEN (SELECT grade_level FROM profiles p2 WHERE p2.id = auth.uid()) <= 3 THEN email
    ELSE NULL
  END AS email,
  CASE
    WHEN id = auth.uid() THEN phone
    WHEN (SELECT grade_level FROM profiles p2 WHERE p2.id = auth.uid()) <= 3 THEN phone
    ELSE NULL
  END AS phone
FROM public.profiles;
