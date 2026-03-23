CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _invitation RECORD;
  _token TEXT;
  _grade TEXT;
BEGIN
  _token := NEW.raw_user_meta_data->>'invitation_token';

  IF _token IS NOT NULL AND _token != '' THEN
    SELECT * INTO _invitation
    FROM public.invitations
    WHERE token = _token
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;
  END IF;

  _grade := COALESCE(_invitation.grade, 'AUD');

  INSERT INTO public.profiles (id, email, full_name, organization_id, grade)
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
    _grade
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');

  IF _invitation.id IS NOT NULL THEN
    UPDATE public.invitations
    SET status = 'accepted'
    WHERE id = _invitation.id;
  END IF;

  RETURN NEW;
END;
$function$;