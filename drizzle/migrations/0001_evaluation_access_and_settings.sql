DO $migration$
DECLARE _name text; _oid oid; _definition text;
BEGIN
 FOREACH _name IN ARRAY ARRAY['get_mission_aggregate','get_global_evaluation','get_evaluation_history'] LOOP
  SELECT p.oid INTO _oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=_name;
  _definition:=pg_get_functiondef(_oid);
  _definition:=replace(_definition,E'BEGIN\n',E'BEGIN\n  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles target JOIN public.profiles caller ON caller.organization_id=target.organization_id WHERE target.id=_user_id AND caller.id=auth.uid() AND (target.id=auth.uid() OR COALESCE(caller.grade_level,99)<=2)) THEN RAISE EXCEPTION ''Accès refusé à cette synthèse''; END IF;\n');
  EXECUTE _definition;
 END LOOP;
END $migration$;
ALTER POLICY eval_fb_read ON public.evaluation_feedback USING (
 organization_id=public.get_user_organization_id(auth.uid())
 AND NOT EXISTS(SELECT 1 FROM public.evaluations e WHERE e.id=evaluation_id AND e.evaluatee_id=auth.uid())
 AND (contributor_id=auth.uid() OR requested_by=auth.uid() OR public.get_user_grade_level(auth.uid())<=2)
);
CREATE OR REPLACE FUNCTION public.set_evaluation_settings(_missions numeric,_annuelle numeric,_aggregation text,_cycles smallint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _org uuid; _grade integer;
BEGIN
 SELECT organization_id,grade_level INTO _org,_grade FROM profiles WHERE id=auth.uid();
 IF _org IS NULL OR COALESCE(_grade,99)>2 THEN RAISE EXCEPTION 'Accès refusé : paramètres réservés à la direction'; END IF;
 IF _missions IS NULL OR _annuelle IS NULL OR _missions<0 OR _annuelle<0 OR abs(_missions+_annuelle-1)>0.00001 THEN RAISE EXCEPTION 'La somme des pondérations doit être égale à 100 %%'; END IF;
 IF _aggregation IS NULL OR _aggregation NOT IN ('simple','duree','charge') THEN RAISE EXCEPTION 'Mode d''agrégation invalide'; END IF;
 IF _cycles IS NULL OR _cycles<1 OR _cycles>5 THEN RAISE EXCEPTION 'Le nombre de cycles doit être compris entre 1 et 5'; END IF;
 UPDATE organizations SET eval_weight_missions=_missions,eval_weight_annuelle=_annuelle,eval_mission_aggregation=_aggregation,eval_history_cycles=_cycles WHERE id=_org;
END $$;
REVOKE ALL ON FUNCTION public.set_evaluation_settings(numeric,numeric,text,smallint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_evaluation_settings(numeric,numeric,text,smallint) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.set_evaluation_scale_thresholds(_thresholds jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _org uuid; _grade integer; _r jsonb; _prev numeric:=-1;
BEGIN
 SELECT organization_id,grade_level INTO _org,_grade FROM profiles WHERE id=auth.uid();
 IF _org IS NULL OR COALESCE(_grade,99)>2 THEN RAISE EXCEPTION 'Accès refusé : seuils réservés à la direction'; END IF;
 IF jsonb_typeof(_thresholds)<>'array' OR jsonb_array_length(_thresholds)<>(SELECT COUNT(*) FROM evaluation_scale WHERE organization_id=_org) THEN RAISE EXCEPTION 'Renseignez tous les niveaux de l''échelle'; END IF;
 IF (SELECT COUNT(DISTINCT x->>'id') FROM jsonb_array_elements(_thresholds) x)<>jsonb_array_length(_thresholds) THEN RAISE EXCEPTION 'Un niveau ne peut apparaître deux fois'; END IF;
 FOR _r IN SELECT x FROM jsonb_array_elements(_thresholds) x ORDER BY (x->>'min_score')::numeric LOOP
  IF NOT EXISTS(SELECT 1 FROM evaluation_scale WHERE id=(_r->>'id')::uuid AND organization_id=_org) THEN RAISE EXCEPTION 'Niveau introuvable dans votre cabinet'; END IF;
  IF (_r->>'min_score') IS NULL OR (_r->>'max_score') IS NULL OR (_r->>'min_score')::numeric<0 OR (_r->>'max_score')::numeric>100 OR (_r->>'min_score')::numeric>(_r->>'max_score')::numeric OR (_r->>'min_score')::numeric<=_prev THEN RAISE EXCEPTION 'Seuils invalides ou chevauchants'; END IF;
  _prev:=(_r->>'max_score')::numeric;
  UPDATE evaluation_scale SET min_score=(_r->>'min_score')::numeric,max_score=(_r->>'max_score')::numeric WHERE id=(_r->>'id')::uuid AND organization_id=_org;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.set_evaluation_scale_thresholds(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_evaluation_scale_thresholds(jsonb) TO authenticated,service_role;