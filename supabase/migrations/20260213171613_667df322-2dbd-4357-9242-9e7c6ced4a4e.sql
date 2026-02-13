
-- Allow UPDATE on committees for mission org members with grade <= 3
CREATE POLICY "committees_update" ON committees
FOR UPDATE USING (
  mission_id IN (
    SELECT id FROM missions WHERE organization_id = get_user_organization_id(auth.uid())
  )
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 3
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow DELETE on committees
CREATE POLICY "committees_delete" ON committees
FOR DELETE USING (
  mission_id IN (
    SELECT id FROM missions WHERE organization_id = get_user_organization_id(auth.uid())
  )
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow UPDATE on committee_members
CREATE POLICY "committee_members_update" ON committee_members
FOR UPDATE USING (
  committee_id IN (
    SELECT c.id FROM committees c
    JOIN missions m ON c.mission_id = m.id
    WHERE m.organization_id = get_user_organization_id(auth.uid())
    AND (
      (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 3
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Allow DELETE on committee_members
CREATE POLICY "committee_members_delete" ON committee_members
FOR DELETE USING (
  committee_id IN (
    SELECT c.id FROM committees c
    JOIN missions m ON c.mission_id = m.id
    WHERE m.organization_id = get_user_organization_id(auth.uid())
    AND (
      (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 3
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Allow UPDATE on committee_meetings
CREATE POLICY "committee_meetings_update" ON committee_meetings
FOR UPDATE USING (
  committee_id IN (
    SELECT c.id FROM committees c
    JOIN missions m ON c.mission_id = m.id
    WHERE m.organization_id = get_user_organization_id(auth.uid())
    AND (
      (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 3
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Allow DELETE on committee_meetings  
CREATE POLICY "committee_meetings_delete" ON committee_meetings
FOR DELETE USING (
  committee_id IN (
    SELECT c.id FROM committees c
    JOIN missions m ON c.mission_id = m.id
    WHERE m.organization_id = get_user_organization_id(auth.uid())
    AND (
      (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Allow UPDATE on group_emails (for status updates)
CREATE POLICY "group_emails_update" ON group_emails
FOR UPDATE USING (
  group_id IN (
    SELECT id FROM mailing_groups
    WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

-- Allow UPDATE on mailing_groups
CREATE POLICY "mailing_groups_update" ON mailing_groups
FOR UPDATE USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Allow DELETE on mailing_group_recipients
CREATE POLICY "mailing_recipients_delete" ON mailing_group_recipients
FOR DELETE USING (
  group_id IN (
    SELECT id FROM mailing_groups
    WHERE organization_id = get_user_organization_id(auth.uid())
    AND (
      created_by = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);
