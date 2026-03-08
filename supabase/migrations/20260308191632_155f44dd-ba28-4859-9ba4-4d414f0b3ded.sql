
-- Enable RLS on copil_access_tokens (no public policies - only service role access)
ALTER TABLE public.copil_access_tokens ENABLE ROW LEVEL SECURITY;
