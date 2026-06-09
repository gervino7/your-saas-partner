CREATE OR REPLACE FUNCTION public.create_mission_with_members(
  _name text,
  _description text DEFAULT NULL,
  _type text DEFAULT NULL,
  _client_id uuid DEFAULT NULL,
  _director_id uuid DEFAULT NULL,
  _chief_id uuid DEFAULT NULL,
  _budget_amount numeric DEFAULT NULL,
  _budget_currency text DEFAULT 'XOF',
  _start_date date DEFAULT NULL,
  _end_date date DEFAULT NULL,
  _priority text DEFAULT 'medium'
)
RETURNS public.missions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _grade_level integer;
  _mission public.missions;
  _code text;
  _year text := to_char(now(), 'YYYY');
  _priority_clean text := COALESCE(NULLIF(_priority, ''), 'medium');
  _currency_clean text := COALESCE(NULLIF(_budget_currency, ''), 'XOF');
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

  IF _grade_level > 3 THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de créer une mission';
  END IF;

  IF NULLIF(trim(_name), '') IS NULL THEN
    RAISE EXCEPTION 'Le nom de la mission est obligatoire';
  END IF;

  IF _priority_clean = 'urgent' THEN
    _priority_clean := 'critical';
  END IF;

  IF _priority_clean NOT IN ('low', 'medium', 'high', 'critical') THEN
    _priority_clean := 'medium';
  END IF;

  IF _currency_clean NOT IN ('XOF', 'XAF', 'EUR', 'USD') THEN
    _currency_clean := 'XOF';
  END IF;

  IF _client_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = _client_id AND c.organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Le client sélectionné est invalide pour votre organisation';
  END IF;

  IF _director_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = _director_id AND p.organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Le Directeur de Mission sélectionné est invalide pour votre organisation';
  END IF;

  IF _chief_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = _chief_id AND p.organization_id = _org_id
  ) THEN
    RAISE EXCEPTION 'Le Chef de Mission sélectionné est invalide pour votre organisation';
  END IF;

  SELECT 'MIS-' || _year || '-' || lpad((COUNT(*) + 1)::text, 3, '0')
    INTO _code
  FROM public.missions m
  WHERE m.organization_id = _org_id
    AND m.code LIKE 'MIS-' || _year || '-%';

  INSERT INTO public.missions (
    organization_id,
    client_id,
    name,
    description,
    code,
    type,
    status,
    director_id,
    chief_id,
    budget_amount,
    budget_currency,
    start_date,
    end_date,
    priority
  ) VALUES (
    _org_id,
    _client_id,
    trim(_name),
    NULLIF(trim(COALESCE(_description, '')), ''),
    _code,
    NULLIF(_type, ''),
    'draft',
    _director_id,
    _chief_id,
    _budget_amount,
    _currency_clean,
    _start_date,
    _end_date,
    _priority_clean
  )
  RETURNING * INTO _mission;

  INSERT INTO public.mission_members (mission_id, user_id, role)
  VALUES (_mission.id, _user_id, CASE WHEN _user_id = _director_id THEN 'director' WHEN _user_id = _chief_id THEN 'chief' ELSE 'member' END)
  ON CONFLICT (mission_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  IF _director_id IS NOT NULL THEN
    INSERT INTO public.mission_members (mission_id, user_id, role)
    VALUES (_mission.id, _director_id, 'director')
    ON CONFLICT (mission_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  IF _chief_id IS NOT NULL THEN
    INSERT INTO public.mission_members (mission_id, user_id, role)
    VALUES (_mission.id, _chief_id, 'chief')
    ON CONFLICT (mission_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;

  RETURN _mission;
END;
$$;

REVOKE ALL ON FUNCTION public.create_mission_with_members(text, text, text, uuid, uuid, uuid, numeric, text, date, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_mission_with_members(text, text, text, uuid, uuid, uuid, numeric, text, date, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_mission_with_members(text, text, text, uuid, uuid, uuid, numeric, text, date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_mission_with_members(text, text, text, uuid, uuid, uuid, numeric, text, date, date, text) TO service_role;