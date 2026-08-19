CREATE OR REPLACE FUNCTION public.get_workload(_week_start date DEFAULT (date_trunc('week'::text, (CURRENT_DATE)::timestamp with time zone))::date)
 RETURNS TABLE(user_id uuid, full_name text, grade text, allocated_hours numeric, planned_hours numeric, capacity_hours numeric, load_rate numeric, is_overloaded boolean, has_leave boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  _viewer_org uuid;
  _viewer_grade integer;
  _week_end date := (_week_start + INTERVAL '6 days')::date;
BEGIN
  SELECT vp.organization_id, vp.grade_level INTO _viewer_org, _viewer_grade
  FROM public.profiles vp WHERE vp.id = auth.uid();

  IF _viewer_grade IS NULL OR _viewer_grade > 3 THEN
    RAISE EXCEPTION 'Accès refusé : vue réservée aux responsables';
  END IF;

  RETURN QUERY
  WITH capacite AS (
    SELECT p.id AS uid,
           COALESCE(
             (SELECT SUM(ua.available_hours)
                FROM user_availability ua
               WHERE ua.user_id = p.id
                 AND ua.date BETWEEN _week_start AND _week_end
                 AND ua.status <> 'leave'),
             p.weekly_capacity_hours,
             35
           ) AS cap,
           EXISTS (
             SELECT 1 FROM user_availability ua2
              WHERE ua2.user_id = p.id
                AND ua2.date BETWEEN _week_start AND _week_end
                AND ua2.status = 'leave'
           ) AS conge
    FROM profiles p
    WHERE p.organization_id = _viewer_org
  ),
  alloue AS (
    SELECT sa.user_id AS uid, SUM(sa.weekly_hours) AS ah
    FROM staffing_assignments sa
    WHERE sa.organization_id = _viewer_org
      AND sa.status IN ('proposed', 'accepted')
      AND sa.start_date <= _week_end
      AND (sa.end_date IS NULL OR sa.end_date >= _week_start)
    GROUP BY sa.user_id
  ),
  planifie AS (
    SELECT pe.user_id AS uid, SUM(pe.planned_hours) AS ph
    FROM plan_entries pe
    WHERE pe.organization_id = _viewer_org
      AND pe.week_start = _week_start
      AND pe.status IN ('submitted', 'approved')
      AND pe.entry_type <> 'conge'
    GROUP BY pe.user_id
  ),
  conge_plan AS (
    SELECT DISTINCT pe.user_id AS uid
    FROM plan_entries pe
    WHERE pe.organization_id = _viewer_org
      AND pe.week_start = _week_start
      AND pe.status IN ('submitted', 'approved')
      AND pe.entry_type = 'conge'
  )
  SELECT
    p.id,
    p.full_name,
    p.grade,
    COALESCE(a.ah, 0),
    COALESCE(pl.ph, 0),
    c.cap,
    CASE WHEN c.cap > 0
      THEN ROUND(GREATEST(COALESCE(a.ah, 0), COALESCE(pl.ph, 0)) / c.cap * 100)
      ELSE 0 END,
    GREATEST(COALESCE(a.ah, 0), COALESCE(pl.ph, 0)) > c.cap,
    (c.conge OR cp.uid IS NOT NULL)
  FROM profiles p
  JOIN capacite c ON c.uid = p.id
  LEFT JOIN alloue a ON a.uid = p.id
  LEFT JOIN planifie pl ON pl.uid = p.id
  LEFT JOIN conge_plan cp ON cp.uid = p.id
  WHERE p.organization_id = _viewer_org
  ORDER BY 7 DESC;
END;
$function$;