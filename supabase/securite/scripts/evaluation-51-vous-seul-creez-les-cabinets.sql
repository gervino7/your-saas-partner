-- ═══════════════════════════════════════════════════════════════════════════
--  MISSION-DGC · SCRIPT 51 — VOUS SEUL CRÉEZ LES CABINETS
--  Un seul tableau en sortie : l'éditeur Supabase n'affiche que le dernier.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  LA RÈGLE
--  --------
--  Tous les comptes sont créés sur invitation. Un nouveau cabinet n'est créé
--  que par un administrateur de la plateforme, qui invite en même temps son
--  premier DA. Personne ne crée plus son cabinet lui-même.
--
--  LA FAILLE QU'ON FERME
--  ---------------------
--  Aujourd'hui, n'importe qui s'inscrit, puis crée son cabinet et en devient
--  DA ; il choisit même son offre, son nombre d'utilisateurs et son espace de
--  stockage, que la base accepte tels quels.
--
--  CE QUE CE SCRIPT POSE
--  ---------------------
--  1. super_admin_creer_cabinet(nom, offre, adresse du DA, nom du DA) :
--     réservé aux administrateurs de la plateforme. Il crée le cabinet avec
--     les quotas de l'offre (lus dans subscription_plans, jamais envoyés par
--     le navigateur), crée l'invitation du DA avec un jeton tiré par le
--     serveur, trace l'action, et renvoie le jeton pour l'envoi du courriel.
--  2. invitation_utilisable(jeton, adresse) : la même règle que l'inscription
--     (script 50), pour que la fonction d'inscription refuse AVANT de créer
--     le compte. Réservée au serveur (service_role).
--  3. create_organization_for_current_user n'est plus appelable par les
--     comptes : la création libre de cabinet est fermée en base.
--
--  ATTENTION À L'ORDRE
--  -------------------
--  Après ce script, l'écran « Créer votre organisation » de l'application
--  renvoie une erreur : c'est voulu, le prompt Lovable le retire. Personne
--  n'en a besoin aujourd'hui (aucun compte sans cabinet, cf. script 50).
--
--  Idempotent. Les essais s'annulent d'eux-mêmes.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 1 — LA RÈGLE
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DO $prereq$
BEGIN
  IF to_regprocedure('public.peut_inviter(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'Appliquez d''abord le script 50 (fermer les invitations).';
  END IF;
END $prereq$;

CREATE OR REPLACE FUNCTION public.super_admin_creer_cabinet(
  _nom      text,
  _offre    text,
  _email_da text,
  _nom_da   text  DEFAULT NULL,
  _reglages jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _plan   public.subscription_plans;
  _nom_p  text := NULLIF(trim(_nom), '');
  _email  text := lower(trim(_email_da));
  _base   text;
  _slug   text;
  _essai  int := 0;
  _org    public.organizations;
  _jeton  text := replace(gen_random_uuid()::text, '-', '')
               || replace(gen_random_uuid()::text, '-', '');   -- 64 caractères tirés par le serveur
BEGIN
  IF NOT public.is_platform_admin('admin') THEN
    RAISE EXCEPTION 'Accès refusé : seul un administrateur de la plateforme crée un cabinet.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Votre compte d''administrateur n''a pas de profil : impossible de signer l''invitation.';
  END IF;
  IF _nom_p IS NULL OR length(_nom_p) < 2 THEN
    RAISE EXCEPTION 'Le nom du cabinet est obligatoire.';
  END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Adresse du directeur associé invalide.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = _email) THEN
    RAISE EXCEPTION 'Cette adresse a déjà un compte Mission-DGC : choisissez-en une autre.';
  END IF;

  SELECT * INTO _plan FROM public.subscription_plans
  WHERE code = _offre AND is_active;
  IF _plan.id IS NULL THEN
    RAISE EXCEPTION 'Offre inconnue ou inactive : %', _offre;
  END IF;

  _base := trim(both '-' from lower(regexp_replace(_nom_p, '[^a-zA-Z0-9]+', '-', 'g')));
  IF length(_base) < 2 THEN _base := 'cabinet'; END IF;
  _slug := _base;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) LOOP
    _essai := _essai + 1;
    _slug  := _base || '-' || (_essai + 1);
  END LOOP;

  INSERT INTO public.organizations (name, slug, subscription_plan, max_users, max_storage_gb, settings)
  VALUES (_nom_p, _slug, _plan.code, _plan.max_users, _plan.max_storage_gb, COALESCE(_reglages, '{}'::jsonb))
  RETURNING * INTO _org;

  INSERT INTO public.invitations (organization_id, email, invited_by, grade, token)
  VALUES (_org.id, _email, auth.uid(), 'DA', _jeton);

  PERFORM public.log_super_admin_action('organization_created', 'organization', _org.id, _org.name,
    jsonb_build_object('offre', _plan.code, 'directeur_associe', _email, 'nom', _nom_da));

  RETURN jsonb_build_object(
    'organization_id', _org.id,
    'slug',            _org.slug,
    'nom',             _org.name,
    'offre',           _plan.code,
    'email_da',        _email,
    'jeton',           _jeton
  );
END;
$$;

COMMENT ON FUNCTION public.super_admin_creer_cabinet(text, text, text, text, jsonb) IS
  'Cree un cabinet et l''invitation de son premier DA. Reserve aux administrateurs de la plateforme. Les quotas viennent de subscription_plans. Renvoie le jeton pour que send-invitation envoie le courriel.';

REVOKE ALL ON FUNCTION public.super_admin_creer_cabinet(text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.super_admin_creer_cabinet(text, text, text, text, jsonb) TO authenticated;


-- La règle de l'inscription (script 50), lisible par le serveur avant de
-- créer le compte. Même condition que handle_new_user.
CREATE OR REPLACE FUNCTION public.invitation_utilisable(_jeton text, _email text)
RETURNS TABLE (organization_id uuid, grade text, organization_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.organization_id, COALESCE(i.grade, 'AUD'), o.name
  FROM public.invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = _jeton
    AND lower(i.email) = lower(trim(_email))
    AND (i.expires_at IS NULL OR i.expires_at > now())
    AND (i.status = 'pending'
         OR (i.status = 'accepted'
             AND NOT EXISTS (SELECT 1 FROM public.profiles p
                             WHERE lower(p.email) = lower(trim(_email)))))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.invitation_utilisable(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invitation_utilisable(text, text) TO service_role;


-- La création libre de cabinet est fermée.
REVOKE EXECUTE ON FUNCTION public.create_organization_for_current_user(text, text, text, integer, integer, jsonb, text, text)
  FROM PUBLIC, anon, authenticated;

COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 2 — LES ESSAIS (tout est annulé à la fin de chaque essai)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.essai_cabinets_51()
RETURNS TABLE (n int, etat text, controle text, detail text)
LANGUAGE plpgsql AS $$
DECLARE
  _admin  uuid;   -- un administrateur de la plateforme qui a un profil
  _simple uuid;   -- un DA qui ne l'est pas
  _offre  text;
  _res    jsonb;
  _ok     boolean;
  _msg    text;
  _auth_ok boolean := true;
  _email  text := 'nouveau-da-51@exemple.invalid';
BEGIN
  SELECT pa.user_id INTO _admin FROM public.platform_admins pa
  JOIN public.profiles p ON p.id = pa.user_id
  WHERE pa.is_active AND pa.role IN ('owner', 'admin') LIMIT 1;

  SELECT p.id INTO _simple FROM public.profiles p
  WHERE p.grade = 'DA'
    AND NOT EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = p.id AND pa.is_active)
  LIMIT 1;

  SELECT code INTO _offre FROM public.subscription_plans WHERE is_active ORDER BY sort_order, code LIMIT 1;

  -- 1. Un DA qui n'administre pas la plateforme ne crée pas de cabinet
  n := 1; controle := 'Un DA ordinaire ne peut pas creer de cabinet';
  IF _simple IS NULL OR _offre IS NULL THEN
    etat := 'SANS OBJET'; detail := 'pas de DA ordinaire ou pas d''offre active'; RETURN NEXT;
  ELSE
    _ok := false; _msg := NULL;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', _simple::text, true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _simple, 'role', 'authenticated')::text, true);
      PERFORM set_config('role', 'authenticated', true);
      PERFORM public.super_admin_creer_cabinet('Essai 51', _offre, _email);
      _ok := true;
      RAISE EXCEPTION 'ANNULATION_VOULUE';
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('role', 'postgres', true);
      IF SQLERRM <> 'ANNULATION_VOULUE' THEN _msg := SQLERRM; END IF;
    END;
    etat := CASE WHEN NOT _ok THEN 'OK' ELSE '**ECHEC**' END;
    detail := CASE WHEN _ok THEN 'cabinet cree !' ELSE 'refuse : ' || left(_msg, 90) END;
    RETURN NEXT;
  END IF;

  -- 2 à 4. L'administrateur crée un cabinet ; on vérifie ce qui a été écrit
  n := 2; controle := 'L''administrateur cree le cabinet avec les quotas de l''offre';
  IF _admin IS NULL OR _offre IS NULL THEN
    etat := 'SANS OBJET'; detail := 'pas d''administrateur avec profil ou pas d''offre active'; RETURN NEXT;
  ELSE
    _ok := NULL; _msg := NULL; _res := NULL;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', _admin::text, true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _admin, 'role', 'authenticated')::text, true);
      PERFORM set_config('role', 'authenticated', true);
      _res := public.super_admin_creer_cabinet('Cabinet Essai 51', _offre, '  Nouveau-DA-51@Exemple.invalid ', 'Essai');
      PERFORM set_config('role', 'postgres', true);

      _ok := EXISTS (SELECT 1 FROM public.organizations o
                     JOIN public.subscription_plans sp ON sp.code = o.subscription_plan
                     WHERE o.id = (_res->>'organization_id')::uuid
                       AND o.max_users = sp.max_users AND o.max_storage_gb = sp.max_storage_gb);
      _ok := _ok AND EXISTS (SELECT 1 FROM public.invitations i
                             WHERE i.organization_id = (_res->>'organization_id')::uuid
                               AND i.email = _email AND i.grade = 'DA' AND i.status = 'pending'
                               AND i.invited_by = _admin AND length(i.token) = 64
                               AND i.token = _res->>'jeton');
      _msg := 'cabinet, quotas et invitation DA conformes';

      -- 3. L'inscription du DA invité, puis d'un intrus avec le même jeton
      BEGIN
        INSERT INTO auth.users (id, email, raw_user_meta_data)
        VALUES (gen_random_uuid(), _email,
                json_build_object('invitation_token', _res->>'jeton')::jsonb);
      EXCEPTION WHEN insufficient_privilege THEN _auth_ok := false;
      END;
      IF _auth_ok THEN
        _ok := _ok AND EXISTS (SELECT 1 FROM public.profiles
                               WHERE email = _email AND grade = 'DA'
                                 AND organization_id = (_res->>'organization_id')::uuid);
        _ok := _ok AND NOT EXISTS (SELECT 1 FROM public.invitation_utilisable(_res->>'jeton', _email));
        _msg := _msg || ' ; le DA invite entre dans son cabinet ; le jeton est consomme';
      END IF;
      RAISE EXCEPTION 'ANNULATION_VOULUE';
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('role', 'postgres', true);
      IF SQLERRM <> 'ANNULATION_VOULUE' THEN _ok := false; _msg := SQLERRM; END IF;
    END;
    etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END;
    detail := left(_msg, 140); RETURN NEXT;
  END IF;

  -- 3. Une offre inconnue est refusée
  n := 3; controle := 'Une offre inconnue est refusee';
  IF _admin IS NULL THEN
    etat := 'SANS OBJET'; detail := NULL; RETURN NEXT;
  ELSE
    _ok := false; _msg := NULL;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', _admin::text, true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _admin, 'role', 'authenticated')::text, true);
      PERFORM set_config('role', 'authenticated', true);
      PERFORM public.super_admin_creer_cabinet('Essai 51', 'offre-qui-n-existe-pas', _email);
      _ok := true;
      RAISE EXCEPTION 'ANNULATION_VOULUE';
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('role', 'postgres', true);
      IF SQLERRM <> 'ANNULATION_VOULUE' THEN _msg := SQLERRM; END IF;
    END;
    etat := CASE WHEN NOT _ok THEN 'OK' ELSE '**ECHEC**' END;
    detail := CASE WHEN _ok THEN 'acceptee !' ELSE 'refusee : ' || left(_msg, 90) END;
    RETURN NEXT;
  END IF;

  -- 4. La règle de l'inscription, lue par le serveur
  n := 4; controle := 'invitation_utilisable : la bonne adresse oui, une autre non';
  _ok := NULL; _msg := NULL;
  BEGIN
    INSERT INTO public.invitations (organization_id, email, invited_by, grade, token)
    SELECT p.organization_id, 'invite-51@exemple.invalid', p.id, 'AUD', 'essai-51-' || replace(gen_random_uuid()::text, '-', '')
    FROM public.profiles p WHERE p.grade = 'DA' LIMIT 1;
    _ok := EXISTS (SELECT 1 FROM public.invitations i, public.invitation_utilisable(i.token, ' INVITE-51@exemple.invalid')
                   WHERE i.email = 'invite-51@exemple.invalid')
       AND NOT EXISTS (SELECT 1 FROM public.invitations i, public.invitation_utilisable(i.token, 'autre-51@exemple.invalid')
                       WHERE i.email = 'invite-51@exemple.invalid');
    RAISE EXCEPTION 'ANNULATION_VOULUE';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'ANNULATION_VOULUE' THEN _ok := false; _msg := SQLERRM; END IF;
  END;
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END; detail := _msg; RETURN NEXT;

  n := 5; controle := 'La creation libre de cabinet est fermee aux comptes';
  _ok := NOT has_function_privilege('authenticated',
           'public.create_organization_for_current_user(text,text,text,integer,integer,jsonb,text,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon',
           'public.create_organization_for_current_user(text,text,text,integer,integer,jsonb,text,text)', 'EXECUTE');
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END; detail := NULL; RETURN NEXT;

  n := 6; controle := 'invitation_utilisable n''est lisible que par le serveur';
  _ok := NOT has_function_privilege('authenticated', 'public.invitation_utilisable(text,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.invitation_utilisable(text,text)', 'EXECUTE');
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END; detail := NULL; RETURN NEXT;

  n := 7; controle := 'super_admin_creer_cabinet est ferme aux visiteurs';
  _ok := NOT has_function_privilege('anon', 'public.super_admin_creer_cabinet(text,text,text,text,jsonb)', 'EXECUTE');
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END; detail := NULL; RETURN NEXT;

  n := 8; controle := 'Les essais n''ont rien laisse';
  _ok := NOT EXISTS (SELECT 1 FROM public.organizations WHERE name IN ('Cabinet Essai 51', 'Essai 51'))
     AND NOT EXISTS (SELECT 1 FROM public.invitations WHERE email LIKE '%-51@exemple.invalid');
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END; detail := NULL; RETURN NEXT;

  IF NOT _auth_ok THEN
    n := 9; etat := 'INFO'; controle := 'Inscription du DA invite';
    detail := 'non jouee : l''editeur ne peut pas creer de compte ; la regle est celle du script 50';
    RETURN NEXT;
  END IF;

  -- Informations utiles pour le prompt Lovable
  n := 20; etat := 'INFO'; controle := 'Offres actives (codes a proposer dans l''ecran)';
  SELECT string_agg(code || ' = ' || name || ' (' || max_users || ' util., ' || max_storage_gb || ' Go)', ' ; '
                    ORDER BY sort_order, code)
    INTO detail FROM public.subscription_plans WHERE is_active;
  RETURN NEXT;

  n := 21; etat := 'INFO'; controle := 'Administrateurs de la plateforme';
  SELECT string_agg(pa.email || ' : ' || pa.role || CASE WHEN p.id IS NULL THEN ' (SANS PROFIL)' ELSE '' END, ' ; ')
    INTO detail FROM public.platform_admins pa LEFT JOIN public.profiles p ON p.id = pa.user_id
  WHERE pa.is_active;
  RETURN NEXT;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 3 — LE RÉSULTAT (un seul tableau)
-- ═══════════════════════════════════════════════════════════════════════════

-- La fonction d'essai reste en place, fermée à tous les comptes. Pour l'effacer :
--   DROP FUNCTION public.essai_cabinets_51();
REVOKE ALL ON FUNCTION public.essai_cabinets_51() FROM PUBLIC, anon, authenticated;

SELECT n AS "N", etat AS "Etat", controle AS "Controle", detail AS "Detail"
FROM public.essai_cabinets_51()
ORDER BY n;
