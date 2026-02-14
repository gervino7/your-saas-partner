
CREATE POLICY "group_emails_delete"
ON public.group_emails
FOR DELETE
USING (
  sent_by = auth.uid()
  OR group_id IN (
    SELECT id FROM mailing_groups
    WHERE organization_id = get_user_organization_id(auth.uid())
      AND (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND grade_level <= 2
      ))
  )
);
