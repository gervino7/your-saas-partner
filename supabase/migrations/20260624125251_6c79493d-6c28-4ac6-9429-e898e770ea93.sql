-- Ensure the app roles can reach project tables through the Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;

-- Backend-safe project creation: creates the project and its memberships atomically.
CREATE OR REPLACE FUNCTION public.create_project_with_members(
  _mission_id uuid,
  _name text,
  _description text DEFAULT NULL,
  _lead_id uuid DEFAULT NULL,
  _budget_allocated numeric DEFAULT NULL,
  _start_date date DEFAULT NULL,
  _end_date date DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _grade_level integer;
  _mission_org_id uuid;
  _project public.projects;
  _code text;
  _year text := to_char(now(), 'YYYY');
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  SELECT p.organization_id, COALESCE(p.grade_level, 8)
    INTO _org_id, _grade_level
  FROM public.profiles p
  WHERE p.id = _user_id;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Votre profil n''est rattaché à aucune organisation';
  END IF;

  SELECT m.organization_id
    INTO _mission_org_id
  FROM public.missions m
  WHERE m.id = _mission_id;

  IF _mission_org_id IS NULL THEN
    RAISE EXCEPTION 'Mission introuvable';
  END IF;

  IF _mission_org_id <> _org_id THEN
    RAISE EXCEPTION 'La mission sélectionnée est invalide pour votre organisation';
  END IF;

  IF _grade_level > 3 AND NOT public.can_access_mission(_user_id, _mission_id) THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de créer un projet sur cette mission';
  END IF;

  IF NULLIF(trim(_name), '') IS NULL THEN
    RAISE EXCEPTION 'Le nom du projet est obligatoire';
  END IF;

  IF _lead_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = _lead_id AND p.organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Le chef de projet sélectionné est invalide pour votre organisation';
  END IF;

  SELECT 'PRJ-' || _year || '-' || lpad((COUNT(*) + 1)::text, 3, '0')
    INTO _code
  FROM public.projects p
  WHERE p.mission_id = _mission_id
    AND p.code LIKE 'PRJ-' || _year || '-%';

  INSERT INTO public.projects (
    mission_id,
    organization_id,
    name,
    description,
    code,
    status,
    lead_id,
    budget_allocated,
    start_date,
    end_date
  ) VALUES (
    _mission_id,
    _org_id,
    trim(_name),
    NULLIF(trim(COALESCE(_description, '')), ''),
    _code,
    'planning',
    _lead_id,
    COALESCE(_budget_allocated, 0),
    _start_date,
    _end_date
  )
  RETURNING * INTO _project;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (
    _project.id,
    _user_id,
    CASE WHEN _lead_id = _user_id THEN 'lead' ELSE 'member' END
  )
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  IF _lead_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (_project.id, _lead_id, 'lead')
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RETURN _project;
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_with_members(uuid, text, text, uuid, numeric, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_project_with_members(uuid, text, text, uuid, numeric, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_project_with_members(uuid, text, text, uuid, numeric, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_with_members(uuid, text, text, uuid, numeric, date, date) TO service_role;

-- Safety net for direct inserts: fill organization/code/status before RLS checks.
CREATE OR REPLACE FUNCTION public.prepare_project_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _mission_org_id uuid;
  _year text := to_char(now(), 'YYYY');
BEGIN
  IF _user_id IS NOT NULL THEN
    SELECT p.organization_id INTO _org_id
    FROM public.profiles p
    WHERE p.id = _user_id;
  END IF;

  IF NEW.mission_id IS NOT NULL THEN
    SELECT m.organization_id INTO _mission_org_id
    FROM public.missions m
    WHERE m.id = NEW.mission_id;
  END IF;

  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := COALESCE(_mission_org_id, _org_id);
  END IF;

  IF NEW.status IS NULL OR NEW.status NOT IN ('planning', 'active', 'on_hold', 'review', 'completed', 'archived') THEN
    NEW.status := 'planning';
  END IF;

  IF NEW.budget_allocated IS NULL THEN
    NEW.budget_allocated := 0;
  END IF;

  IF NEW.code IS NULL OR trim(NEW.code) = '' THEN
    SELECT 'PRJ-' || _year || '-' || lpad((COUNT(*) + 1)::text, 3, '0')
      INTO NEW.code
    FROM public.projects p
    WHERE p.mission_id = NEW.mission_id
      AND p.code LIKE 'PRJ-' || _year || '-%';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_project_members_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (
      NEW.id,
      _user_id,
      CASE WHEN NEW.lead_id = _user_id THEN 'lead' ELSE 'member' END
    )
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  IF NEW.lead_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.lead_id, 'lead')
    ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_project_before_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_project_before_insert() FROM anon;
GRANT EXECUTE ON FUNCTION public.prepare_project_before_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_project_before_insert() TO service_role;

REVOKE ALL ON FUNCTION public.add_project_members_after_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_project_members_after_insert() FROM anon;
GRANT EXECUTE ON FUNCTION public.add_project_members_after_insert() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_project_members_after_insert() TO service_role;

DROP TRIGGER IF EXISTS set_org_projects ON public.projects;
DROP TRIGGER IF EXISTS trg_prepare_project_before_insert ON public.projects;
CREATE TRIGGER trg_prepare_project_before_insert
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.prepare_project_before_insert();

DROP TRIGGER IF EXISTS trg_add_project_members_after_insert ON public.projects;
CREATE TRIGGER trg_add_project_members_after_insert
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.add_project_members_after_insert();

-- Replace project creation rules with one explicit, consistent rule.
DROP POLICY IF EXISTS projects_insert ON public.projects;
DROP POLICY IF EXISTS projects_org_insert ON public.projects;
DROP POLICY IF EXISTS projects_insert_resilient ON public.projects;

CREATE POLICY projects_insert_resilient
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND organization_id = public.get_user_organization_id(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.missions m
    WHERE m.id = mission_id
      AND m.organization_id = organization_id
  )
  AND (
    public.get_user_grade_level(auth.uid()) <= 3
    OR public.can_access_mission(auth.uid(), mission_id)
  )
);