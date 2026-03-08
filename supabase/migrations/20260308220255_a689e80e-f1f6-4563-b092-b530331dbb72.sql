
-- Allow anon users to read their specific survey by token
CREATE POLICY "surveys_select_by_token" ON public.client_surveys
FOR SELECT
TO anon, authenticated
USING (token IS NOT NULL);
