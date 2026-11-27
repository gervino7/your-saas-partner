-- ═══════════════════════════════════════════════════════════════════════════
--  MISSION-DGC · SCRIPT 54 — FERMER LE PORTAIL COPIL
--  Un seul tableau en sortie : l'éditeur Supabase n'affiche que le dernier.
-- ═══════════════════════════════════════════════════════════════════════════
--
--  LES FAILLES (constat E-06 du rapport d'audit, précisé le 27/11)
--  ----------------------------------------------------------------
--  Le portail COPIL est ouvert sur Internet : les membres externes d'un comité
--  y lisent les documents publiés après avoir reçu un code par courriel.
--    1. Le code à 6 chiffres peut être essayé sans limite pendant 15 minutes.
--    2. Chaque demande crée un code de plus, tous valables en même temps.
--    3. Les demandes de code sont illimitées (bombardement de courriels).
--    4. L'adresse est comparée avec jokers (ilike) : « j_doe@client.com »
--       passe pour « j.doe@client.com ».
--    5. La réponse dit si une adresse fait partie du comité.
--    6. Codes et jetons tirés avec Math.random, stockés en clair.
--    7. Un membre retiré du comité garde son accès jusqu'à 24 heures.
--
--  CE QUE CE SCRIPT POSE
--  ---------------------
--  Toute la logique passe dans la base, en trois fonctions réservées au
--  serveur (service_role). La fonction Edge ne fait plus qu'envoyer le
--  courriel et servir les documents.
--
--  copil_demander_code(comité, adresse)
--     Adresse comparée exactement (minuscules). Mission ni archivée ni
--     terminée. Au plus 1 code par minute et 5 par heure et par adresse.
--     Les codes précédents non utilisés sont annulés : un seul code vaut.
--     Le code est tiré par le serveur ; seule son empreinte (SHA-256) est
--     gardée. Renvoie le code à envoyer, ou rien — et la fonction Edge répond
--     la même chose dans les deux cas.
--
--  copil_verifier_code(comité, adresse, code)
--     5 essais au plus par code ; au-delà le code est brûlé. Code bon :
--     jeton de session de 64 caractères, valable 12 heures, empreinte
--     seule gardée.
--
--  copil_session(comité, jeton)
--     Valide seulement si le jeton est bon, non expiré, ET si la personne est
--     toujours membre externe du comité et la mission toujours ouverte.
--     Un membre retiré perd l'accès à la seconde.
--
--  Les codes et jetons en clair existants sont effacés : les membres externes
--  connectés devront redemander un code (une fois).
--
--  Idempotent. Les essais s'annulent d'eux-mêmes.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 1 — LA RÈGLE
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- Les empreintes remplacent les valeurs en clair.
ALTER TABLE public.copil_access_tokens ADD COLUMN IF NOT EXISTS otp_hash     text;
ALTER TABLE public.copil_access_tokens ADD COLUMN IF NOT EXISTS session_hash text;
ALTER TABLE public.copil_access_tokens ADD COLUMN IF NOT EXISTS tentatives   integer NOT NULL DEFAULT 0;
ALTER TABLE public.copil_access_tokens ADD COLUMN IF NOT EXISTS annule       boolean NOT NULL DEFAULT false;
ALTER TABLE public.copil_access_tokens ALTER COLUMN otp_code DROP NOT NULL;

-- Plus aucun code ni jeton en clair.
DELETE FROM public.copil_access_tokens WHERE otp_hash IS NULL;

CREATE INDEX IF NOT EXISTS idx_copil_tokens_demande
  ON public.copil_access_tokens (committee_id, email, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_copil_session_hash
  ON public.copil_access_tokens (session_hash) WHERE session_hash IS NOT NULL;

-- Personne d'autre que le serveur ne touche à cette table.
REVOKE ALL ON public.copil_access_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.copil_access_tokens TO service_role;


CREATE OR REPLACE FUNCTION public.copil_empreinte(_valeur text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(_valeur, 'UTF8')), 'hex');
$$;
REVOKE ALL ON FUNCTION public.copil_empreinte(text) FROM PUBLIC, anon, authenticated;


-- Le membre externe d'un comité ouvert, pour une adresse exacte.
CREATE OR REPLACE FUNCTION public.copil_membre_ouvert(_committee_id uuid, _email text)
RETURNS TABLE (nom text, comite text, mission text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(trim(cm.external_name), ''), cm.external_email), c.name, m.name
  FROM public.committee_members cm
  JOIN public.committees c ON c.id = cm.committee_id
  LEFT JOIN public.missions m ON m.id = c.mission_id
  WHERE cm.committee_id = _committee_id
    AND cm.is_external
    AND lower(trim(cm.external_email)) = lower(trim(_email))
    AND COALESCE(m.status, '') NOT IN ('archived', 'completed', 'cancelled', 'annulee')
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.copil_membre_ouvert(uuid, text) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.copil_demander_code(_committee_id uuid, _email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _adresse text := lower(trim(_email));
  _m       record;
  _code    text;
BEGIN
  -- Ménage : les demandes de plus de 7 jours disparaissent.
  DELETE FROM public.copil_access_tokens WHERE created_at < now() - interval '7 days';

  SELECT * INTO _m FROM public.copil_membre_ouvert(_committee_id, _adresse);
  IF _m.nom IS NULL THEN
    RETURN jsonb_build_object('envoyer', false);          -- même réponse côté portail
  END IF;

  -- Au plus 1 code par minute et 5 par heure, par comité et par adresse.
  IF EXISTS (SELECT 1 FROM public.copil_access_tokens
             WHERE committee_id = _committee_id AND email = _adresse
               AND created_at > now() - interval '1 minute')
     OR (SELECT count(*) FROM public.copil_access_tokens
         WHERE committee_id = _committee_id AND email = _adresse
           AND created_at > now() - interval '1 hour') >= 5 THEN
    RETURN jsonb_build_object('envoyer', false, 'raison', 'trop_de_demandes');
  END IF;

  -- Un seul code vaut à la fois.
  UPDATE public.copil_access_tokens SET annule = true
  WHERE committee_id = _committee_id AND email = _adresse
    AND NOT COALESCE(verified, false) AND NOT annule;

  -- 6 chiffres tirés par le serveur (32 bits aléatoires d'un UUID v4).
  _code := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint)
                 % 1000000)::text, 6, '0');

  INSERT INTO public.copil_access_tokens (committee_id, email, otp_hash, otp_expires_at)
  VALUES (_committee_id, _adresse, public.copil_empreinte(_committee_id::text || ':' || _adresse || ':' || _code),
          now() + interval '15 minutes');

  RETURN jsonb_build_object('envoyer', true, 'code', _code, 'nom', _m.nom,
                            'comite', _m.comite, 'mission', _m.mission);
END;
$$;
REVOKE ALL ON FUNCTION public.copil_demander_code(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.copil_demander_code(uuid, text) TO service_role;


CREATE OR REPLACE FUNCTION public.copil_verifier_code(_committee_id uuid, _email text, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _adresse text := lower(trim(_email));
  _t       public.copil_access_tokens;
  _jeton   text;
BEGIN
  -- Le dernier code valable, verrouillé le temps de la vérification.
  SELECT * INTO _t FROM public.copil_access_tokens
  WHERE committee_id = _committee_id AND email = _adresse
    AND NOT COALESCE(verified, false) AND NOT annule
    AND otp_expires_at > now() AND tentatives < 5
  ORDER BY created_at DESC LIMIT 1
  FOR UPDATE;

  IF _t.id IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  IF _t.otp_hash IS DISTINCT FROM
     public.copil_empreinte(_committee_id::text || ':' || _adresse || ':' || trim(COALESCE(_code, ''))) THEN
    UPDATE public.copil_access_tokens SET tentatives = tentatives + 1 WHERE id = _t.id;
    RETURN jsonb_build_object('ok', false);
  END IF;

  -- Le membre doit l'être encore au moment de la vérification.
  IF NOT EXISTS (SELECT 1 FROM public.copil_membre_ouvert(_committee_id, _adresse)) THEN
    UPDATE public.copil_access_tokens SET annule = true WHERE id = _t.id;
    RETURN jsonb_build_object('ok', false);
  END IF;

  _jeton := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  UPDATE public.copil_access_tokens SET
    verified           = true,
    otp_hash           = NULL,
    session_hash       = public.copil_empreinte(_jeton),
    session_expires_at = now() + interval '12 hours'
  WHERE id = _t.id;

  RETURN jsonb_build_object('ok', true, 'jeton', _jeton);
END;
$$;
REVOKE ALL ON FUNCTION public.copil_verifier_code(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.copil_verifier_code(uuid, text, text) TO service_role;


CREATE OR REPLACE FUNCTION public.copil_session(_committee_id uuid, _jeton text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object('ok', true, 'email', t.email)
     FROM public.copil_access_tokens t
     WHERE t.committee_id = _committee_id
       AND t.session_hash = public.copil_empreinte(COALESCE(_jeton, ''))
       AND t.verified AND NOT t.annule
       AND t.session_expires_at > now()
       AND EXISTS (SELECT 1 FROM public.copil_membre_ouvert(_committee_id, t.email))
     LIMIT 1),
    jsonb_build_object('ok', false));
$$;
REVOKE ALL ON FUNCTION public.copil_session(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.copil_session(uuid, text) TO service_role;

COMMIT;


-- ═══════════════════════════════════════════════════════════════════════════
--  BLOC 2 — LES ESSAIS (tout est annulé à la fin)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.essai_copil_54()
RETURNS TABLE (n int, etat text, controle text, detail text)
LANGUAGE plpgsql AS $$
DECLARE
  _org  uuid; _mission uuid := gen_random_uuid(); _comite uuid := gen_random_uuid();
  _ext  text := 'j.doe-54@client.invalid';
  _r    jsonb; _code text; _jeton text; _faux text;
  _ok   boolean;
  _n int[] := '{}'; _e text[] := '{}'; _c text[] := '{}'; _d text[] := '{}';
BEGIN
  SELECT organization_id INTO _org FROM public.profiles WHERE organization_id IS NOT NULL LIMIT 1;

  BEGIN
    -- Un comité d'essai sur une mission d'essai, avec un membre externe.
    INSERT INTO public.missions (id, organization_id, name, code, status)
    VALUES (_mission, _org, 'Mission essai 54', 'ESSAI-54-' || left(_mission::text, 8), 'active');
    INSERT INTO public.committees (id, mission_id, name, type)
    VALUES (_comite, _mission, 'COPIL essai 54', 'copil');
    INSERT INTO public.committee_members (committee_id, is_external, external_email, external_name)
    VALUES (_comite, true, _ext, 'Membre externe');

    -- 1. Une adresse avec joker ne passe plus
    _r := public.copil_demander_code(_comite, 'j_doe-54@client.invalid');
    _n := _n || 1; _c := _c || 'Une adresse avec joker n''obtient pas de code'::text;
    _e := _e || (CASE WHEN NOT (_r->>'envoyer')::boolean THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    -- 2. La bonne adresse obtient un code ; une seule empreinte, pas de clair
    _r := public.copil_demander_code(_comite, '  J.Doe-54@Client.invalid ');
    _code := _r->>'code';
    _ok := (_r->>'envoyer')::boolean AND _code ~ '^\d{6}$'
       AND EXISTS (SELECT 1 FROM public.copil_access_tokens WHERE committee_id = _comite
                   AND otp_hash IS NOT NULL AND otp_code IS NULL AND email = _ext);
    _n := _n || 2; _c := _c || 'Le membre obtient un code ; seule son empreinte est gardee'::text;
    _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    -- 3. Une seconde demande dans la minute est refusée
    _r := public.copil_demander_code(_comite, _ext);
    _n := _n || 3; _c := _c || 'Pas plus d''un code par minute'::text;
    _e := _e || (CASE WHEN NOT (_r->>'envoyer')::boolean AND _r->>'raison' = 'trop_de_demandes'
                      THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    -- 4. Cinq essais faux brûlent le code, même si le sixième est le bon
    _faux := CASE WHEN _code = '000000' THEN '111111' ELSE '000000' END;
    FOR i IN 1..5 LOOP PERFORM public.copil_verifier_code(_comite, _ext, _faux); END LOOP;
    _r := public.copil_verifier_code(_comite, _ext, _code);
    _n := _n || 4; _c := _c || 'Apres 5 essais faux, le code est brule'::text;
    _e := _e || (CASE WHEN NOT (_r->>'ok')::boolean THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    -- 5. Nouveau code (on recule l'horloge des demandes) : le bon code ouvre une session
    UPDATE public.copil_access_tokens SET created_at = created_at - interval '2 minutes' WHERE committee_id = _comite;
    _r := public.copil_demander_code(_comite, _ext);
    _code := _r->>'code';
    _r := public.copil_verifier_code(_comite, _ext, _code);
    _jeton := _r->>'jeton';
    _ok := (_r->>'ok')::boolean AND length(_jeton) = 64
       AND (public.copil_session(_comite, _jeton)->>'ok')::boolean
       AND NOT EXISTS (SELECT 1 FROM public.copil_access_tokens WHERE committee_id = _comite
                       AND (session_token IS NOT NULL OR otp_code IS NOT NULL));
    _n := _n || 5; _c := _c || 'Le bon code ouvre une session ; aucun jeton en clair'::text;
    _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    -- 6. Un code ne sert qu'une fois
    _r := public.copil_verifier_code(_comite, _ext, _code);
    _n := _n || 6; _c := _c || 'Un code ne sert qu''une fois'::text;
    _e := _e || (CASE WHEN NOT (_r->>'ok')::boolean THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    -- 7. Un faux jeton, ou le jeton sur un autre comité, ne vaut rien
    _ok := NOT (public.copil_session(_comite, 'faux')->>'ok')::boolean
       AND NOT (public.copil_session(gen_random_uuid(), _jeton)->>'ok')::boolean;
    _n := _n || 7; _c := _c || 'Un faux jeton ou un autre comite : refuse'::text;
    _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    -- 8. Retiré du comité : la session tombe aussitôt
    DELETE FROM public.committee_members WHERE committee_id = _comite AND external_email = _ext;
    _ok := NOT (public.copil_session(_comite, _jeton)->>'ok')::boolean;
    _n := _n || 8; _c := _c || 'Un membre retire perd l''acces aussitot'::text;
    _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    -- 9. Mission terminée : plus de code
    INSERT INTO public.committee_members (committee_id, is_external, external_email, external_name)
    VALUES (_comite, true, _ext, 'Membre externe');
    UPDATE public.missions SET status = 'completed' WHERE id = _mission;
    UPDATE public.copil_access_tokens SET created_at = created_at - interval '2 hours' WHERE committee_id = _comite;
    _r := public.copil_demander_code(_comite, _ext);
    _ok := NOT (_r->>'envoyer')::boolean AND NOT (public.copil_session(_comite, _jeton)->>'ok')::boolean;
    _n := _n || 9; _c := _c || 'Mission terminee : ni code ni session'::text;
    _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

    RAISE EXCEPTION 'ANNULATION_VOULUE';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'ANNULATION_VOULUE' THEN
      _n := _n || 99; _e := _e || '**ECHEC**'::text;
      _c := _c || 'Les essais se sont interrompus'::text; _d := _d || left(SQLERRM, 200);
    END IF;
  END;

  _n := _n || 10; _c := _c || 'Le navigateur ne touche ni a la table ni aux fonctions'::text;
  _ok := NOT has_table_privilege('anon', 'public.copil_access_tokens', 'SELECT')
     AND NOT has_table_privilege('authenticated', 'public.copil_access_tokens', 'SELECT')
     AND NOT has_table_privilege('anon', 'public.copil_access_tokens', 'TRUNCATE')
     AND NOT has_function_privilege('anon', 'public.copil_demander_code(uuid,text)', 'EXECUTE')
     AND NOT has_function_privilege('anon', 'public.copil_verifier_code(uuid,text,text)', 'EXECUTE')
     AND NOT has_function_privilege('authenticated', 'public.copil_session(uuid,text)', 'EXECUTE');
  _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

  _n := _n || 11; _c := _c || 'Plus aucun code ni jeton en clair dans la table'::text;
  _ok := NOT EXISTS (SELECT 1 FROM public.copil_access_tokens WHERE otp_code IS NOT NULL OR session_token IS NOT NULL);
  _e := _e || (CASE WHEN _ok THEN 'OK' ELSE '**ECHEC**' END)::text; _d := _d || NULL::text;

  _n := _n || 12; _c := _c || 'Les essais n''ont rien laisse'::text;
  _ok := NOT EXISTS (SELECT 1 FROM public.missions WHERE id = _mission)
     AND NOT EXISTS (SELECT 1 FROM public.copil_access_tokens WHERE committee_id = _comite);
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
--   DROP FUNCTION public.essai_copil_54();
REVOKE ALL ON FUNCTION public.essai_copil_54() FROM PUBLIC, anon, authenticated;

SELECT n AS "N", etat AS "Etat", controle AS "Controle", detail AS "Detail"
FROM public.essai_copil_54()
ORDER BY n;
