-- Normalize organization links before policy reset
UPDATE public.projects p
SET organization_id = m.organization_id
FROM public.missions m
WHERE p.mission_id = m.id
  AND p.organization_id IS DISTINCT FROM m.organization_id;

UPDATE public.activities a
SET organization_id = p.organization_id
FROM public.projects p
WHERE a.project_id = p.id
  AND a.organization_id IS DISTINCT FROM p.organization_id;

UPDATE public.tasks t
SET organization_id = p.organization_id
FROM public.projects p
WHERE t.project_id = p.id
  AND t.organization_id IS DISTINCT FROM p.organization_id;

-- Access helpers: SECURITY DEFINER avoids RLS recursion between projects/tasks/member tables
CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.profiles pr ON pr.id = _user_id
    WHERE p.id = _project_id
      AND p.organization_id = pr.organization_id
      AND (
        COALESCE(pr.grade_level, 8) <= 2
        OR p.lead_id = _user_id
        OR public.can_access_mission(_user_id, p.mission_id)
        OR EXISTS (
          SELECT 1
          FROM public.project_members pm
          WHERE pm.project_id = p.id
            AND pm.user_id = _user_id
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_task(_user_id uuid, _task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    JOIN public.profiles pr ON pr.id = _user_id
    WHERE t.id = _task_id
      AND t.organization_id = pr.organization_id
      AND p.organization_id = pr.organization_id
      AND (
        COALESCE(pr.grade_level, 8) <= 2
        OR t.created_by = _user_id
        OR p.lead_id = _user_id
        OR public.can_access_project(_user_id, p.id)
        OR EXISTS (
          SELECT 1
          FROM public.task_assignments ta
          WHERE ta.task_id = t.id
            AND ta.user_id = _user_id
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.can_access_project(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_task(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_task(uuid, uuid) TO authenticated, service_role;

-- Ensure Data API access remains available while RLS enforces row visibility
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignments TO authenticated;
GRANT ALL ON public.task_assignments TO service_role;

-- Reset SELECT policies for projects, activities, tasks, and their membership tables
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('projects', 'activities', 'tasks', 'project_members', 'task_assignments')
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "projects_select_v4_secure"
ON public.projects
FOR SELECT
TO authenticated
USING (public.can_access_project(auth.uid(), id));

CREATE POLICY "activities_select_v4_secure"
ON public.activities
FOR SELECT
TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "tasks_select_v4_secure"
ON public.tasks
FOR SELECT
TO authenticated
USING (public.can_access_task(auth.uid(), id));

CREATE POLICY "project_members_select_v4_secure"
ON public.project_members
FOR SELECT
TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

CREATE POLICY "task_assignments_select_v4_secure"
ON public.task_assignments
FOR SELECT
TO authenticated
USING (public.can_access_task(auth.uid(), task_id));