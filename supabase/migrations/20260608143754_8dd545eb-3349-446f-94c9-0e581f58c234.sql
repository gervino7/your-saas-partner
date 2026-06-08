CREATE OR REPLACE FUNCTION public.get_user_grade_level(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT grade_level FROM public.profiles WHERE id = _user_id), 8)
$$;

CREATE OR REPLACE FUNCTION public.is_mission_member(_user_id uuid, _mission_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mission_members mm
    WHERE mm.user_id = _user_id
      AND mm.mission_id = _mission_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_mission(_user_id uuid, _mission_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.missions m
    JOIN public.profiles p ON p.id = _user_id
    WHERE m.id = _mission_id
      AND m.organization_id = p.organization_id
      AND (
        COALESCE(p.grade_level, 8) <= 2
        OR m.director_id = _user_id
        OR m.chief_id = _user_id
        OR EXISTS (
          SELECT 1
          FROM public.mission_members mm
          WHERE mm.mission_id = m.id
            AND mm.user_id = _user_id
        )
      )
  )
$$;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'missions'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.missions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "missions_select_v3_secure"
ON public.missions
FOR SELECT
TO authenticated
USING (public.can_access_mission(auth.uid(), id));

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'mission_members'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.mission_members', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "mission_members_select_v2_secure"
ON public.mission_members
FOR SELECT
TO authenticated
USING (public.can_access_mission(auth.uid(), mission_id));