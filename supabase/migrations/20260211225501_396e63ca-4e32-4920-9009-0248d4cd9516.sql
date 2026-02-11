
-- Fix overly permissive RLS policies
DROP POLICY "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (user_id IN (
    SELECT p2.id FROM public.profiles p2 
    WHERE p2.organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  ));

DROP POLICY "conv_members_insert" ON public.conversation_members;
CREATE POLICY "conv_members_insert" ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (conversation_id IN (
    SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
  ) OR user_id = auth.uid());

DROP POLICY "surveys_insert" ON public.client_surveys;
CREATE POLICY "surveys_insert" ON public.client_surveys FOR INSERT TO authenticated
  WITH CHECK (mission_id IN (
    SELECT id FROM public.missions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  ));
