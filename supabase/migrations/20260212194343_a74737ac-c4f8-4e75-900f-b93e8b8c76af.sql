
-- Add UPDATE policy for tasks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_update') THEN
    EXECUTE 'CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE USING (
      project_id IN (
        SELECT projects.id FROM projects
        WHERE projects.organization_id = get_user_organization_id(auth.uid())
      )
    )';
  END IF;
END $$;

-- Add INSERT policy for task_assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignments' AND policyname = 'task_assignments_insert') THEN
    EXECUTE 'CREATE POLICY "task_assignments_insert" ON public.task_assignments FOR INSERT WITH CHECK (
      task_id IN (
        SELECT tasks.id FROM tasks
        WHERE tasks.project_id IN (
          SELECT projects.id FROM projects
          WHERE projects.organization_id = get_user_organization_id(auth.uid())
        )
      )
    )';
  END IF;
END $$;

-- Add SELECT policy for task_assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignments' AND policyname = 'task_assignments_select') THEN
    EXECUTE 'CREATE POLICY "task_assignments_select" ON public.task_assignments FOR SELECT USING (
      task_id IN (
        SELECT tasks.id FROM tasks
        WHERE tasks.project_id IN (
          SELECT projects.id FROM projects
          WHERE projects.organization_id = get_user_organization_id(auth.uid())
        )
      )
    )';
  END IF;
END $$;

-- Add INSERT policy for publications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'publications' AND policyname = 'publications_insert') THEN
    EXECUTE 'CREATE POLICY "publications_insert" ON public.publications FOR INSERT WITH CHECK (author_id = auth.uid())';
  END IF;
END $$;

-- Add SELECT policy for publications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'publications' AND policyname = 'publications_select') THEN
    EXECUTE 'CREATE POLICY "publications_select" ON public.publications FOR SELECT USING (
      project_id IN (
        SELECT projects.id FROM projects
        WHERE projects.organization_id = get_user_organization_id(auth.uid())
      )
      OR mission_id IN (
        SELECT missions.id FROM missions
        WHERE missions.organization_id = get_user_organization_id(auth.uid())
      )
    )';
  END IF;
END $$;

-- Enable RLS on tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
