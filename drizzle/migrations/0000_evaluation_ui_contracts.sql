CREATE OR REPLACE FUNCTION public.assign_evaluator(_mission_id uuid, _evaluatee_id uuid, _evaluator_id uuid, _eval_type public.eval_type DEFAULT 'mission', _exercice smallint DEFAULT NULL, _due_date date DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _grade int; _ee int; _er int; _assignment uuid; _status text;
BEGIN
 SELECT organization_id,grade_level INTO _org,_grade FROM profiles WHERE id=auth.uid();
 IF _org IS NULL OR COALESCE(_grade,99)>2 THEN RAISE EXCEPTION 'Accès refusé : la désignation des évaluateurs relève du Directeur Associé ou du Directeur de Mission'; END IF;
 SELECT grade_level INTO _ee FROM profiles WHERE id=_evaluatee_id AND organization_id=_org;
 SELECT grade_level INTO _er FROM profiles WHERE id=_evaluator_id AND organization_id=_org;
 IF _ee IS NULL OR _er IS NULL THEN RAISE EXCEPTION 'Collaborateur ou évaluateur introuvable dans votre organisation'; END IF;
 IF _evaluatee_id=_evaluator_id THEN RAISE EXCEPTION 'Un collaborateur ne peut pas s''évaluer lui-même'; END IF;
 IF _er>=_ee THEN RAISE EXCEPTION 'L''évaluateur doit être d''un grade supérieur à celui du collaborateur évalué'; END IF;
 IF _mission_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM missions WHERE id=_mission_id AND organization_id=_org) THEN RAISE EXCEPTION 'Mission introuvable dans votre organisation'; END IF;
 IF _eval_type='annuelle' AND _exercice IS NULL THEN RAISE EXCEPTION 'Renseignez l''exercice de la campagne annuelle'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_org::text||_evaluatee_id::text||_eval_type::text||COALESCE(_mission_id::text,'')||COALESCE(_exercice::text,''),0));
 SELECT id INTO _assignment FROM evaluation_assignments WHERE organization_id=_org AND evaluatee_id=_evaluatee_id AND eval_type=_eval_type AND mission_id IS NOT DISTINCT FROM _mission_id AND exercice IS NOT DISTINCT FROM _exercice AND status<>'annulee' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF _assignment IS NOT NULL THEN
  SELECT status INTO _status FROM evaluations WHERE assignment_id=_assignment;
  IF _status IS NOT NULL AND _status<>'brouillon' THEN RAISE EXCEPTION 'Une évaluation déjà transmise ne peut pas être réaffectée'; END IF;
  UPDATE evaluation_assignments SET evaluator_id=_evaluator_id,due_date=_due_date,assigned_by=auth.uid() WHERE id=_assignment;
  UPDATE evaluations SET evaluator_id=_evaluator_id WHERE assignment_id=_assignment;
 ELSE
  INSERT INTO evaluation_assignments(organization_id,mission_id,eval_type,exercice,evaluator_id,evaluatee_id,assigned_by,due_date) VALUES(_org,_mission_id,_eval_type,_exercice,_evaluator_id,_evaluatee_id,auth.uid(),_due_date) RETURNING id INTO _assignment;
 END IF;
 INSERT INTO notifications(user_id,type,title,content,entity_type,entity_id,priority) VALUES(_evaluator_id,'evaluation_assigned','Évaluation à réaliser','Vous êtes désigné évaluateur de '||(SELECT full_name FROM profiles WHERE id=_evaluatee_id),CASE WHEN _mission_id IS NULL THEN 'evaluation' ELSE 'mission' END,_mission_id,'normal');
 RETURN jsonb_build_object('success',true,'assignment_id',_assignment);
END $$;
REVOKE ALL ON FUNCTION public.assign_evaluator(uuid,uuid,uuid,public.eval_type,smallint,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assign_evaluator(uuid,uuid,uuid,public.eval_type,smallint,date) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_annual_campaign(_exercice smallint DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _org uuid; _grade int; _ex smallint;
BEGIN
 SELECT organization_id,grade_level INTO _org,_grade FROM profiles WHERE id=auth.uid();
 IF _org IS NULL OR COALESCE(_grade,99)>2 THEN RAISE EXCEPTION 'Accès refusé : suivi réservé à la direction'; END IF;
 _ex:=COALESCE(_exercice,public.fiscal_exercice(CURRENT_DATE,_org));
 RETURN jsonb_build_object('exercice',_ex,'lignes',COALESCE((SELECT jsonb_agg(jsonb_build_object('assignment_id',a.id,'evaluatee_id',a.evaluatee_id,'evaluator_id',a.evaluator_id,'evaluation_id',e.id,'collaborateur',pe.full_name,'grade',pe.grade,'echelon',pe.grade_echelon,'practice',pe.practice,'evaluateur',pr.full_name,'due_date',a.due_date,'statut',COALESCE(e.status,'non_ouverte'),'score',e.weighted_score,'appreciation',e.appreciation_label,'desaccord',COALESCE(e.disagreement,false),'nb_missions_exercice',(SELECT COUNT(*) FROM evaluations m WHERE m.evaluatee_id=a.evaluatee_id AND m.eval_type='mission' AND m.exercice=_ex AND m.status IN ('validee','cloturee'))) ORDER BY pe.grade_level,pe.full_name) FROM evaluation_assignments a JOIN profiles pe ON pe.id=a.evaluatee_id LEFT JOIN profiles pr ON pr.id=a.evaluator_id LEFT JOIN evaluations e ON e.assignment_id=a.id WHERE a.organization_id=_org AND a.eval_type='annuelle' AND a.exercice=_ex AND a.status<>'annulee'),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.get_annual_campaign(smallint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_annual_campaign(smallint) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_evaluation_feedback(_evaluation_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _e RECORD; _grade int; _org uuid;
BEGIN
 SELECT * INTO _e FROM evaluations WHERE id=_evaluation_id;
 IF _e IS NULL THEN RAISE EXCEPTION 'Évaluation introuvable'; END IF;
 SELECT organization_id,grade_level INTO _org,_grade FROM profiles WHERE id=auth.uid();
 IF _org IS NULL OR _e.organization_id<>_org OR _e.evaluatee_id=auth.uid() OR (_e.evaluator_id<>auth.uid() AND COALESCE(_grade,99)>2) THEN RAISE EXCEPTION 'Accès refusé : les avis consultatifs sont destinés à l''évaluateur'; END IF;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',f.id,'contributeur',p.full_name,'grade',p.grade,'mission_code',(SELECT code FROM missions WHERE id=f.mission_id),'statut',f.status,'appreciation',f.overall,'points_forts',f.strengths,'axes_progres',f.improvements,'sollicite_le',f.requested_at,'rendu_le',f.submitted_at) ORDER BY f.requested_at) FROM evaluation_feedback f JOIN profiles p ON p.id=f.contributor_id WHERE f.evaluation_id=_evaluation_id),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.get_evaluation_feedback(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_evaluation_feedback(uuid) TO authenticated,service_role;
COMMENT ON COLUMN public.task_submissions.rating IS 'DEPRECATED: replaced by weighted collaborator evaluations; historical values retained.';