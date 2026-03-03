-- Fix conversation member insertion for newly created conversations
-- by avoiding RLS-dependent subquery on conversations.

CREATE OR REPLACE FUNCTION public.is_conversation_creator(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE id = _conversation_id
      AND created_by = _user_id
  )
$$;

ALTER POLICY "conv_members_insert"
ON public.conversation_members
WITH CHECK (
  (user_id = auth.uid())
  OR public.is_conversation_member(auth.uid(), conversation_id)
  OR public.is_conversation_creator(auth.uid(), conversation_id)
);