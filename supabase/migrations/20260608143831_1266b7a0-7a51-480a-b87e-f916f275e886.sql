REVOKE EXECUTE ON FUNCTION public.get_user_grade_level(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_grade_level(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_grade_level(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_grade_level(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_mission_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_mission_member(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_mission_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_mission_member(uuid, uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.can_access_mission(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_mission(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_mission(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_mission(uuid, uuid) TO service_role;