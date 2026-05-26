CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _token TEXT;
  _grade TEXT := 'AUD';
  _name TEXT;
  _org_id UUID := NULL;
  _inv_id UUID := NULL;
BEGIN
  _token := NEW.raw_user_meta_data->>'invitation_token';
  IF _token IS NOT NULL AND _token <> '' THEN
    BEGIN
      SELECT id, organization_id, COALESCE(grade, 'AUD')
        INTO _inv_id, _org_id, _grade
      FROM public.invitations
      WHERE token = _token AND status = 'pending'
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  _name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1));
  IF length(_name) > 255 THEN _name := substring(_name, 1, 255); END IF;

  BEGIN
    INSERT INTO public.profiles (id, email, full_name, organization_id, grade)
    VALUES (NEW.id, NEW.email, _name, _org_id, _grade);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profiles insert failed: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, 'member', _org_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user user_roles insert failed: %', SQLERRM;
  END;

  IF _inv_id IS NOT NULL THEN
    BEGIN
      UPDATE public.invitations SET status = 'accepted' WHERE id = _inv_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  RETURN NEW;
END;
$$;