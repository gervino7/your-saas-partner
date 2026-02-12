-- Allow users to delete tasks in their organization's projects
CREATE POLICY "tasks_delete" ON public.tasks
FOR DELETE USING (
  project_id IN (
    SELECT id FROM projects WHERE organization_id = get_user_organization_id(auth.uid())
  )
);