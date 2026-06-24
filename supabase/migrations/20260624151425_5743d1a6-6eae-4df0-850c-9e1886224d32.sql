GRANT EXECUTE ON FUNCTION public.get_user_organization_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_grade_level(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_mission(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.add_project_members_after_insert() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_mission_members_after_insert() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_project_members_after_insert() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_mission_members_after_insert() TO authenticated, service_role;