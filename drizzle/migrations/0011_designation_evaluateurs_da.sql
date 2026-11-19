DROP FUNCTION IF EXISTS public.assign_evaluator(uuid, uuid, uuid, eval_type, smallint, date, eval_practice);

CREATE FUNCTION public.assign_evaluator(_mission_id uuid, _evaluatee_id uuid, _evaluator_id uuid, _eval_type eval_type DEFAULT 'mission', _exercice smallint DEFAULT NULL, _due_date date DEFAULT NULL, _practice eval_practice DEFAULT NULL, _dossier_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _org uuid; _ee int; _er int; _rk_ee int; _rk_er int;
BEGIN
  IF NOT public.est_directeur_associe(auth.uid()) THEN
    RAISE EXCEPTION 'La désignation des évaluateurs revient au directeur associé.';
  END IF;
  SELECT organization_id INTO _org FROM profiles WHERE id = auth.uid();
  SELECT grade_level INTO _ee FROM profiles WHERE id = _evaluatee_id AND organization_id = _org;
  SELECT grade_level INTO _er FROM profiles WHERE id = _evaluator_id AND organization_id = _org;
  IF _ee IS NULL OR _er IS NULL THEN RAISE EXCEPTION 'Collaborateur ou évaluateur introuvable dans votre cabinet.'; END IF;
  IF _evaluator_id = _evaluatee_id THEN RAISE EXCEPTION 'Un collaborateur ne peut pas s''évaluer lui-même.'; END IF;

  IF _eval_type = 'mission' THEN
    IF _mission_id IS NULL OR NOT EXISTS (SELECT 1 FROM missions WHERE id = _mission_id AND organization_id = _org) THEN
      RAISE EXCEPTION 'Mission introuvable dans votre cabinet.'; END IF;
    SELECT CASE role WHEN 'associe' THEN 1 WHEN 'directeur_mission' THEN 2 WHEN 'chef_mission' THEN 3 WHEN 'auditeur_experimente' THEN 4 WHEN 'auditeur' THEN 5 WHEN 'auditeur_junior' THEN 6 END
      INTO _rk_ee FROM mission_members WHERE mission_id = _mission_id AND user_id = _evaluatee_id;
    SELECT CASE role WHEN 'associe' THEN 1 WHEN 'directeur_mission' THEN 2 WHEN 'chef_mission' THEN 3 WHEN 'auditeur_experimente' THEN 4 WHEN 'auditeur' THEN 5 WHEN 'auditeur_junior' THEN 6 END
      INTO _rk_er FROM mission_members WHERE mission_id = _mission_id AND user_id = _evaluator_id;
    IF _rk_ee IS NULL OR _rk_er IS NULL THEN RAISE EXCEPTION 'L''évaluateur et le collaborateur doivent tous deux être membres de l''équipe de la mission.'; END IF;
    IF _rk_er >= _rk_ee THEN RAISE EXCEPTION 'Dans une mission, l''évaluateur doit dominer le collaborateur par son rôle.'; END IF;
    _dossier_id := NULL;
  ELSIF _eval_type = 'dossier' THEN
    IF _dossier_id IS NULL OR NOT EXISTS (SELECT 1 FROM client_fiscal_profile WHERE id = _dossier_id AND organization_id = _org) THEN
      RAISE EXCEPTION 'Dossier comptable introuvable dans votre cabinet.'; END IF;
    IF _er >= _ee THEN RAISE EXCEPTION 'Hors mission, l''évaluateur doit être d''un grade supérieur à celui du collaborateur.'; END IF;
    _mission_id := NULL;
  ELSIF _eval_type = 'annuelle' THEN
    IF _exercice IS NULL THEN RAISE EXCEPTION 'Précisez l''exercice de l''évaluation annuelle.'; END IF;
    IF _er >= _ee THEN RAISE EXCEPTION 'Hors mission, l''évaluateur doit être d''un grade supérieur à celui du collaborateur.'; END IF;
    IF EXISTS (SELECT 1 FROM evaluation_assignments WHERE evaluatee_id = _evaluatee_id AND eval_type = 'annuelle' AND COALESCE(exercice,0) = _exercice AND status <> 'annulee') THEN
      RAISE EXCEPTION 'Un évaluateur annuel est déjà désigné pour ce collaborateur sur cet exercice. Retirez la désignation existante avant d''en faire une autre.'; END IF;
    _mission_id := NULL; _dossier_id := NULL;
  ELSE
    IF _er >= _ee THEN RAISE EXCEPTION 'L''évaluateur doit être d''un grade supérieur à celui du collaborateur.'; END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM evaluation_assignments WHERE status <> 'annulee' AND eval_type = _eval_type AND evaluatee_id = _evaluatee_id AND evaluator_id = _evaluator_id
      AND mission_id IS NOT DISTINCT FROM _mission_id AND dossier_id IS NOT DISTINCT FROM _dossier_id AND COALESCE(exercice,0) = COALESCE(_exercice,0)) THEN
    RAISE EXCEPTION 'Cet évaluateur est déjà désigné pour ce collaborateur.'; END IF;

  INSERT INTO evaluation_assignments (organization_id, mission_id, dossier_id, eval_type, exercice, practice, evaluator_id, evaluatee_id, assigned_by, due_date)
  VALUES (_org, _mission_id, _dossier_id, _eval_type, _exercice, _practice, _evaluator_id, _evaluatee_id, auth.uid(), _due_date);

  INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id, priority)
  VALUES (_evaluator_id, 'evaluation_assigned', 'Évaluation à réaliser',
    'Vous êtes désigné évaluateur de ' || COALESCE((SELECT full_name FROM profiles WHERE id = _evaluatee_id), 'un collaborateur') ||
    COALESCE(' pour la mission ' || (SELECT name FROM missions WHERE id = _mission_id), '') || '.',
    CASE WHEN _mission_id IS NOT NULL THEN 'mission' ELSE 'evaluation' END, _mission_id, 'normal');
  RETURN jsonb_build_object('success', true);
END; $$;
REVOKE ALL ON FUNCTION public.assign_evaluator(uuid, uuid, uuid, eval_type, smallint, date, eval_practice, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_evaluator(uuid, uuid, uuid, eval_type, smallint, date, eval_practice, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.retirer_designation(_assignment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.est_directeur_associe(auth.uid()) THEN
    RAISE EXCEPTION 'La désignation des évaluateurs revient au directeur associé.'; END IF;
  IF EXISTS (SELECT 1 FROM evaluations e WHERE e.assignment_id = _assignment_id) THEN
    RAISE EXCEPTION 'L''évaluation est déjà ouverte : cette désignation ne peut plus être retirée.'; END IF;
  UPDATE evaluation_assignments SET status = 'annulee'
   WHERE id = _assignment_id AND status = 'a_faire'
     AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Désignation introuvable ou déjà engagée.'; END IF;
  RETURN jsonb_build_object('success', true);
END; $$;
REVOKE ALL ON FUNCTION public.retirer_designation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retirer_designation(uuid) TO authenticated;