
-- Table for COPIL portal OTP authentication
CREATE TABLE public.copil_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  email text NOT NULL,
  otp_code text NOT NULL,
  session_token text,
  otp_expires_at timestamptz NOT NULL,
  session_expires_at timestamptz,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for lookups
CREATE INDEX idx_copil_access_email ON copil_access_tokens(email, committee_id);
CREATE INDEX idx_copil_access_session ON copil_access_tokens(session_token) WHERE session_token IS NOT NULL;

-- No RLS needed - accessed via edge functions with service role

-- Add committee_id to documents for COPIL-tagged documents
ALTER TABLE public.documents ADD COLUMN committee_id uuid REFERENCES public.committees(id) ON DELETE SET NULL;
CREATE INDEX idx_documents_committee ON documents(committee_id) WHERE committee_id IS NOT NULL;
