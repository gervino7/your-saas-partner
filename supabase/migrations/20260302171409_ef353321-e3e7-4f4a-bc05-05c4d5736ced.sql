
-- 1) Create a public function to look up invitation by token (no auth needed)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS TABLE(
  email text,
  grade text,
  organization_name text,
  organization_id uuid,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.email,
    i.grade,
    o.name AS organization_name,
    i.organization_id,
    i.status
  FROM public.invitations i
  LEFT JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = _token
    AND i.status = 'pending'
    AND (i.expires_at IS NULL OR i.expires_at > now())
  LIMIT 1;
$$;

-- 2) Replace handle_new_user to process invitation token
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation RECORD;
  _token TEXT;
  _grade TEXT;
  _grade_level INT;
BEGIN
  _token := NEW.raw_user_meta_data->>'invitation_token';

  -- Look up invitation
  IF _token IS NOT NULL AND _token != '' THEN
    SELECT * INTO _invitation
    FROM public.invitations
    WHERE token = _token
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;
  END IF;

  -- Determine grade
  _grade := COALESCE(_invitation.grade, 'AUD');
  _grade_level := CASE _grade
    WHEN 'DA' THEN 1 WHEN 'DM' THEN 2 WHEN 'CM' THEN 3 WHEN 'SUP' THEN 4
    WHEN 'AS' THEN 5 WHEN 'AUD' THEN 6 WHEN 'AJ' THEN 7 WHEN 'STG' THEN 8
    ELSE 6
  END;

  -- Create profile with org + grade from invitation
  INSERT INTO public.profiles (id, email, full_name, organization_id, grade, grade_level)
  VALUES (
    NEW.id,
    NEW.email,
    substring(
      regexp_replace(
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        '[^\w\sÀ-ÿ\-'']',
        '',
        'g'
      ),
      1, 255
    ),
    _invitation.organization_id,
    _grade,
    _grade_level
  );

  -- Create default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');

  -- Mark invitation as accepted
  IF _invitation.id IS NOT NULL THEN
    UPDATE public.invitations
    SET status = 'accepted'
    WHERE id = _invitation.id;
  END IF;

  RETURN NEW;
END;
$$;
