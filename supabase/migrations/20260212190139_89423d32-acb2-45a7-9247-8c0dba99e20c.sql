
-- Create a security definer function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- Fix profiles SELECT policy to avoid self-referencing recursion
DROP POLICY IF EXISTS "profiles_same_org_select" ON profiles;

-- Users can read their own profile OR profiles in the same org
CREATE POLICY "profiles_same_org_select" ON profiles
FOR SELECT USING (
  id = auth.uid() OR organization_id = public.get_user_organization_id(auth.uid())
);
