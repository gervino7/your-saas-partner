
-- Simplify mission INSERT policy: inline the check instead of calling a function
-- Drop ALL existing INSERT policies on missions
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'missions' AND schemaname = 'public' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.missions', pol.policyname);
  END LOOP;
END $$;

-- Recreate a simple, robust INSERT policy that does not depend on any helper function
CREATE POLICY "missions_insert_simple"
ON public.missions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = missions.organization_id
      AND COALESCE(p.grade_level, 8) <= 3
  )
);

-- Ensure grants are in place
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;

-- Also ensure mission_members INSERT works (creator inserting themselves as director/chief)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'mission_members' AND schemaname = 'public' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.mission_members', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "mission_members_insert_simple"
ON public.mission_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.missions m
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE m.id = mission_members.mission_id
      AND m.organization_id = p.organization_id
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mission_members TO authenticated;
GRANT ALL ON public.mission_members TO service_role;
