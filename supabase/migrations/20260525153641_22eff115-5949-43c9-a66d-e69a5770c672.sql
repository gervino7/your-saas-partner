-- Add organization_id columns
ALTER TABLE public.timesheets ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.personal_workspaces ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.committees ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Backfill organization_id from parent tables
UPDATE public.timesheets t SET organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = t.user_id) WHERE t.organization_id IS NULL;
UPDATE public.expenses e SET organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = e.user_id) WHERE e.organization_id IS NULL;
UPDATE public.personal_workspaces pw SET organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = pw.user_id) WHERE pw.organization_id IS NULL;
UPDATE public.user_roles ur SET organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = ur.user_id) WHERE ur.organization_id IS NULL;
UPDATE public.tasks t SET organization_id = (SELECT p.organization_id FROM public.projects p WHERE p.id = t.project_id) WHERE t.organization_id IS NULL;
UPDATE public.activities a SET organization_id = (SELECT p.organization_id FROM public.projects p WHERE p.id = a.project_id) WHERE a.organization_id IS NULL;
UPDATE public.committees c SET organization_id = (SELECT m.organization_id FROM public.missions m WHERE m.id = c.mission_id) WHERE c.organization_id IS NULL;

-- Org isolation policies (add alongside existing ones)
DROP POLICY IF EXISTS "timesheets_org_isolation" ON public.timesheets;
CREATE POLICY "timesheets_org_isolation" ON public.timesheets FOR SELECT USING (organization_id = public.get_user_organization_id(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "expenses_org_isolation" ON public.expenses;
CREATE POLICY "expenses_org_isolation" ON public.expenses FOR SELECT USING (organization_id = public.get_user_organization_id(auth.uid()) OR user_id = auth.uid());

DROP POLICY IF EXISTS "user_roles_org_isolation" ON public.user_roles;
CREATE POLICY "user_roles_org_isolation" ON public.user_roles FOR SELECT USING (organization_id = public.get_user_organization_id(auth.uid()) OR user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timesheets_org ON public.timesheets(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_org ON public.activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_committees_org ON public.committees(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON public.user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_personal_workspaces_org ON public.personal_workspaces(organization_id);

-- Auto-fill trigger
CREATE OR REPLACE FUNCTION public.auto_set_org_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_organization_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_org_id_timesheets ON public.timesheets;
CREATE TRIGGER set_org_id_timesheets BEFORE INSERT ON public.timesheets FOR EACH ROW EXECUTE FUNCTION public.auto_set_org_id();
DROP TRIGGER IF EXISTS set_org_id_expenses ON public.expenses;
CREATE TRIGGER set_org_id_expenses BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.auto_set_org_id();
DROP TRIGGER IF EXISTS set_org_id_tasks ON public.tasks;
CREATE TRIGGER set_org_id_tasks BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.auto_set_org_id();
DROP TRIGGER IF EXISTS set_org_id_activities ON public.activities;
CREATE TRIGGER set_org_id_activities BEFORE INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.auto_set_org_id();
DROP TRIGGER IF EXISTS set_org_id_committees ON public.committees;
CREATE TRIGGER set_org_id_committees BEFORE INSERT ON public.committees FOR EACH ROW EXECUTE FUNCTION public.auto_set_org_id();
DROP TRIGGER IF EXISTS set_org_id_user_roles ON public.user_roles;
CREATE TRIGGER set_org_id_user_roles BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.auto_set_org_id();
DROP TRIGGER IF EXISTS set_org_id_personal_workspaces ON public.personal_workspaces;
CREATE TRIGGER set_org_id_personal_workspaces BEFORE INSERT ON public.personal_workspaces FOR EACH ROW EXECUTE FUNCTION public.auto_set_org_id();

-- Super admin RPC
CREATE OR REPLACE FUNCTION public.super_admin_get_all_orgs()
RETURNS TABLE(
  id uuid, name text, slug text, subscription_plan text, max_users int,
  max_storage_gb int, created_at timestamptz,
  user_count bigint, mission_count bigint
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.name, o.slug, o.subscription_plan, o.max_users,
    o.max_storage_gb, o.created_at,
    (SELECT count(*) FROM public.profiles p WHERE p.organization_id = o.id) as user_count,
    (SELECT count(*) FROM public.missions m WHERE m.organization_id = o.id) as mission_count
  FROM public.organizations o
  ORDER BY o.created_at DESC;
$$;