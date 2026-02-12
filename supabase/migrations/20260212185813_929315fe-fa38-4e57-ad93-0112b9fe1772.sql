
-- Drop the recursive policies on conversation_members
DROP POLICY IF EXISTS "conv_members_select" ON conversation_members;
DROP POLICY IF EXISTS "conv_members_insert" ON conversation_members;

-- Create a security definer function to check conversation membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members
    WHERE user_id = _user_id
      AND conversation_id = _conversation_id
  )
$$;

-- Create a security definer function to get user's conversation IDs
CREATE OR REPLACE FUNCTION public.get_user_conversation_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id
  FROM public.conversation_members
  WHERE user_id = _user_id
$$;

-- Recreate SELECT policy using the function
CREATE POLICY "conv_members_select" ON conversation_members
FOR SELECT USING (
  conversation_id IN (SELECT public.get_user_conversation_ids(auth.uid()))
);

-- Recreate INSERT policy without self-reference
CREATE POLICY "conv_members_insert" ON conversation_members
FOR INSERT WITH CHECK (
  public.is_conversation_member(auth.uid(), conversation_id) OR user_id = auth.uid()
);

-- Also fix the messages SELECT policy which references conversation_members
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
FOR SELECT USING (
  conversation_id IN (SELECT public.get_user_conversation_ids(auth.uid()))
);

-- Fix conversations SELECT policy which also references conversation_members
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations
FOR SELECT USING (
  id IN (SELECT public.get_user_conversation_ids(auth.uid()))
);
