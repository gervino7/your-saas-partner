
-- Add missing columns to activities table per PRD
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS path TEXT,
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_end_date DATE,
  ADD COLUMN IF NOT EXISTS actual_start_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE,
  ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add UPDATE policy for activities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'activities_update') THEN
    EXECUTE 'CREATE POLICY "activities_update" ON public.activities FOR UPDATE USING (
      project_id IN (
        SELECT projects.id FROM projects
        WHERE projects.organization_id = get_user_organization_id(auth.uid())
      )
    )';
  END IF;
END $$;

-- Add DELETE policy for activities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'activities_delete') THEN
    EXECUTE 'CREATE POLICY "activities_delete" ON public.activities FOR DELETE USING (
      project_id IN (
        SELECT projects.id FROM projects
        WHERE projects.organization_id = get_user_organization_id(auth.uid())
      )
    )';
  END IF;
END $$;

-- Indexes for hierarchical navigation
CREATE INDEX IF NOT EXISTS idx_activities_parent ON activities(parent_id);
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_depth ON activities(depth);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
