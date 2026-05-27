
CREATE OR REPLACE FUNCTION public.create_organization_for_current_user(
  _name text,
  _slug text,
  _subscription_plan text DEFAULT 'free'::text,
  _max_users integer DEFAULT 5,
  _max_storage_gb integer DEFAULT 5,
  _settings jsonb DEFAULT '{}'::jsonb,
  _full_name text DEFAULT NULL::text,
  _phone text DEFAULT NULL::text
)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _email text;
  _existing_org_id uuid;
  _org public.organizations;
  _clean_name text := NULLIF(trim(_name), '');
  _base_slug text := NULLIF(trim(_slug), '');
  _final_slug text;
  _attempt int := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non authentifié';
  END IF;

  SELECT email, organization_id INTO _email, _existing_org_id
  FROM public.profiles WHERE id = _user_id;

  IF _existing_org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Votre compte est déjà rattaché à une organisation';
  END IF;

  IF _clean_name IS NULL OR length(_clean_name) < 2 THEN
    RAISE EXCEPTION 'Le nom de l''organisation est obligatoire';
  END IF;

  IF _base_slug IS NULL OR length(_base_slug) < 2 THEN
    _base_slug := lower(regexp_replace(_clean_name, '[^a-zA-Z0-9]+', '-', 'g'));
    _base_slug := trim(both '-' from _base_slug);
  END IF;
  _base_slug := lower(_base_slug);

  -- Trouver un slug unique propre (sans suffixe random) : base, base-2, base-3, ...
  _final_slug := _base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = _final_slug) LOOP
    _attempt := _attempt + 1;
    _final_slug := _base_slug || '-' || (_attempt + 1)::text;
    IF _attempt > 100 THEN
      _final_slug := _base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.organizations (name, slug, subscription_plan, max_users, max_storage_gb, settings)
  VALUES (
    _clean_name, _final_slug,
    COALESCE(NULLIF(_subscription_plan, ''), 'free'),
    COALESCE(_max_users, 5),
    COALESCE(_max_storage_gb, 5),
    COALESCE(_settings, '{}'::jsonb)
  )
  RETURNING * INTO _org;

  INSERT INTO public.profiles (id, organization_id, email, full_name, phone, grade)
  VALUES (
    _user_id, _org.id,
    COALESCE(_email, ''),
    COALESCE(NULLIF(trim(_full_name), ''), split_part(COALESCE(_email, ''), '@', 1), 'Utilisateur'),
    NULLIF(trim(_phone), ''),
    'DA'
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    grade = 'DA',
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (_user_id, 'owner', _org.id)
  ON CONFLICT (user_id, role) DO UPDATE SET organization_id = EXCLUDED.organization_id;

  INSERT INTO public.personal_workspaces (user_id, organization_id)
  VALUES (_user_id, _org.id)
  ON CONFLICT DO NOTHING;

  RETURN _org;
END;
$function$;
