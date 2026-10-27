CREATE OR REPLACE FUNCTION public.get_mission_evaluations(_mission_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _org uuid;
BEGIN
 _org:=public.get_user_organization_id(auth.uid());
 IF _org IS NULL OR NOT EXISTS(SELECT 1 FROM missions WHERE id=_mission_id AND organization_id=_org) OR NOT public.can_access_mission(auth.uid(),_mission_id) THEN RAISE EXCEPTION 'Accès refusé à cette mission'; END IF;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'status',e.status,'weighted_score',e.weighted_score,'evaluatee',jsonb_build_object('full_name',pe.full_name),'evaluator',jsonb_build_object('full_name',pr.full_name))) FROM evaluations e JOIN profiles pe ON pe.id=e.evaluatee_id JOIN profiles pr ON pr.id=e.evaluator_id WHERE e.mission_id=_mission_id AND e.organization_id=_org AND public.can_read_evaluation(e.id)),'[]'::jsonb);
END $function$;
