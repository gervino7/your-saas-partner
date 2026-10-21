CREATE OR REPLACE FUNCTION public.open_annual_campaign(_exercice smallint DEFAULT NULL::smallint, _due_date date DEFAULT NULL::date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _org uuid; _grade int; _ex smallint;
  _created int := 0; _incomplets int := 0; _sans_evaluateur int := 0; _deja int := 0;
  _r RECORD; _evaluator uuid;
BEGIN
  SELECT p.organization_id, p.grade_level INTO _org, _grade FROM profiles p WHERE p.id = auth.uid();
  IF COALESCE(_grade, 99) > 2 THEN
    RAISE EXCEPTION 'Accès refusé : l''ouverture de la campagne annuelle relève du Directeur Associé ou du Directeur de Mission';
  END IF;
  _ex := COALESCE(_exercice, public.fiscal_exercice(CURRENT_DATE, _org));

  FOR _r IN
    SELECT p.id, p.grade_level, p.practice, p.grade_echelon FROM profiles p
    WHERE p.organization_id = _org AND COALESCE(p.is_active, true)
    ORDER BY p.grade_level, p.full_name
  LOOP
    IF EXISTS (SELECT 1 FROM evaluation_assignments a WHERE a.evaluatee_id=_r.id AND a.eval_type='annuelle' AND a.exercice=_ex AND a.mission_id IS NULL AND a.status<>'annulee') THEN
      _deja := _deja + 1; CONTINUE;
    END IF;
    IF _r.practice IS NULL OR _r.grade_echelon IS NULL THEN
      _incomplets := _incomplets + 1; CONTINUE;
    END IF;
    _evaluator := NULL;
    SELECT e.evaluator_id INTO _evaluator FROM evaluations e
    WHERE e.evaluatee_id = _r.id AND e.eval_type = 'mission' AND e.exercice = _ex
      AND e.status IN ('validee','cloturee') AND e.evaluator_id <> _r.id
    GROUP BY e.evaluator_id ORDER BY COUNT(*) DESC, MAX(e.validated_at) DESC LIMIT 1;
    IF _evaluator IS NULL THEN
      SELECT p2.id INTO _evaluator FROM profiles p2
      WHERE p2.organization_id = _org AND p2.grade_level < _r.grade_level
        AND COALESCE(p2.is_active, true) AND p2.id <> _r.id
      ORDER BY p2.grade_level DESC LIMIT 1;
    END IF;
    IF _evaluator IS NULL THEN _sans_evaluateur := _sans_evaluateur + 1; CONTINUE; END IF;
    INSERT INTO evaluation_assignments (organization_id, mission_id, eval_type, exercice, evaluator_id, evaluatee_id, assigned_by, due_date)
    VALUES (_org, NULL, 'annuelle', _ex, _evaluator, _r.id, auth.uid(), _due_date)
    ON CONFLICT DO NOTHING;
    IF FOUND THEN _created := _created + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('exercice', _ex, 'affectations_creees', _created, 'profils_incomplets', _incomplets, 'sans_evaluateur', _sans_evaluateur, 'deja_ouvertes', _deja);
END; $function$;