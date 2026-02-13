
-- Allow org-level committees (CODIR) where mission_id IS NULL
-- The existing committees_insert policy requires mission_id to match a mission in the org
-- Add a new policy for org-level committees
CREATE POLICY "committees_insert_org_level" ON committees
FOR INSERT WITH CHECK (
  mission_id IS NULL
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow SELECT on org-level committees
CREATE POLICY "committees_select_org_level" ON committees
FOR SELECT USING (
  mission_id IS NULL
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id IS NOT NULL
    AND grade_level <= 2
  )
);

-- Allow UPDATE on org-level committees
CREATE POLICY "committees_update_org_level" ON committees
FOR UPDATE USING (
  mission_id IS NULL
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow committee_members insert for org-level committees
CREATE POLICY "committee_members_insert_org" ON committee_members
FOR INSERT WITH CHECK (
  committee_id IN (
    SELECT id FROM committees WHERE mission_id IS NULL
  )
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow committee_members select for org-level committees
CREATE POLICY "committee_members_select_org" ON committee_members
FOR SELECT USING (
  committee_id IN (
    SELECT id FROM committees WHERE mission_id IS NULL
  )
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow committee_meetings insert for org-level committees
CREATE POLICY "committee_meetings_insert_org" ON committee_meetings
FOR INSERT WITH CHECK (
  committee_id IN (
    SELECT id FROM committees WHERE mission_id IS NULL
  )
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow committee_meetings select for org-level committees
CREATE POLICY "committee_meetings_select_org" ON committee_meetings
FOR SELECT USING (
  committee_id IN (
    SELECT id FROM committees WHERE mission_id IS NULL
  )
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
