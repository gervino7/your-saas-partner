CREATE OR REPLACE FUNCTION public.add_project_members_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'lead')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  IF NEW.lead_id IS NOT NULL AND NEW.lead_id != auth.uid() THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.lead_id, 'lead')
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_project_members_after_insert ON public.projects;
CREATE TRIGGER trg_add_project_members_after_insert
AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.add_project_members_after_insert();

CREATE OR REPLACE FUNCTION public.add_mission_members_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.mission_members (mission_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'director')
  ON CONFLICT (mission_id, user_id) DO NOTHING;

  IF NEW.director_id IS NOT NULL AND NEW.director_id != auth.uid() THEN
    INSERT INTO public.mission_members (mission_id, user_id, role)
    VALUES (NEW.id, NEW.director_id, 'director')
    ON CONFLICT (mission_id, user_id) DO NOTHING;
  END IF;

  IF NEW.chief_id IS NOT NULL AND NEW.chief_id != auth.uid() AND NEW.chief_id != NEW.director_id THEN
    INSERT INTO public.mission_members (mission_id, user_id, role)
    VALUES (NEW.id, NEW.chief_id, 'chief')
    ON CONFLICT (mission_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_mission_members_after_insert ON public.missions;
CREATE TRIGGER trg_add_mission_members_after_insert
AFTER INSERT ON public.missions
FOR EACH ROW EXECUTE FUNCTION public.add_mission_members_after_insert();