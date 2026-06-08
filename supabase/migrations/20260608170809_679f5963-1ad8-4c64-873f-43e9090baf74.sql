GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;

CREATE OR REPLACE FUNCTION public.can_create_mission(_user_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.organization_id = _organization_id
      AND COALESCE(p.grade_level, 8) <= 3
  )
$$;

REVOKE ALL ON FUNCTION public.can_create_mission(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_create_mission(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_create_mission(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_mission(uuid, uuid) TO service_role;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'missions'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.missions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "missions_insert_v4_secure"
ON public.missions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.can_create_mission(auth.uid(), organization_id)
);