
-- ============================================================
-- MISSIONS
-- ============================================================
DROP POLICY IF EXISTS "missions_select" ON public.missions;
DROP POLICY IF EXISTS "org_isolation" ON public.missions;
DROP POLICY IF EXISTS "missions_org_isolation" ON public.missions;
DROP POLICY IF EXISTS "missions_select_strict" ON public.missions;

CREATE POLICY "missions_select_strict" ON public.missions
FOR SELECT USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
    OR id IN (SELECT mission_id FROM public.mission_members WHERE user_id = auth.uid())
    OR director_id = auth.uid()
    OR chief_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "missions_insert" ON public.missions;
CREATE POLICY "missions_insert" ON public.missions
FOR INSERT WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 3
);

DROP POLICY IF EXISTS "missions_update" ON public.missions;
CREATE POLICY "missions_update" ON public.missions
FOR UPDATE USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
    OR director_id = auth.uid()
    OR chief_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "missions_delete" ON public.missions;
CREATE POLICY "missions_delete" ON public.missions
FOR DELETE USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
);

-- ============================================================
-- PROJECTS
-- ============================================================
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_org_isolation" ON public.projects;
DROP POLICY IF EXISTS "projects_select_strict" ON public.projects;

CREATE POLICY "projects_select_strict" ON public.projects
FOR SELECT USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
    OR mission_id IN (SELECT id FROM public.missions WHERE director_id = auth.uid() OR chief_id = auth.uid())
    OR lead_id = auth.uid()
    OR mission_id IN (SELECT mission_id FROM public.mission_members WHERE user_id = auth.uid())
    OR id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects
FOR INSERT WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 3
    OR mission_id IN (SELECT mission_id FROM public.mission_members WHERE user_id = auth.uid())
  )
);

-- ============================================================
-- TASKS
-- ============================================================
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_project_member" ON public.tasks;
DROP POLICY IF EXISTS "tasks_org_isolation" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_strict" ON public.tasks;

CREATE POLICY "tasks_select_strict" ON public.tasks
FOR SELECT USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
    OR project_id IN (SELECT id FROM public.projects WHERE lead_id = auth.uid())
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR id IN (SELECT task_id FROM public.task_assignments WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  )
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_grade_access" ON public.documents;
DROP POLICY IF EXISTS "documents_org_isolation" ON public.documents;
DROP POLICY IF EXISTS "documents_select_strict" ON public.documents;

CREATE POLICY "documents_select_strict" ON public.documents
FOR SELECT USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= COALESCE(visibility_grade, 8)
  )
  AND (
    (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
    OR uploaded_by = auth.uid()
    OR id IN (SELECT document_id FROM public.document_shares WHERE shared_with = auth.uid())
    OR (mission_id IS NOT NULL AND mission_id IN (
      SELECT mission_id FROM public.mission_members WHERE user_id = auth.uid()
    ))
    OR (project_id IS NOT NULL AND project_id IN (
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    ))
    OR (mission_id IS NULL AND project_id IS NULL AND (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 3)
  )
);

-- ============================================================
-- ACTIVITIES
-- ============================================================
DROP POLICY IF EXISTS "activities_select" ON public.activities;
DROP POLICY IF EXISTS "activities_select_strict" ON public.activities;
CREATE POLICY "activities_select_strict" ON public.activities
FOR SELECT USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR project_id IN (SELECT id FROM public.projects WHERE lead_id = auth.uid())
  )
);

-- ============================================================
-- COMMITTEES
-- ============================================================
DROP POLICY IF EXISTS "committees_select" ON public.committees;
DROP POLICY IF EXISTS "committees_select_strict" ON public.committees;
CREATE POLICY "committees_select_strict" ON public.committees
FOR SELECT USING (
  organization_id = public.get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
    OR mission_id IN (SELECT mission_id FROM public.mission_members WHERE user_id = auth.uid())
    OR id IN (SELECT committee_id FROM public.committee_members WHERE user_id = auth.uid())
  )
);

-- ============================================================
-- MISSION MEMBERS
-- ============================================================
DROP POLICY IF EXISTS "mission_members_select" ON public.mission_members;
DROP POLICY IF EXISTS "mission_members_select_strict" ON public.mission_members;
CREATE POLICY "mission_members_select_strict" ON public.mission_members
FOR SELECT USING (
  (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
  OR mission_id IN (SELECT mm.mission_id FROM public.mission_members mm WHERE mm.user_id = auth.uid())
);

-- ============================================================
-- PROJECT MEMBERS
-- ============================================================
DROP POLICY IF EXISTS "project_members_select" ON public.project_members;
DROP POLICY IF EXISTS "project_members_select_strict" ON public.project_members;
CREATE POLICY "project_members_select_strict" ON public.project_members
FOR SELECT USING (
  (SELECT grade_level FROM public.profiles WHERE id = auth.uid()) <= 2
  OR project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid())
  OR project_id IN (SELECT id FROM public.projects WHERE lead_id = auth.uid())
);

-- ============================================================
-- HELPER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_see_user_info(viewer_id uuid, target_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    SELECT grade_level FROM public.profiles WHERE id = viewer_id
  ) <= (
    SELECT grade_level FROM public.profiles WHERE id = target_id
  );
$$;
