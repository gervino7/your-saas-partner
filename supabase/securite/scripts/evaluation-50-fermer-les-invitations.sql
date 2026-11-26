-- ═══════════════════════════════════════════════════════════════════════════
--  MISSION-DGC · SCRIPT 50 — FERMER LES INVITATIONS
--  Un seul tableau en sortie : l'éditeur Supabase n'affiche que le dernier.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  LA FAILLE
--  ---------
--  La seule règle qui garde la table des invitations vérifie que l'invitant
--  est bien celui qui écrit (invited_by = auth.uid()). Elle ne contrôle ni le
--  cabinet, ni le grade, ni le rang de l'invitant. Le jeton est choisi par le
--  navigateur. À l'inscription, le jeton suffit : l'adresse n'est pas comparée
--  à celle de l'invitation, et l'invitation n'est jamais marquée utilisée.
--
--  Conséquence prouvée sur la copie de test : un stagiaire s'invite lui-même
--  au grade DA, dans son cabinet ou dans un autre, et s'inscrit avec le jeton.
--
--  CE QUE CE SCRIPT POSE
--  ---------------------
--  1. Qui peut inviter : le DA de ce cabinet, à tout grade ; le directeur de
--     mission de ce cabinet, à un grade inférieur au sien (MGR et en dessous) ;
--     un administrateur de la plateforme, partout (pour le premier DA d'un
--     cabinet). Personne d'autre.
--  2. Le serveur fixe lui-même : statut « en attente », invitant = l'appelant,
--     expiration à 7 jours, rôle « member », adresse en minuscules. Un jeton de
--     moins de 32 caractères est refusé (l'application en envoie 36).
--  3. À l'inscription, l'invitation ne sert que pour l'adresse invitée, et elle
--     est marquée « acceptée ». Elle ne peut plus ouvrir un second compte.
--
--  CE QU'IL NE CHANGE PAS
--  ----------------------
--  L'écran d'invitation de l'application fonctionne tel quel. L'inscription
--  publique reste ouverte : la fermer est l'étape suivante (prompt Lovable et
--  réglage Supabase), après la décision « vous seul créez les cabinets ».
--
--  Idempotent : se rejoue en entier sans dégât. Les essais du bloc 3 s'annulent d'eux-mêmes : rien n'est
--  écrit dans vos données.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 1 — LA RÈGLE
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Le niveau d'un code de grade, identique au calcul de profiles.grade_level.
CREATE OR REPLACE FUNCTION public.niveau_du_grade(_grade text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _grade
    WHEN 'DA'  THEN 1  WHEN 'DM'  THEN 2  WHEN 'MGR' THEN 3  WHEN 'SUP' THEN 4
    WHEN 'AS'  THEN 5  WHEN 'AUD' THEN 6  WHEN 'AJ'  THEN 7  WHEN 'STG' THEN 8
    ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.peut_inviter(_organization_id uuid, _grade text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cible  integer := public.niveau_du_grade(_grade);
  _org    uuid;
  _niveau integer;
BEGIN
  IF auth.uid() IS NULL OR _cible IS NULL OR _organization_id IS NULL THEN
    RETURN false;
  END IF;

  -- L'administrateur de la plateforme crée le premier DA d'un cabinet.
  IF public.is_platform_admin('admin') THEN
    RETURN true;
  END IF;

  SELECT organization_id, grade_level INTO _org, _niveau
  FROM public.profiles WHERE id = auth.uid();

  IF _org IS DISTINCT FROM _organization_id THEN
    RETURN false;                                  -- jamais dans un autre cabinet
  END IF;

  RETURN _niveau = 1                               -- le DA : tout grade
      OR (_niveau = 2 AND _cible > 2);             -- le DM : sous son grade
END;
$$;

REVOKE ALL ON FUNCTION public.peut_inviter(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.peut_inviter(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.niveau_du_grade(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.niveau_du_grade(text) TO authenticated;

DROP POLICY IF EXISTS "invitations_org_insert"        ON public.invitations;
DROP POLICY IF EXISTS "invitations_par_qui_de_droit"  ON public.invitations;
CREATE POLICY "invitations_par_qui_de_droit" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid()
              AND public.peut_inviter(organization_id, grade));

-- Ce que le navigateur n'a pas à décider.
CREATE OR REPLACE FUNCTION public.encadrer_invitation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.token IS NULL OR length(NEW.token) < 32 THEN
    RAISE EXCEPTION 'Jeton d''invitation trop court : 32 caracteres au moins.';
  END IF;
  NEW.email      := lower(trim(NEW.email));
  NEW.status     := 'pending';
  NEW.role       := 'member';
  NEW.expires_at := now() + interval '7 days';
  NEW.created_at := now();
  IF auth.uid() IS NOT NULL THEN
    NEW.invited_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encadrer_invitation ON public.invitations;
CREATE TRIGGER trg_encadrer_invitation
  BEFORE INSERT ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.encadrer_invitation();

-- L'inscription : la version de production, avec deux changements seulement
-- (repérés « SCRIPT 50 »).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _token TEXT;
  _grade TEXT := 'AUD';
  _name TEXT;
  _org_id UUID := NULL;
  _inv_id UUID := NULL;
BEGIN
  -- Les comptes clients (espace client) ne reçoivent PAS de profil cabinet.
  -- Leur ligne portal_users est créée séparément par le flux d'invitation.
  IF NEW.raw_user_meta_data->>'account_type' = 'portal_client' THEN
    RETURN NEW;
  END IF;

  _token := NEW.raw_user_meta_data->>'invitation_token';
  IF _token IS NOT NULL AND _token <> '' THEN
    BEGIN
      SELECT i.id, i.organization_id, COALESCE(i.grade, 'AUD')
        INTO _inv_id, _org_id, _grade
      FROM public.invitations i
      WHERE i.token = _token
        -- SCRIPT 50 : l'invitation ne vaut que pour l'adresse invitée...
        AND lower(i.email) = lower(NEW.email)
        AND (i.expires_at IS NULL OR i.expires_at > now())
        -- ... et une seule fois. Une invitation acceptée ne resert que si le
        -- compte qu'elle a ouvert a disparu (renvoi du courriel de confirmation).
        AND (i.status = 'pending'
             OR (i.status = 'accepted'
                 AND NOT EXISTS (SELECT 1 FROM public.profiles p
                                 WHERE lower(p.email) = lower(NEW.email))))
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

  -- SCRIPT 50 : l'invitation est consommée.
  IF _inv_id IS NOT NULL THEN
    BEGIN
      UPDATE public.invitations SET status = 'accepted' WHERE id = _inv_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 2 — LES ESSAIS (tout est annulé à la fin de chaque essai)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.essai_invitations_50()
RETURNS TABLE (n int, etat text, controle text, detail text)
LANGUAGE plpgsql AS $$
DECLARE
  _org   uuid;
  _da    uuid;
  _dm    uuid;
  _bas   uuid;
  _da_simple uuid;   -- un DA qui n'est pas administrateur de la plateforme
  _autre uuid := gen_random_uuid();
  _jeton text := 'essai-script-50-' || replace(gen_random_uuid()::text, '-', '');
  _ok    boolean;
  _msg   text;
  _r     record;
  _auth_ok boolean := true;

BEGIN
  -- Le cabinet le plus peuplé qui a un DA, et ses comptes d'essai.
  SELECT p.organization_id INTO _org
  FROM public.profiles p
  WHERE p.organization_id IS NOT NULL
  GROUP BY p.organization_id
  HAVING bool_or(p.grade = 'DA')
  ORDER BY count(*) DESC LIMIT 1;

  SELECT id INTO _da  FROM public.profiles WHERE organization_id = _org AND grade = 'DA' LIMIT 1;
  SELECT id INTO _dm  FROM public.profiles WHERE organization_id = _org AND grade = 'DM' LIMIT 1;
  SELECT id INTO _bas FROM public.profiles WHERE organization_id = _org AND grade_level >= 5
                       ORDER BY grade_level DESC LIMIT 1;
  -- L'administrateur de la plateforme invite partout, par construction :
  -- l'essai 7 doit donc porter sur un DA qui ne l'est pas.
  SELECT p.id INTO _da_simple FROM public.profiles p
  WHERE p.grade = 'DA'
    AND NOT EXISTS (SELECT 1 FROM public.platform_admins pa
                    WHERE pa.user_id = p.id AND pa.is_active)
  LIMIT 1;

  -- Chaque essai : (compte, cabinet visé, grade visé, jeton, résultat attendu)
  FOR _r IN
    SELECT * FROM (VALUES
      (1, 'Un collaborateur de terrain ne peut pas s''inviter DA',      _bas, _org,   'DA',  _jeton, false),
      (2, 'Un collaborateur de terrain ne peut inviter personne',       _bas, _org,   'STG', _jeton, false),
      (3, 'Le DM ne peut pas inviter un DA',                            _dm,  _org,   'DA',  _jeton, false),
      (4, 'Le DM ne peut pas inviter un autre DM',                      _dm,  _org,   'DM',  _jeton, false),
      (5, 'Le DM peut inviter un auditeur',                             _dm,  _org,   'AUD', _jeton, true),
      (6, 'Le DA peut inviter un DA (co-associe)',                      _da,  _org,   'DA',  _jeton, true),
      (7, 'Un DA ne peut pas inviter dans un autre cabinet',            _da_simple, _autre, 'AUD', _jeton, false),
      (8, 'Un jeton court est refuse',                                  _da,  _org,   'AUD', 'abc',  false),
      (9, 'Un grade inconnu est refuse',                                _da,  _org,   'XYZ', _jeton, false)
    ) AS v(num, libelle, uid, org, grade, jeton, attendu)
  LOOP
    IF _r.uid IS NULL THEN
      n := _r.num; etat := 'SANS OBJET'; controle := _r.libelle;
      detail := 'aucun compte de ce grade dans le cabinet d''essai';
      RETURN NEXT; CONTINUE;
    END IF;

    _ok := false; _msg := NULL;
    BEGIN
      IF _r.org = _autre THEN   -- un second cabinet, le temps de l'essai
        INSERT INTO public.organizations (id, name, slug) VALUES (_autre, 'Essai 50', 'essai-50-' || _autre);
      END IF;
      PERFORM set_config('request.jwt.claim.sub', _r.uid::text, true);
      PERFORM set_config('request.jwt.claims',
                         json_build_object('sub', _r.uid, 'role', 'authenticated')::text, true);
      PERFORM set_config('role', 'authenticated', true);
      INSERT INTO public.invitations (organization_id, email, invited_by, grade, token)
      VALUES (_r.org, 'essai-50@exemple.invalid', _r.uid, _r.grade, _r.jeton);
      _ok := true;
      RAISE EXCEPTION 'ANNULATION_VOULUE';
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('role', 'postgres', true);
      IF SQLERRM <> 'ANNULATION_VOULUE' THEN _msg := SQLERRM; END IF;
    END;

    n := _r.num; controle := _r.libelle;
    etat   := CASE WHEN _ok = _r.attendu THEN 'OK' ELSE '**ECHEC**' END;
    detail := CASE WHEN _ok THEN 'invitation acceptee' ELSE 'refusee : ' || left(_msg, 80) END;
    RETURN NEXT;
  END LOOP;

  -- L'inscription : une invitation au nom de A ne sert pas à B, et sert une fois.
  _ok := NULL; _msg := NULL;
  BEGIN
    INSERT INTO public.invitations (organization_id, email, invited_by, grade, token)
    VALUES (_org, 'invite-50@exemple.invalid', _da, 'AUD', _jeton);

    BEGIN
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (gen_random_uuid(), 'autre-50@exemple.invalid',
              json_build_object('invitation_token', _jeton)::jsonb);
    EXCEPTION WHEN insufficient_privilege THEN
      _auth_ok := false;
    END;

    IF _auth_ok THEN
      -- B (autre adresse) : sans cabinet
      _ok := NOT EXISTS (SELECT 1 FROM public.profiles
                         WHERE email = 'autre-50@exemple.invalid' AND organization_id IS NOT NULL);
      -- A (adresse invitée) : dans le cabinet, au grade prévu
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (gen_random_uuid(), 'invite-50@exemple.invalid',
              json_build_object('invitation_token', _jeton)::jsonb);
      _ok := _ok AND EXISTS (SELECT 1 FROM public.profiles
                             WHERE email = 'invite-50@exemple.invalid'
                               AND organization_id = _org AND grade = 'AUD');
      _ok := _ok AND (SELECT status FROM public.invitations WHERE token = _jeton) = 'accepted';
      -- C : le même jeton ne rouvre rien
      INSERT INTO auth.users (id, email, raw_user_meta_data)
      VALUES (gen_random_uuid(), 'troisieme-50@exemple.invalid',
              json_build_object('invitation_token', _jeton)::jsonb);
      _ok := _ok AND NOT EXISTS (SELECT 1 FROM public.profiles
                                 WHERE email = 'troisieme-50@exemple.invalid'
                                   AND organization_id IS NOT NULL);
    END IF;
    RAISE EXCEPTION 'ANNULATION_VOULUE';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'ANNULATION_VOULUE' THEN _msg := SQLERRM; END IF;
  END;

  n := 10; controle := 'Inscription : l''adresse invitee seule, et une seule fois';
  IF NOT _auth_ok THEN
    etat := 'NON TESTABLE'; detail := 'l''editeur ne peut pas creer de compte ; verifie par le controle 11';
  ELSIF _msg IS NOT NULL THEN
    etat := '**ECHEC**'; detail := left(_msg, 100);
  ELSE
    etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END;
    detail := 'autre adresse : sans cabinet ; adresse invitee : AUD ; jeton reutilise : sans cabinet';
  END IF;
  RETURN NEXT;

  n := 11; controle := 'La fonction d''inscription compare l''adresse et consomme l''invitation';
  _ok := (SELECT prosrc FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure)
           ~ 'lower\(i\.email\) = lower\(NEW\.email\)'
     AND (SELECT prosrc FROM pg_proc WHERE oid = 'public.handle_new_user()'::regprocedure)
           ~ 'SET status = ''accepted''';
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END; detail := NULL;
  RETURN NEXT;

  n := 12; controle := 'L''ancienne regle d''insertion a disparu';
  _ok := NOT EXISTS (SELECT 1 FROM pg_policies
                     WHERE tablename = 'invitations' AND cmd IN ('INSERT', 'ALL')
                       AND permissive = 'PERMISSIVE'
                       AND policyname <> 'invitations_par_qui_de_droit');
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END;
  detail := (SELECT string_agg(policyname || ' (' || cmd || ')', ', ')
             FROM pg_policies WHERE tablename = 'invitations');
  RETURN NEXT;

  n := 13; controle := 'Le niveau des grades est le meme que celui des profils';
  _ok := NOT EXISTS (SELECT 1 FROM public.profiles
                     WHERE grade IS NOT NULL
                       AND public.niveau_du_grade(grade) IS DISTINCT FROM grade_level);
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END; detail := NULL;
  RETURN NEXT;

  -- ── LE PASSÉ : a-t-on déjà profité de la faille ? ──────────────────────
  n := 20; controle := 'PASSE — invitations faites par quelqu''un qui n''en avait pas le droit';
  SELECT count(*), string_agg(i.email || ' -> ' || i.grade || ' par ' || COALESCE(p.full_name, '?')
                              || ' (' || COALESCE(p.grade, '?') || ')', ' ; ')
    INTO _r
  FROM public.invitations i
  LEFT JOIN public.profiles p ON p.id = i.invited_by
  WHERE p.id IS NULL
     OR p.organization_id IS DISTINCT FROM i.organization_id
     OR NOT (p.grade_level = 1 OR (p.grade_level = 2 AND public.niveau_du_grade(i.grade) > 2));
  etat := CASE WHEN _r.count = 0 THEN 'RIEN' ELSE '**A VERIFIER**' END;
  detail := _r.count || ' invitation(s)' || COALESCE(' : ' || left(_r.string_agg, 400), '');
  RETURN NEXT;

  n := 21; controle := 'PASSE — comptes ouverts avec l''invitation d''une autre adresse';
  BEGIN
    SELECT count(*), string_agg(u.email || ' (invitation pour ' || i.email || ')', ' ; ')
      INTO _r
    FROM auth.users u
    JOIN public.invitations i ON i.token = u.raw_user_meta_data->>'invitation_token'
    WHERE lower(i.email) <> lower(u.email);
    etat := CASE WHEN _r.count = 0 THEN 'RIEN' ELSE '**A VERIFIER**' END;
    detail := _r.count || ' compte(s)' || COALESCE(' : ' || left(_r.string_agg, 400), '');
  EXCEPTION WHEN insufficient_privilege THEN
    etat := 'NON TESTABLE'; detail := 'lecture des comptes refusee a l''editeur';
  END;
  RETURN NEXT;

  n := 22; controle := 'PASSE — invitations utilisees par plusieurs comptes';
  BEGIN
    SELECT count(*), string_agg(t.email || ' : ' || t.nb || ' comptes', ' ; ') INTO _r
    FROM (SELECT i.email, count(*) AS nb
          FROM auth.users u
          JOIN public.invitations i ON i.token = u.raw_user_meta_data->>'invitation_token'
          GROUP BY i.id, i.email HAVING count(*) > 1) t;
    etat := CASE WHEN _r.count = 0 THEN 'RIEN' ELSE '**A VERIFIER**' END;
    detail := _r.count || ' invitation(s)' || COALESCE(' : ' || left(_r.string_agg, 400), '');
  EXCEPTION WHEN insufficient_privilege THEN
    etat := 'NON TESTABLE'; detail := 'lecture des comptes refusee a l''editeur';
  END;
  RETURN NEXT;

  n := 23; controle := 'PASSE — les cabinets qui existent (en reconnaissez-vous chacun ?)';
  SELECT count(*), string_agg(o.name || ' [' || o.created_at::date || ', '
                              || (SELECT count(*) FROM public.profiles p WHERE p.organization_id = o.id)
                              || ' membre(s)]', ' ; ' ORDER BY o.created_at)
    INTO _r FROM public.organizations o;
  etat := 'INFO'; detail := _r.count || ' cabinet(s) : ' || left(COALESCE(_r.string_agg, ''), 600);
  RETURN NEXT;

  n := 24; controle := 'PASSE — comptes rattaches a aucun cabinet (inscriptions libres)';
  SELECT count(*), string_agg(p.email || ' [' || p.created_at::date || ']', ' ; ') INTO _r
  FROM public.profiles p WHERE p.organization_id IS NULL;
  etat := CASE WHEN _r.count = 0 THEN 'RIEN' ELSE 'INFO' END;
  detail := _r.count || ' compte(s)' || COALESCE(' : ' || left(_r.string_agg, 400), '');
  RETURN NEXT;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 3 — LE RÉSULTAT (un seul tableau)
-- ═══════════════════════════════════════════════════════════════════════════

-- La fonction d'essai reste en place, fermée à tous les comptes de
-- l'application. Pour l'effacer une fois le tableau lu :
--   DROP FUNCTION public.essai_invitations_50();
REVOKE ALL ON FUNCTION public.essai_invitations_50() FROM PUBLIC, anon, authenticated;

SELECT n AS "N", etat AS "Etat", controle AS "Controle", detail AS "Detail"
FROM public.essai_invitations_50()
ORDER BY n;
