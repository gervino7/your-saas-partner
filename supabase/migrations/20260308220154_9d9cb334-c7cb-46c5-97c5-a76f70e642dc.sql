
-- Allow unauthenticated survey respondents to update their survey via token match
-- This uses anon role since survey respondents don't have accounts
CREATE POLICY "surveys_update_by_token" ON public.client_surveys
FOR UPDATE
TO anon, authenticated
USING (token IS NOT NULL AND overall_rating IS NULL)
WITH CHECK (token IS NOT NULL);
