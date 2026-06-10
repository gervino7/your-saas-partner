CREATE OR REPLACE FUNCTION public.prepare_mission_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _year text := to_char(now(), 'YYYY');
BEGIN
  IF _user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.organization_id
    INTO _org_id
  FROM public.profiles p
  WHERE p.id = _user_id;

  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := _org_id;
  END IF;

  IF NEW.priority = 'urgent' THEN
    NEW.priority := 'critical';
  END IF;

  IF NEW.priority IS NULL OR NEW.priority NOT IN ('low', 'medium', 'high', 'critical') THEN
    NEW.priority := 'medium';
  END IF;

  IF NEW.budget_currency IS NULL OR NEW.budget_currency NOT IN ('XOF', 'XAF', 'EUR', 'USD') THEN
    NEW.budget_currency := 'XOF';
  END IF;

  IF NEW.status IS NULL OR NEW.status NOT IN ('draft', 'planning', 'active', 'on_hold', 'completed', 'archived') THEN
    NEW.status := 'draft';
  END IF;

  IF NEW.code IS NULL OR trim(NEW.code) = '' THEN
    SELECT 'MIS-' || _year || '-' || lpad((COUNT(*) + 1)::text, 3, '0')
      INTO NEW.code
    FROM public.missions m
    WHERE m.organization_id = NEW.organization_id
      AND m.code LIKE 'MIS-' || _year || '-%';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_mission_members_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NOT NULL THEN
    INSERT INTO public.mission_members (mission_id, user_id, role)
    VALUES (
      NEW.id,
      _user_id,
      CASE
        WHEN _user_id = NEW.director_id THEN 'director'
        WHEN _user_id = NEW.chief_id THEN 'chief'
        ELSE 'member'
      END
    )
    ON CONFLICT (mission_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  IF NEW.director_id IS NOT NULL THEN
    INSERT INTO public.mission_members (mission_id, user_id, role)
    VALUES (NEW.id, NEW.director_id, 'director')
    ON CONFLICT (mission_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  IF NEW.chief_id IS NOT NULL THEN
    INSERT INTO public.mission_members (mission_id, user_id, role)
    VALUES (NEW.id, NEW.chief_id, 'chief')
    ON CONFLICT (mission_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_mission_before_insert ON public.missions;
CREATE TRIGGER trg_prepare_mission_before_insert
BEFORE INSERT ON public.missions
FOR EACH ROW
EXECUTE FUNCTION public.prepare_mission_before_insert();

DROP TRIGGER IF EXISTS trg_add_mission_members_after_insert ON public.missions;
CREATE TRIGGER trg_add_mission_members_after_insert
AFTER INSERT ON public.missions
FOR EACH ROW
EXECUTE FUNCTION public.add_mission_members_after_insert();

REVOKE ALL ON FUNCTION public.prepare_mission_before_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prepare_mission_before_insert() FROM anon;
REVOKE ALL ON FUNCTION public.add_mission_members_after_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_mission_members_after_insert() FROM anon;
GRANT EXECUTE ON FUNCTION public.prepare_mission_before_insert() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_mission_members_after_insert() TO authenticated, service_role;

DROP POLICY IF EXISTS missions_insert_simple ON public.missions;
DROP POLICY IF EXISTS missions_insert_v4_secure ON public.missions;
DROP POLICY IF EXISTS missions_insert_v3 ON public.missions;
DROP POLICY IF EXISTS missions_insert_v2 ON public.missions;
DROP POLICY IF EXISTS missions_insert ON public.missions;
DROP POLICY IF EXISTS missions_org_insert ON public.missions;

CREATE POLICY missions_insert_resilient
ON public.missions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND organization_id = public.get_user_organization_id(auth.uid())
  AND public.can_create_mission(auth.uid(), organization_id)
);