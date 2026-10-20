CREATE OR REPLACE FUNCTION public.set_evaluation_practice_settings(_source text, _default public.eval_practice)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org uuid; _lvl int;
BEGIN
  SELECT organization_id, grade_level INTO _org, _lvl FROM public.profiles WHERE id = auth.uid();
  IF _org IS NULL OR COALESCE(_lvl, 8) > 2 THEN RAISE EXCEPTION 'Réservé à la direction du cabinet.'; END IF;
  IF _source NOT IN ('mission','collaborateur') THEN RAISE EXCEPTION 'Source de practice invalide.'; END IF;
  UPDATE public.organizations SET eval_mission_practice_source = _source, eval_default_practice = _default WHERE id = _org;
END $$;
REVOKE ALL ON FUNCTION public.set_evaluation_practice_settings(text, public.eval_practice) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_evaluation_practice_settings(text, public.eval_practice) TO authenticated;