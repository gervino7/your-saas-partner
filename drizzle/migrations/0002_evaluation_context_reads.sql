CREATE OR REPLACE FUNCTION public.get_pending_evaluation_feedback() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',f.id,'requested_at',f.requested_at,'evaluation',jsonb_build_object('evaluatee',jsonb_build_object('full_name',pe.full_name),'mission_name',jsonb_build_object('name',m.name)),'requester',jsonb_build_object('full_name',pr.full_name)) ORDER BY f.requested_at),'[]'::jsonb)
 FROM evaluation_feedback f JOIN evaluations e ON e.id=f.evaluation_id JOIN profiles pe ON pe.id=e.evaluatee_id JOIN profiles pr ON pr.id=f.requested_by JOIN profiles caller ON caller.id=auth.uid() AND caller.organization_id=f.organization_id LEFT JOIN missions m ON m.id=f.mission_id
 WHERE f.contributor_id=auth.uid() AND f.status='sollicite' AND e.evaluatee_id<>auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_pending_evaluation_feedback() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_pending_evaluation_feedback() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_mission_evaluations(_mission_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE _org uuid;
BEGIN
 _org:=public.get_user_organization_id(auth.uid());
 IF _org IS NULL OR NOT EXISTS(SELECT 1 FROM missions WHERE id=_mission_id AND organization_id=_org) OR NOT public.can_access_mission(_mission_id,auth.uid()) THEN RAISE EXCEPTION 'Accès refusé à cette mission'; END IF;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'status',e.status,'weighted_score',e.weighted_score,'evaluatee',jsonb_build_object('full_name',pe.full_name),'evaluator',jsonb_build_object('full_name',pr.full_name))) FROM evaluations e JOIN profiles pe ON pe.id=e.evaluatee_id JOIN profiles pr ON pr.id=e.evaluator_id WHERE e.mission_id=_mission_id AND e.organization_id=_org AND public.can_read_evaluation(e.id)),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.get_mission_evaluations(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_mission_evaluations(uuid) TO authenticated,service_role;