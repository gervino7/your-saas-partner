DO $migration$
DECLARE _source text;
BEGIN
  SELECT pg_get_functiondef('public.get_my_evaluations()'::regprocedure) INTO _source;
  _source := replace(_source, '''assignment_id'', a.id, ''mission_id'', a.mission_id,', '''assignment_id'', a.id, ''mission_id'', a.mission_id, ''objet'', CASE WHEN a.dossier_id IS NOT NULL THEN ''dossier'' ELSE ''mission'' END,');
  _source := replace(_source, '''id'', e.id, ''status'', e.status,', '''id'', e.id, ''status'', e.status, ''objet'', CASE WHEN e.dossier_id IS NOT NULL THEN ''dossier'' ELSE ''mission'' END,');
  _source := replace(_source, '''id'', e.id, ''status'', e.status, ''objet'', CASE WHEN e.dossier_id IS NOT NULL THEN ''dossier'' ELSE ''mission'' END, ''mission_code'', e.mission_code,', '''id'', e.id, ''status'', e.status, ''objet'', CASE WHEN e.dossier_id IS NOT NULL THEN ''dossier'' ELSE ''mission'' END, ''eval_type'', e.eval_type, ''mission_code'', e.mission_code,');
  _source := replace(_source, '-- Vue direction : évaluations validées de l''organisation', '-- Vue direction : évaluations validées de l''organisation');
  _source := replace(_source, '''disagreement'', e.disagreement, ''validated_at'', e.validated_at,', '''disagreement'', e.disagreement, ''validated_at'', e.validated_at, ''mission_name'', COALESCE(public.dossier_label(e.dossier_id), (SELECT m.name FROM public.missions m WHERE m.id=e.mission_id)),');
  EXECUTE _source;

  SELECT pg_get_functiondef('public.get_evaluation_form(uuid)'::regprocedure) INTO _source;
  _source := replace(_source, '''mission_id'', _e.mission_id, ''mission_code'', _e.mission_code,', '''mission_id'', _e.mission_id, ''mission_code'', _e.mission_code, ''objet'', CASE WHEN _e.dossier_id IS NOT NULL THEN ''dossier'' ELSE ''mission'' END,');
  _source := replace(_source, '''mission_name'', (SELECT name FROM missions WHERE id = _e.mission_id),', '''mission_name'', COALESCE(public.dossier_label(_e.dossier_id), (SELECT name FROM missions WHERE id = _e.mission_id)),');
  EXECUTE _source;
END $migration$;