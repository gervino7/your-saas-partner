CREATE OR REPLACE FUNCTION public.set_project_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (
      SELECT m.organization_id
      FROM public.missions m
      WHERE m.id = NEW.mission_id
    );

    IF NEW.organization_id IS NULL THEN
      NEW.organization_id := (
        SELECT p.organization_id
        FROM public.profiles p
        WHERE p.id = auth.uid()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_project_org_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_project_org_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.set_project_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_project_org_id() TO service_role;

DROP TRIGGER IF EXISTS set_project_org_id_trigger ON public.projects;

CREATE TRIGGER set_project_org_id_trigger
BEFORE INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.set_project_org_id();