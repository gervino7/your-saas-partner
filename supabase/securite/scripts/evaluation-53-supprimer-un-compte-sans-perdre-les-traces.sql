-- ═══════════════════════════════════════════════════════════════════════════
--  MISSION-DGC · SCRIPT 53 — SUPPRIMER UN COMPTE SANS PERDRE LES TRACES
--  Un seul tableau en sortie : l'éditeur Supabase n'affiche que le dernier.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  LA FAILLE (constat E-07 du rapport d'audit)
--  -------------------------------------------
--  Aujourd'hui, un DM peut supprimer un DA. La suppression efface le journal
--  d'accès aux documents, les feuilles de temps et les évaluations, et ne
--  laisse aucune trace de qui a supprimé qui. De plus, elle échoue dès que la
--  personne a déposé un document, créé une tâche ou envoyé un message.
--
--  LA RÈGLE (vos décisions du 26 novembre)
--  ---------------------------------------
--  Qui supprime :
--    - le DA, dans son cabinet, un grade inférieur au sien ;
--    - l'administrateur de la plateforme, partout ; lui seul retire un DA.
--    - Personne ne se supprime soi-même. Le compte d'un administrateur de
--      la plateforme ne peut être retiré que par un propriétaire (owner).
--
--  Ce que fait la suppression :
--    - le compte ne peut plus se connecter (la fonction Edge le bloque et
--      libère l'adresse) ;
--    - la personne sort du cabinet et de toutes les listes ; ses rattachements
--      (missions, projets, comités, conversations, réunions, listes de
--      diffusion, partages reçus, rôles) et ses données personnelles
--      (notifications, notes, compétences, disponibilités, sessions,
--      téléphone, photo) sont effacés ;
--    - sa fiche reste en archive : feuilles de temps, notes de frais,
--      évaluations, documents, tâches, messages et journal d'accès aux
--      documents restent rattachés à elle ;
--    - chaque suppression est inscrite dans un journal que personne ne peut
--      modifier ni effacer.
--
--  CE QUE CE SCRIPT POSE
--  ---------------------
--  1. peut_supprimer_compte(cible) : la règle, vue par le navigateur.
--  2. journal_des_suppressions : qui, qui a supprimé, quand, pourquoi.
--  3. supprimer_compte(cible, auteur, motif) : réservée au serveur ; revérifie
--     la règle, inscrit au journal, efface et archive, en une seule fois.
--
--  Idempotent. Les essais s'annulent d'eux-mêmes.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 1 — LA RÈGLE
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS supprime_le  timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS supprime_par uuid;

COMMENT ON COLUMN public.profiles.supprime_le IS
  'Rempli quand le compte a ete supprime : la fiche reste en archive (historique, chiffres, traces), le compte ne peut plus se connecter.';


-- Le rang d'un administrateur de la plateforme (NULL s'il ne l'est pas).
CREATE OR REPLACE FUNCTION public.rang_plateforme(_user uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE NULL END
  FROM public.platform_admins WHERE user_id = _user AND is_active LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.rang_plateforme(uuid) FROM PUBLIC, anon, authenticated;


-- La règle, pour un auteur et une cible donnés.
CREATE OR REPLACE FUNCTION public.peut_supprimer_compte_par(_par uuid, _cible uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _a public.profiles;
  _c public.profiles;
  _rang_a integer := public.rang_plateforme(_par);
  _rang_c integer := public.rang_plateforme(_cible);
BEGIN
  IF _par IS NULL OR _cible IS NULL OR _par = _cible THEN RETURN false; END IF;

  SELECT * INTO _c FROM public.profiles WHERE id = _cible;
  IF _c.id IS NULL OR _c.supprime_le IS NOT NULL THEN RETURN false; END IF;

  -- Le compte d'un administrateur de la plateforme : seul un owner le retire.
  IF _rang_c IS NOT NULL THEN
    RETURN COALESCE(_rang_a = 1, false);
  END IF;

  -- L'administrateur de la plateforme : partout, DA compris.
  IF _rang_a IS NOT NULL THEN RETURN true; END IF;

  -- Le DA : dans son cabinet, un grade inférieur au sien.
  SELECT * INTO _a FROM public.profiles WHERE id = _par;
  RETURN COALESCE(_a.supprime_le IS NULL
                  AND _a.grade_level = 1
                  AND _a.organization_id = _c.organization_id
                  AND _c.grade_level > 1, false);
END;
$$;
REVOKE ALL ON FUNCTION public.peut_supprimer_compte_par(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.peut_supprimer_compte_par(uuid, uuid) TO service_role;


-- La même règle, vue par le navigateur (pour afficher ou non le bouton).
CREATE OR REPLACE FUNCTION public.peut_supprimer_compte(_cible uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(public.peut_supprimer_compte_par(auth.uid(), _cible), false);
$$;
REVOKE ALL ON FUNCTION public.peut_supprimer_compte(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.peut_supprimer_compte(uuid) TO authenticated;


-- Le journal des suppressions : on y ajoute, on n'y retouche jamais.
CREATE TABLE IF NOT EXISTS public.journal_des_suppressions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL,
  organization_id  uuid,
  email            text NOT NULL,
  nom              text,
  grade            text,
  supprime_par     uuid NOT NULL,
  supprime_par_nom text,
  motif            text,
  supprime_le      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.journal_des_suppressions IS
  'Une ligne par compte supprime. Ecrite par supprimer_compte() seulement ; aucune modification ni suppression possible.';

ALTER TABLE public.journal_des_suppressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppressions_lisibles" ON public.journal_des_suppressions;
CREATE POLICY "suppressions_lisibles" ON public.journal_des_suppressions
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin('admin')
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = auth.uid() AND p.grade_level = 1
                 AND p.organization_id = journal_des_suppressions.organization_id)
  );

REVOKE ALL ON public.journal_des_suppressions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.journal_des_suppressions TO authenticated;
GRANT SELECT, INSERT ON public.journal_des_suppressions TO service_role;

CREATE OR REPLACE FUNCTION public.journal_inalterable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Le journal des suppressions ne se modifie pas et ne s''efface pas.';
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_inalterable ON public.journal_des_suppressions;
CREATE TRIGGER trg_journal_inalterable
  BEFORE UPDATE OR DELETE ON public.journal_des_suppressions
  FOR EACH ROW EXECUTE FUNCTION public.journal_inalterable();


-- La suppression elle-même, en une seule fois. Réservée au serveur.
-- Renvoie l'adresse d'archive à donner au compte de connexion.
CREATE OR REPLACE FUNCTION public.supprimer_compte(_cible uuid, _par uuid, _motif text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _c        public.profiles;
  _par_nom  text;
  _archive  text;
  _rattache record;
  _efface   jsonb := '{}'::jsonb;
  _nb       integer;
BEGIN
  -- Un « oui » explicite est exigé : un résultat inconnu vaut refus.
  IF public.peut_supprimer_compte_par(_par, _cible) IS NOT TRUE THEN
    RAISE EXCEPTION 'interdit';
  END IF;

  SELECT * INTO _c FROM public.profiles WHERE id = _cible FOR UPDATE;
  SELECT full_name INTO _par_nom FROM public.profiles WHERE id = _par;
  _archive := 'compte-supprime-' || replace(_cible::text, '-', '') || '@supprime.invalid';

  INSERT INTO public.journal_des_suppressions
    (user_id, organization_id, email, nom, grade, supprime_par, supprime_par_nom, motif)
  VALUES
    (_c.id, _c.organization_id, _c.email, _c.full_name, _c.grade, _par, _par_nom, NULLIF(trim(_motif), ''));

  -- Rattachements et données personnelles : effacés.
  FOR _rattache IN
    SELECT * FROM (VALUES
      ('mission_members', 'user_id'), ('project_members', 'user_id'),
      ('committee_members', 'user_id'), ('conversation_members', 'user_id'),
      ('meeting_participants', 'user_id'), ('mailing_group_recipients', 'user_id'),
      ('document_shares', 'shared_with'), ('notifications', 'user_id'),
      ('notes', 'user_id'), ('user_skills', 'user_id'),
      ('user_availability', 'user_id'), ('user_sessions', 'user_id'),
      ('user_roles', 'user_id'), ('mots_de_passe_provisoires', 'user_id')
    ) AS t(nom_table, colonne)
  LOOP
    IF to_regclass('public.' || _rattache.nom_table) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I WHERE %I = $1', _rattache.nom_table, _rattache.colonne)
        USING _cible;
      GET DIAGNOSTICS _nb = ROW_COUNT;
      IF _nb > 0 THEN _efface := _efface || jsonb_build_object(_rattache.nom_table, _nb); END IF;
    END IF;
  END LOOP;

  -- Ses invitations encore ouvertes ne servent plus.
  UPDATE public.invitations SET expires_at = now()
  WHERE invited_by = _cible AND status = 'pending' AND (expires_at IS NULL OR expires_at > now());

  -- La fiche passe en archive : hors du cabinet, adresse libérée.
  UPDATE public.profiles SET
    organization_id = NULL,
    email           = _archive,
    phone           = NULL,
    avatar_url      = NULL,
    skills          = '[]'::jsonb,
    is_online       = false,
    supprime_le     = now(),
    supprime_par    = _par
  WHERE id = _cible;

  RETURN jsonb_build_object('email_archive', _archive, 'efface', _efface);
END;
$$;

REVOKE ALL ON FUNCTION public.supprimer_compte(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supprimer_compte(uuid, uuid, text) TO service_role;

COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 2 — LES ESSAIS (tout est annulé à la fin de chaque essai)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.essai_suppression_53()
RETURNS TABLE (n int, etat text, controle text, detail text)
LANGUAGE plpgsql AS $$
DECLARE
  -- Les comptes d'essai sont créés ici et disparaissent à la fin (annulation).
  _org1   uuid := gen_random_uuid();   -- cabinet d'essai
  _org2   uuid := gen_random_uuid();   -- un autre cabinet d'essai
  _da     uuid := gen_random_uuid();   -- DA ordinaire du cabinet 1
  _da2    uuid := gen_random_uuid();   -- second DA du cabinet 1 (co-associé)
  _dm     uuid := gen_random_uuid();   -- DM du cabinet 1
  _aud    uuid := gen_random_uuid();   -- auditeur du cabinet 1
  _loin   uuid := gen_random_uuid();   -- auditeur du cabinet 2
  _owner  uuid;                        -- un vrai propriétaire de la plateforme
  _r      record;
  _ok     boolean;
  _msg    text;
  _res    jsonb;
  _ts_avant integer; _ts_apres integer;
  _n  int[]  := '{}'; _e text[] := '{}'; _c text[] := '{}'; _d text[] := '{}';
  _auth_ok boolean := true;
BEGIN
  SELECT pa.user_id INTO _owner FROM public.platform_admins pa
  JOIN public.profiles p ON p.id = pa.user_id
  WHERE pa.is_active AND pa.role = 'owner' LIMIT 1;

  BEGIN
    -- Les deux cabinets et les cinq comptes d'essai
    INSERT INTO public.organizations (id, name, slug) VALUES
      (_org1, 'Essai 53 A', 'essai-53-a-' || _org1), (_org2, 'Essai 53 B', 'essai-53-b-' || _org2);
    BEGIN
      INSERT INTO auth.users (id, email) VALUES
        (_da,   'da-53@exemple.invalid'),  (_da2, 'da2-53@exemple.invalid'),
        (_dm,   'dm-53@exemple.invalid'),  (_aud, 'aud-53@exemple.invalid'),
        (_loin, 'loin-53@exemple.invalid');
    EXCEPTION WHEN insufficient_privilege THEN _auth_ok := false;
    END;
    IF NOT _auth_ok THEN RAISE EXCEPTION 'AUTH_REFUSE'; END IF;

    -- le déclencheur d'inscription a créé les profils ; on les place
    INSERT INTO public.profiles (id, email, full_name)
    SELECT u.id, u.email, split_part(u.email, '@', 1) FROM auth.users u
    WHERE u.id IN (_da, _da2, _dm, _aud, _loin)
    ON CONFLICT (id) DO NOTHING;
    UPDATE public.profiles SET organization_id = _org1, grade = 'DA'  WHERE id IN (_da, _da2);
    UPDATE public.profiles SET organization_id = _org1, grade = 'DM'  WHERE id = _dm;
    UPDATE public.profiles SET organization_id = _org1, grade = 'AUD' WHERE id = _aud;
    UPDATE public.profiles SET organization_id = _org2, grade = 'AUD' WHERE id = _loin;

    -- 1 à 8 : la règle, vue par le navigateur
    FOR _r IN SELECT * FROM (VALUES
        (1, 'Le DA supprime un collaborateur de son cabinet',              _da,    _aud,   true),
        (2, 'Le DA ne supprime pas un autre DA',                           _da,    _da2,   false),
        (3, 'Le DA ne supprime pas dans un autre cabinet',                 _da,    _loin,  false),
        (4, 'Le DM ne supprime personne',                                  _dm,    _aud,   false),
        (5, 'Un collaborateur de terrain ne supprime personne',            _aud,   _loin,  false),
        (6, 'Personne ne se supprime soi-meme',                            _da,    _da,    false),
        (7, 'L''administrateur de la plateforme retire un DA',             _owner, _da,    true),
        (8, 'Le compte de l''administrateur de la plateforme est protege', _da,    _owner, false)
      ) AS v(num, libelle, par, cible, attendu)
    LOOP
      IF _r.par IS NULL OR _r.cible IS NULL THEN
        _n := _n || _r.num; _e := _e || 'SANS OBJET'::text; _c := _c || _r.libelle::text;
        _d := _d || 'pas de proprietaire de la plateforme avec profil'::text; CONTINUE;
      END IF;
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', _r.par::text, true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', _r.par, 'role', 'authenticated')::text, true);
        PERFORM set_config('role', 'authenticated', true);
        _ok := public.peut_supprimer_compte(_r.cible);
        PERFORM set_config('role', 'postgres', true);
      EXCEPTION WHEN OTHERS THEN
        PERFORM set_config('role', 'postgres', true); _ok := NULL;
      END;
      _n := _n || _r.num; _c := _c || _r.libelle::text;
      _e := _e || (CASE WHEN _ok IS NOT DISTINCT FROM _r.attendu THEN 'OK' ELSE '**ECHEC**' END)::text;
      _d := _d || (CASE WHEN _ok THEN 'autorise' WHEN NOT _ok THEN 'refuse' ELSE 'reponse inconnue' END)::text;
    END LOOP;

    -- 9 : le serveur refuse une suppression interdite, même appelé directement
    _ok := false; _msg := NULL;
    BEGIN
      PERFORM public.supprimer_compte(_da2, _dm, 'essai interdit');
      _msg := 'suppression acceptee !';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'interdit' THEN _ok := true; ELSE _msg := SQLERRM; END IF;
    END;
    BEGIN
      PERFORM public.supprimer_compte(_owner, _da, 'essai interdit');
      _ok := false; _msg := 'compte proprietaire supprime par un DA !';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'interdit' THEN _ok := false; _msg := SQLERRM; END IF;
    END;
    _n := _n || 9; _c := _c || 'Le serveur refuse une suppression interdite, meme appele directement'::text;
    _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || _msg;

    -- 10 : la suppression elle-même
    _ok := NULL; _msg := NULL;
    INSERT INTO public.user_roles (user_id, role, organization_id) VALUES (_aud, 'member', _org1)
      ON CONFLICT DO NOTHING;
    -- une feuille de temps, pour vérifier qu'elle survit à la suppression
    BEGIN
      INSERT INTO public.time_entries (user_id, date, week_start)
      VALUES (_aud, current_date, date_trunc('week', current_date)::date);
    EXCEPTION WHEN OTHERS THEN NULL;   -- colonnes obligatoires différentes : on compte ce qu'il y a
    END;
    SELECT count(*) INTO _ts_avant FROM public.time_entries WHERE user_id = _aud;
    _res := public.supprimer_compte(_aud, _da, 'essai du script 53');
    SELECT count(*) INTO _ts_apres FROM public.time_entries WHERE user_id = _aud;
    _ok := EXISTS (SELECT 1 FROM public.profiles
                   WHERE id = _aud AND organization_id IS NULL AND supprime_le IS NOT NULL
                     AND supprime_par = _da AND grade = 'AUD'
                     AND email = _res->>'email_archive'
                     AND email LIKE 'compte-supprime-%@supprime.invalid')
       AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _aud)
       AND _ts_apres = _ts_avant
       AND EXISTS (SELECT 1 FROM public.journal_des_suppressions
                   WHERE user_id = _aud AND email = 'aud-53@exemple.invalid'
                     AND organization_id = _org1 AND supprime_par = _da
                     AND motif = 'essai du script 53');
    _n := _n || 10; _c := _c || 'Suppression : hors du cabinet, fiche archivee, adresse liberee, journal ecrit'::text;
    _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text;
    _d := _d || ('feuilles de temps gardees : ' || _ts_apres || '/' || _ts_avant
                 || ' ; efface : ' || COALESCE((_res->'efface')::text, '{}'))::text;

    -- 11 : le journal ne se modifie pas et ne s'efface pas
    _ok := true;
    BEGIN
      UPDATE public.journal_des_suppressions SET motif = 'falsifie' WHERE user_id = _aud;
      _ok := false;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN
      DELETE FROM public.journal_des_suppressions WHERE user_id = _aud;
      _ok := false;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    _n := _n || 11; _c := _c || 'Le journal ne se modifie pas et ne s''efface pas'::text;
    _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    -- 12 : un compte déjà supprimé ne se supprime pas deux fois
    _ok := public.peut_supprimer_compte_par(_da, _aud) IS FALSE;
    _n := _n || 12; _c := _c || 'Un compte supprime ne se supprime pas deux fois'::text;
    _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    -- 13 : le DA lit le journal de son cabinet, pas celui d'un autre
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', _da::text, true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _da, 'role', 'authenticated')::text, true);
      PERFORM set_config('role', 'authenticated', true);
      _ok := EXISTS (SELECT 1 FROM public.journal_des_suppressions WHERE user_id = _aud);
      PERFORM set_config('request.jwt.claim.sub', _loin::text, true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _loin, 'role', 'authenticated')::text, true);
      _ok := _ok AND NOT EXISTS (SELECT 1 FROM public.journal_des_suppressions WHERE user_id = _aud);
      PERFORM set_config('role', 'postgres', true);
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('role', 'postgres', true); _ok := false;
    END;
    _n := _n || 13; _c := _c || 'Le DA lit le journal de son cabinet ; les autres non'::text;
    _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    RAISE EXCEPTION 'ANNULATION_VOULUE';
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('role', 'postgres', true);
    IF SQLERRM = 'AUTH_REFUSE' THEN
      _n := _n || 0; _e := _e || 'NON TESTABLE'::text;
      _c := _c || 'Comptes d''essai'::text; _d := _d || 'l''editeur ne peut pas creer de compte d''essai'::text;
    ELSIF SQLERRM <> 'ANNULATION_VOULUE' THEN
      _n := _n || 99; _e := _e || '**ECHEC**'::text;
      _c := _c || 'Les essais se sont interrompus'::text; _d := _d || left(SQLERRM, 200);
    END IF;
  END;

  -- Ce qui suit se lit après l'annulation : rien ne doit rester.
  _n := _n || 14; _c := _c || 'Les essais n''ont rien laisse'::text;
  _e := _e || (CASE WHEN NOT EXISTS (SELECT 1 FROM public.organizations WHERE id IN (_org1, _org2))
                     AND NOT EXISTS (SELECT 1 FROM public.journal_des_suppressions WHERE motif LIKE 'essai%')
                    THEN 'OK' ELSE '**ECHEC**' END)::text;
  _d := _d || NULL::text;

  _n := _n || 15; _c := _c || 'Seul le serveur supprime ; le navigateur lit le journal sans l''ecrire'::text;
  _ok := NOT has_function_privilege('authenticated', 'public.supprimer_compte(uuid,uuid,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.supprimer_compte(uuid,uuid,text)', 'EXECUTE')
     AND NOT has_function_privilege('authenticated', 'public.peut_supprimer_compte_par(uuid,uuid)', 'EXECUTE')
     AND NOT has_table_privilege('authenticated', 'public.journal_des_suppressions', 'INSERT')
     AND NOT has_table_privilege('authenticated', 'public.journal_des_suppressions', 'DELETE')
     AND NOT has_table_privilege('anon', 'public.journal_des_suppressions', 'SELECT');
  _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

  FOR i IN 1 .. array_length(_n, 1) LOOP
    n := _n[i]; etat := _e[i]; controle := _c[i]; detail := _d[i];
    RETURN NEXT;
  END LOOP;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 3 — LE RÉSULTAT (un seul tableau)
-- ═══════════════════════════════════════════════════════════════════════════

-- La fonction d'essai reste en place, fermée à tous les comptes. Pour l'effacer :
--   DROP FUNCTION public.essai_suppression_53();
REVOKE ALL ON FUNCTION public.essai_suppression_53() FROM PUBLIC, anon, authenticated;

SELECT n AS "N", etat AS "Etat", controle AS "Controle", detail AS "Detail"
FROM public.essai_suppression_53()
ORDER BY n;
