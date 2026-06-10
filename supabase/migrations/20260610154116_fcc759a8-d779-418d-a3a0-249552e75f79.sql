
CREATE OR REPLACE FUNCTION public.set_org_id_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (SELECT organization_id FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_org_missions ON public.missions;
CREATE TRIGGER set_org_missions BEFORE INSERT ON public.missions FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user();

DROP TRIGGER IF EXISTS set_org_projects ON public.projects;
CREATE TRIGGER set_org_projects BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user();

DROP TRIGGER IF EXISTS set_org_tasks ON public.tasks;
CREATE TRIGGER set_org_tasks BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user();

DROP TRIGGER IF EXISTS set_org_activities ON public.activities;
CREATE TRIGGER set_org_activities BEFORE INSERT ON public.activities FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user();

DROP TRIGGER IF EXISTS set_org_documents ON public.documents;
CREATE TRIGGER set_org_documents BEFORE INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user();

DROP TRIGGER IF EXISTS set_org_committees ON public.committees;
CREATE TRIGGER set_org_committees BEFORE INSERT ON public.committees FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user();

DROP TRIGGER IF EXISTS set_org_timesheets ON public.timesheets;
CREATE TRIGGER set_org_timesheets BEFORE INSERT ON public.timesheets FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user();

DROP TRIGGER IF EXISTS set_org_expenses ON public.expenses;
CREATE TRIGGER set_org_expenses BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_user();
