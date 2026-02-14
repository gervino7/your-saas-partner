
-- Enable realtime for conversation_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;

-- Create attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for attachments
CREATE POLICY "auth_users_upload_attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "auth_users_read_attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND auth.uid() IS NOT NULL
);

-- Allow message deletion by sender
CREATE POLICY "messages_delete_own"
ON public.messages
FOR DELETE
USING (sender_id = auth.uid());

-- Allow updating last_read_at
CREATE POLICY "conv_members_update_read"
ON public.conversation_members
FOR UPDATE
USING (user_id = auth.uid());

-- Allow deleting conversation members (for leaving)
CREATE POLICY "conv_members_delete_own"
ON public.conversation_members
FOR DELETE
USING (user_id = auth.uid());
