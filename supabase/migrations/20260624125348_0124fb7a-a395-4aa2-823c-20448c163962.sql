DROP POLICY IF EXISTS projects_insert_resilient ON public.projects;

CREATE POLICY projects_insert_resilient
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND projects.organization_id = public.get_user_organization_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.missions m
    WHERE m.id = projects.mission_id
      AND m.organization_id = projects.organization_id
  )
  AND (
    public.get_user_grade_level(auth.uid()) <= 3
    OR public.can_access_mission(auth.uid(), projects.mission_id)
  )
);