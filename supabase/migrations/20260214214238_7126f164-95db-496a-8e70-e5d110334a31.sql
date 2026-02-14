
-- Add folder support to workspace_files
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS folder_path text DEFAULT '/';
ALTER TABLE public.workspace_files ADD COLUMN IF NOT EXISTS is_folder boolean DEFAULT false;

-- Add DELETE policy for workspace_files (missing)
CREATE POLICY "workspace_files_delete" ON public.workspace_files
FOR DELETE USING (
  workspace_id IN (
    SELECT id FROM personal_workspaces WHERE user_id = auth.uid()
  )
);

-- Add UPDATE policy for workspace_files (missing)
CREATE POLICY "workspace_files_update" ON public.workspace_files
FOR UPDATE USING (
  workspace_id IN (
    SELECT id FROM personal_workspaces WHERE user_id = auth.uid()
  )
);

-- Hierarchical read access: superiors can view subordinates' workspace files
CREATE POLICY "workspace_files_superior_select" ON public.workspace_files
FOR SELECT USING (
  -- DA (grade_level 1) can see all workspaces in their org
  (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) = 1
    AND workspace_id IN (
      SELECT pw.id FROM personal_workspaces pw
      JOIN profiles p ON pw.user_id = p.id
      WHERE p.organization_id = get_user_organization_id(auth.uid())
    )
  )
  OR
  -- DM (grade_level 2) can see workspaces of mission members
  (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) = 2
    AND workspace_id IN (
      SELECT pw.id FROM personal_workspaces pw
      JOIN mission_members mm ON pw.user_id = mm.user_id
      JOIN missions m ON mm.mission_id = m.id
      WHERE m.director_id = auth.uid() OR m.chief_id = auth.uid()
    )
  )
  OR
  -- Project leads can see workspaces of project members
  (
    workspace_id IN (
      SELECT pw.id FROM personal_workspaces pw
      JOIN project_members pm ON pw.user_id = pm.user_id
      JOIN projects pr ON pm.project_id = pr.id
      WHERE pr.lead_id = auth.uid()
    )
  )
);

-- Superior read access for personal_workspaces table too
CREATE POLICY "workspace_superior_select" ON public.personal_workspaces
FOR SELECT USING (
  (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) = 1
    AND user_id IN (
      SELECT id FROM profiles WHERE organization_id = get_user_organization_id(auth.uid())
    )
  )
  OR
  (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) = 2
    AND user_id IN (
      SELECT mm.user_id FROM mission_members mm
      JOIN missions m ON mm.mission_id = m.id
      WHERE m.director_id = auth.uid() OR m.chief_id = auth.uid()
    )
  )
  OR
  (
    user_id IN (
      SELECT pm.user_id FROM project_members pm
      JOIN projects pr ON pm.project_id = pr.id
      WHERE pr.lead_id = auth.uid()
    )
  )
);

-- Create workspace storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('workspace', 'workspace', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for workspace bucket
CREATE POLICY "workspace_storage_select" ON storage.objects
FOR SELECT USING (bucket_id = 'workspace' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "workspace_storage_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'workspace' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "workspace_storage_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'workspace' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "workspace_storage_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'workspace' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Superior read access for workspace storage
CREATE POLICY "workspace_storage_superior_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'workspace'
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR (storage.foldername(name))[1]::uuid IN (
      SELECT pm.user_id FROM project_members pm
      JOIN projects pr ON pm.project_id = pr.id
      WHERE pr.lead_id = auth.uid()
    )
  )
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_workspace_files_workspace ON workspace_files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_files_folder ON workspace_files(folder_path);
CREATE INDEX IF NOT EXISTS idx_workspace_files_sync ON workspace_files(sync_status);
