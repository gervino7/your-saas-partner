-- ═══════════════════════════════════════════════════════════════════════════
--  MISSION-DGC · SCRIPT 52 — AJOUTER UN MEMBRE DIRECTEMENT
--  Un seul tableau en sortie : l'éditeur Supabase n'affiche que le dernier.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  LA RÈGLE
--  --------
--  À côté de l'invitation, le DA d'un cabinet et l'administrateur de la
--  plateforme peuvent créer un compte directement. Le compte reçoit un mot de
--  passe provisoire, que l'auteur transmet lui-même ; le membre doit le
--  changer à sa première connexion, avant toute autre action.
--
--  Qui peut ajouter directement :
--    - le DA du cabinet, dans son cabinet, à tout grade ;
--    - un administrateur de la plateforme, dans tout cabinet.
--  Le DM ne le peut pas : il garde l'invitation (script 50).
--
--  CE QUE CE SCRIPT POSE
--  ---------------------
--  1. peut_ajouter_directement(cabinet, grade) : la règle ci-dessus.
--  2. La table mots_de_passe_provisoires : une ligne par compte qui doit
--     encore changer son mot de passe. Personne ne l'écrit depuis le
--     navigateur ; seul le serveur (fonctions Edge) la remplit et la vide.
--  3. mon_mot_de_passe_est_provisoire() : l'application la consulte à chaque
--     connexion pour imposer le changement.
--
--  Le compte lui-même est créé par la fonction Edge « ajouter-membre » (prompt
--  Lovable), qui passe par une invitation interne : le cabinet, le grade et la
--  consommation du jeton suivent donc exactement la règle du script 50.
--
--  Idempotent. Les essais s'annulent d'eux-mêmes.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 1 — LA RÈGLE
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DO $prereq$
BEGIN
  IF to_regprocedure('public.niveau_du_grade(text)') IS NULL
     OR to_regprocedure('public.invitation_utilisable(text,text)') IS NULL THEN
    RAISE EXCEPTION 'Appliquez d''abord les scripts 50 et 51.';
  END IF;
END $prereq$;

CREATE OR REPLACE FUNCTION public.peut_ajouter_directement(_organization_id uuid, _grade text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _org    uuid;
  _niveau integer;
BEGIN
  IF auth.uid() IS NULL OR _organization_id IS NULL
     OR public.niveau_du_grade(_grade) IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_platform_admin('admin') THEN
    RETURN EXISTS (SELECT 1 FROM public.organizations WHERE id = _organization_id);
  END IF;

  SELECT organization_id, grade_level INTO _org, _niveau
  FROM public.profiles WHERE id = auth.uid();

  RETURN _org = _organization_id AND _niveau = 1;   -- le DA, dans son cabinet
END;
$$;

REVOKE ALL ON FUNCTION public.peut_ajouter_directement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.peut_ajouter_directement(uuid, text) TO authenticated;


CREATE TABLE IF NOT EXISTS public.mots_de_passe_provisoires (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cree_par  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  cree_le   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mots_de_passe_provisoires IS
  'Comptes crees directement par un DA ou un administrateur de la plateforme, qui doivent encore changer leur mot de passe provisoire. Ecrite et videe par les fonctions Edge (service_role) uniquement.';

ALTER TABLE public.mots_de_passe_provisoires ENABLE ROW LEVEL SECURITY;

-- Chacun voit sa propre ligne, et rien d'autre. Aucune règle d'écriture :
-- le navigateur ne peut ni créer, ni effacer une ligne.
DROP POLICY IF EXISTS "mdp_provisoire_le_sien" ON public.mots_de_passe_provisoires;
CREATE POLICY "mdp_provisoire_le_sien" ON public.mots_de_passe_provisoires
  FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.mots_de_passe_provisoires FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mots_de_passe_provisoires TO authenticated;
GRANT ALL ON public.mots_de_passe_provisoires TO service_role;


CREATE OR REPLACE FUNCTION public.mon_mot_de_passe_est_provisoire()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.mots_de_passe_provisoires WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.mon_mot_de_passe_est_provisoire() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mon_mot_de_passe_est_provisoire() TO authenticated;

COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 2 — LES ESSAIS (tout est annulé à la fin de chaque essai)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.essai_ajout_direct_52()
RETURNS TABLE (n int, etat text, controle text, detail text)
LANGUAGE plpgsql AS $$
DECLARE
  _admin  uuid;  _admin_org uuid;
  _da     uuid;  _da_org    uuid;    -- un DA qui n'administre pas la plateforme
  _dm     uuid;  _dm_org    uuid;
  _bas    uuid;  _bas_org   uuid;
  _autre  uuid;
  _r      record;
  _ok     boolean;
  _msg    text;
BEGIN
  SELECT p.id, p.organization_id INTO _admin, _admin_org FROM public.platform_admins pa
  JOIN public.profiles p ON p.id = pa.user_id WHERE pa.is_active AND pa.role IN ('owner','admin') LIMIT 1;

  SELECT p.id, p.organization_id INTO _da, _da_org FROM public.profiles p
  WHERE p.grade = 'DA' AND NOT EXISTS (SELECT 1 FROM public.platform_admins pa
                                       WHERE pa.user_id = p.id AND pa.is_active) LIMIT 1;
  SELECT id, organization_id INTO _dm, _dm_org   FROM public.profiles WHERE grade = 'DM' LIMIT 1;
  SELECT id, organization_id INTO _bas, _bas_org FROM public.profiles WHERE grade_level >= 5
                                                   ORDER BY grade_level DESC LIMIT 1;
  -- un cabinet qui n'est pas celui du DA
  SELECT id INTO _autre FROM public.organizations WHERE id IS DISTINCT FROM _da_org LIMIT 1;

  FOR _r IN SELECT * FROM (VALUES
      (1, 'Le DA ajoute un membre dans son cabinet',                 _da,    _da_org,  'AUD', true),
      (2, 'Le DA ajoute un DA (co-associe) dans son cabinet',        _da,    _da_org,  'DA',  true),
      (3, 'Le DA ne peut pas ajouter dans un autre cabinet',         _da,    _autre,   'AUD', false),
      (4, 'Le DM ne peut pas ajouter directement (il invite)',       _dm,    _dm_org,  'AUD', false),
      (5, 'Un collaborateur de terrain ne peut rien ajouter',        _bas,   _bas_org, 'STG', false),
      (6, 'L''administrateur de la plateforme ajoute dans un autre cabinet', _admin, _autre, 'AUD', true),
      (7, 'Un grade inconnu est refuse',                             _da,    _da_org,  'XYZ', false)
    ) AS v(num, libelle, uid, org, grade, attendu)
  LOOP
    n := _r.num; controle := _r.libelle;
    IF _r.uid IS NULL OR _r.org IS NULL THEN
      etat := 'SANS OBJET'; detail := 'pas de compte ou de cabinet pour cet essai'; RETURN NEXT; CONTINUE;
    END IF;
    BEGIN
      PERFORM set_config('request.jwt.claim.sub', _r.uid::text, true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', _r.uid, 'role', 'authenticated')::text, true);
      PERFORM set_config('role', 'authenticated', true);
      _ok := public.peut_ajouter_directement(_r.org, _r.grade);
      PERFORM set_config('role', 'postgres', true);
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('role', 'postgres', true);
      _ok := NULL;
    END;
    etat := CASE WHEN _ok IS NOT DISTINCT FROM _r.attendu THEN 'OK' ELSE '**ECHEC**' END;
    detail := CASE WHEN _ok THEN 'autorise' WHEN NOT _ok THEN 'refuse' ELSE 'erreur' END;
    RETURN NEXT;
  END LOOP;

  -- 8 à 10. La table des mots de passe provisoires, vue du navigateur
  n := 8; controle := 'Un compte voit sa propre ligne, et la fonction le signale';
  _ok := NULL; _msg := NULL;
  BEGIN
    IF _bas IS NULL OR _da IS NULL THEN RAISE EXCEPTION 'SANS_OBJET'; END IF;
    INSERT INTO public.mots_de_passe_provisoires (user_id, cree_par) VALUES (_bas, _da), (_da, _da)
      ON CONFLICT DO NOTHING;
    PERFORM set_config('request.jwt.claim.sub', _bas::text, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', _bas, 'role', 'authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);
    _ok := public.mon_mot_de_passe_est_provisoire()
       AND (SELECT count(*) FROM public.mots_de_passe_provisoires) = 1;   -- la sienne seulement
    PERFORM set_config('role', 'postgres', true);
    RAISE EXCEPTION 'ANNULATION_VOULUE';
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('role', 'postgres', true);
    IF SQLERRM = 'SANS_OBJET' THEN _ok := NULL; _msg := 'SANS OBJET';
    ELSIF SQLERRM <> 'ANNULATION_VOULUE' THEN _ok := false; _msg := SQLERRM; END IF;
  END;
  etat := CASE WHEN _msg = 'SANS OBJET' THEN 'SANS OBJET' WHEN _ok THEN 'OK' ELSE '**ECHEC**' END;
  detail := CASE WHEN _msg = 'SANS OBJET' THEN NULL ELSE _msg END;
  RETURN NEXT;

  n := 9; controle := 'Le navigateur ne peut ni creer ni effacer une ligne';
  _ok := NOT has_table_privilege('authenticated', 'public.mots_de_passe_provisoires', 'INSERT')
     AND NOT has_table_privilege('authenticated', 'public.mots_de_passe_provisoires', 'DELETE')
     AND NOT has_table_privilege('authenticated', 'public.mots_de_passe_provisoires', 'UPDATE')
     AND NOT has_table_privilege('anon', 'public.mots_de_passe_provisoires', 'SELECT');
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END; detail := NULL; RETURN NEXT;

  n := 10; controle := 'Les fonctions sont fermees aux visiteurs';
  _ok := NOT has_function_privilege('anon', 'public.peut_ajouter_directement(uuid,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.mon_mot_de_passe_est_provisoire()', 'EXECUTE');
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END; detail := NULL; RETURN NEXT;

  n := 11; controle := 'Les essais n''ont rien laisse';
  _ok := NOT EXISTS (SELECT 1 FROM public.mots_de_passe_provisoires WHERE user_id IN (_bas, _da));
  etat := CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END; detail := NULL; RETURN NEXT;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 3 — LE RÉSULTAT (un seul tableau)
-- ═══════════════════════════════════════════════════════════════════════════

-- La fonction d'essai reste en place, fermée à tous les comptes. Pour l'effacer :
--   DROP FUNCTION public.essai_ajout_direct_52();
REVOKE ALL ON FUNCTION public.essai_ajout_direct_52() FROM PUBLIC, anon, authenticated;

SELECT n AS "N", etat AS "Etat", controle AS "Controle", detail AS "Detail"
FROM public.essai_ajout_direct_52()
ORDER BY n;
