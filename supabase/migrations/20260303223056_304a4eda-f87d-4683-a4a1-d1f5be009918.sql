
-- Fix: allow conversation creator to add members
DROP POLICY IF EXISTS "conv_members_insert" ON public.conversation_members;

CREATE POLICY "conv_members_insert" ON public.conversation_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR is_conversation_member(auth.uid(), conversation_id)
  OR conversation_id IN (
    SELECT id FROM public.conversations WHERE created_by = auth.uid()
  )
);
