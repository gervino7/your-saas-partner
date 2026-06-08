DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'missions' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.missions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "missions_select_v2" ON public.missions
FOR SELECT
TO authenticated
USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
    OR director_id = auth.uid()
    OR chief_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.mission_members WHERE mission_id = missions.id AND user_id = auth.uid())
  )
);

UPDATE public.missions m SET organization_id = (
  SELECT organization_id FROM public.profiles WHERE id = m.director_id
) WHERE organization_id IS NULL AND director_id IS NOT NULL;