
-- Add recurrence and reminder columns to meetings
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS recurrence text DEFAULT 'none';
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS reminders jsonb DEFAULT '["15min","1h","1d"]'::jsonb;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS agenda text;

-- Fix meeting_participants RLS: allow insert, update, delete
CREATE POLICY "meeting_parts_insert" ON public.meeting_participants
FOR INSERT WITH CHECK (
  meeting_id IN (
    SELECT id FROM meetings WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "meeting_parts_update" ON public.meeting_participants
FOR UPDATE USING (
  user_id = auth.uid()
  OR meeting_id IN (
    SELECT id FROM meetings WHERE organizer_id = auth.uid()
  )
);

CREATE POLICY "meeting_parts_delete" ON public.meeting_participants
FOR DELETE USING (
  meeting_id IN (
    SELECT id FROM meetings WHERE organizer_id = auth.uid()
  )
);

-- Fix meetings RLS: allow update and delete by organizer or admins
CREATE POLICY "meetings_update" ON public.meetings
FOR UPDATE USING (
  organizer_id = auth.uid()
  OR (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "meetings_delete" ON public.meetings
FOR DELETE USING (
  organizer_id = auth.uid()
  OR (
    organization_id = get_user_organization_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);
