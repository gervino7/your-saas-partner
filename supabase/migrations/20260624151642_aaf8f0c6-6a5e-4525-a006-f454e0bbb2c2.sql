CREATE OR REPLACE FUNCTION public.can_insert_project(_user_id uuid, _mission_id uuid, _organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.missions m ON m.id = _mission_id
    WHERE p.id = _user_id
      AND p.organization_id IS NOT NULL
      AND m.organization_id = p.organization_id
      AND _organization_id = p.organization_id
      AND (
        COALESCE(p.grade_level, 8) <= 3
        OR m.director_id = _user_id
        OR m.chief_id = _user_id
        OR EXISTS (
          SELECT 1
          FROM public.mission_members mm
          WHERE mm.mission_id = m.id
            AND mm.user_id = _user_id
        )
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.can_insert_project(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_insert_project(uuid, uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS projects_insert_resilient ON public.projects;
CREATE POLICY projects_insert_resilient
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND organization_id IS NOT NULL
  AND public.can_insert_project(auth.uid(), mission_id, organization_id)
);