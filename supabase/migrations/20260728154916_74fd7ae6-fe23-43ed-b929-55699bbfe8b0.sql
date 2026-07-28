CREATE OR REPLACE FUNCTION public.get_member_removal_impact(_mission_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _res jsonb;
BEGIN
  IF NOT public.can_access_mission(_mission_id) THEN
    RAISE EXCEPTION 'Accès refusé à cette mission';
  END IF;

  SELECT jsonb_build_object(
    'is_member', EXISTS (SELECT 1 FROM mission_members mm WHERE mm.mission_id = _mission_id AND mm.user_id = _user_id),
    'is_director', EXISTS (SELECT 1 FROM missions m WHERE m.id = _mission_id AND m.director_id = _user_id),
    'is_chief', EXISTS (SELECT 1 FROM missions m WHERE m.id = _mission_id AND m.chief_id = _user_id),
    'projects', (SELECT count(*) FROM project_members pm JOIN projects p ON p.id = pm.project_id
                 WHERE p.mission_id = _mission_id AND pm.user_id = _user_id),
    'tasks', (SELECT count(*) FROM task_assignments ta JOIN tasks t ON t.id = ta.task_id
              JOIN projects p ON p.id = t.project_id
              WHERE p.mission_id = _mission_id AND ta.user_id = _user_id),
    'staffing', (SELECT count(*) FROM staffing_assignments sa
                 WHERE sa.mission_id = _mission_id AND sa.user_id = _user_id AND sa.status <> 'cancelled'),
    'documents', (SELECT count(*) FROM documents d WHERE d.mission_id = _mission_id AND d.uploaded_by = _user_id),
    'hours', (SELECT COALESCE(sum(te.hours), 0) FROM time_entries te
              WHERE te.mission_id = _mission_id AND te.user_id = _user_id)
  ) INTO _res;

  RETURN _res;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_mission_member(_mission_id uuid, _user_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mission missions%ROWTYPE;
  _caller uuid := auth.uid();
  _caller_org uuid;
  _caller_level int;
  _removed_projects int := 0;
  _removed_tasks int := 0;
  _cancelled_staffing int := 0;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 5 THEN
    RAISE EXCEPTION 'Le motif est obligatoire (5 caractères minimum)';
  END IF;

  SELECT * INTO _mission FROM missions WHERE id = _mission_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission introuvable';
  END IF;

  SELECT organization_id, grade_level INTO _caller_org, _caller_level FROM profiles WHERE id = _caller;
  IF _caller_org IS DISTINCT FROM _mission.organization_id THEN
    RAISE EXCEPTION 'Accès refusé à cette mission';
  END IF;
  IF COALESCE(_caller_level, 8) > 3 THEN
    RAISE EXCEPTION 'Seuls les responsables (DA, DM, CM) peuvent retirer un collaborateur';
  END IF;
  IF _user_id = _caller THEN
    RAISE EXCEPTION 'Vous ne pouvez pas vous retirer vous-même de la mission';
  END IF;
  IF _mission.director_id = _user_id THEN
    RAISE EXCEPTION 'Impossible de retirer le directeur de mission';
  END IF;
  IF _mission.chief_id = _user_id THEN
    RAISE EXCEPTION 'Impossible de retirer le chef de mission';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM mission_members WHERE mission_id = _mission_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'Ce collaborateur n''est pas membre de la mission';
  END IF;

  WITH del AS (
    DELETE FROM task_assignments ta
    USING tasks t, projects p
    WHERE ta.task_id = t.id AND t.project_id = p.id
      AND p.mission_id = _mission_id AND ta.user_id = _user_id
      AND t.status NOT IN ('done', 'validated')
    RETURNING 1
  ) SELECT count(*) INTO _removed_tasks FROM del;

  WITH del AS (
    DELETE FROM project_members pm
    USING projects p
    WHERE pm.project_id = p.id AND p.mission_id = _mission_id AND pm.user_id = _user_id
    RETURNING 1
  ) SELECT count(*) INTO _removed_projects FROM del;

  WITH upd AS (
    UPDATE staffing_assignments
    SET status = 'cancelled', updated_at = now()
    WHERE mission_id = _mission_id AND user_id = _user_id AND status <> 'cancelled'
    RETURNING 1
  ) SELECT count(*) INTO _cancelled_staffing FROM upd;

  DELETE FROM mission_members WHERE mission_id = _mission_id AND user_id = _user_id;

  INSERT INTO activity_logs (user_id, organization_id, action, entity_type, entity_id, metadata)
  VALUES (_caller, _mission.organization_id, 'mission_member_removed', 'mission', _mission_id,
          jsonb_build_object('removed_user', _user_id, 'reason', btrim(_reason),
                             'projects', _removed_projects, 'tasks', _removed_tasks,
                             'staffing', _cancelled_staffing));

  INSERT INTO notifications (user_id, type, title, content, entity_type, entity_id, priority)
  VALUES (_user_id, 'mission_member_removed', 'Retrait d''une mission',
          'Vous avez été retiré de la mission « ' || _mission.name || ' ». Motif : ' || btrim(_reason),
          'mission', _mission_id, 'high');

  RETURN jsonb_build_object('projects', _removed_projects, 'tasks', _removed_tasks, 'staffing', _cancelled_staffing);
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_removal_impact(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public.remove_mission_member(uuid, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_member_removal_impact(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_mission_member(uuid, uuid, text) TO authenticated;