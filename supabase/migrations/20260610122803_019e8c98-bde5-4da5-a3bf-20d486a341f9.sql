DROP POLICY IF EXISTS missions_insert_resilient ON public.missions;

CREATE POLICY missions_insert_resilient
ON public.missions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.organization_id = missions.organization_id
      AND COALESCE(p.grade_level, 8) <= 3
  )
);