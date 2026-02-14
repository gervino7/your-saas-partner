
-- ============================================================
-- CRM: Client Contacts table
-- ============================================================
CREATE TABLE public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_contacts_select" ON public.client_contacts FOR SELECT
USING (client_id IN (
  SELECT id FROM public.clients WHERE organization_id = get_user_organization_id(auth.uid())
));

CREATE POLICY "client_contacts_insert" ON public.client_contacts FOR INSERT
WITH CHECK (client_id IN (
  SELECT id FROM public.clients WHERE organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
));

CREATE POLICY "client_contacts_update" ON public.client_contacts FOR UPDATE
USING (client_id IN (
  SELECT id FROM public.clients WHERE organization_id = get_user_organization_id(auth.uid())
));

CREATE POLICY "client_contacts_delete" ON public.client_contacts FOR DELETE
USING (client_id IN (
  SELECT id FROM public.clients WHERE organization_id = get_user_organization_id(auth.uid())
));

-- ============================================================
-- CRM: Client Portal Tokens
-- ============================================================
CREATE TABLE public.client_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_tokens_select" ON public.client_portal_tokens FOR SELECT
USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id = get_user_organization_id(auth.uid()))
  OR (( SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 3)
);

CREATE POLICY "portal_tokens_insert" ON public.client_portal_tokens FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "portal_tokens_update" ON public.client_portal_tokens FOR UPDATE
USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id = get_user_organization_id(auth.uid()))
);

CREATE POLICY "portal_tokens_delete" ON public.client_portal_tokens FOR DELETE
USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id = get_user_organization_id(auth.uid()))
  AND (( SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2)
);

-- ============================================================
-- CRM: Client Interactions (timeline)
-- ============================================================
CREATE TABLE public.client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'note', -- meeting, email, call, note
  title TEXT NOT NULL,
  description TEXT,
  interaction_date TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_interactions_select" ON public.client_interactions FOR SELECT
USING (client_id IN (
  SELECT id FROM public.clients WHERE organization_id = get_user_organization_id(auth.uid())
));

CREATE POLICY "client_interactions_insert" ON public.client_interactions FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "client_interactions_update" ON public.client_interactions FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "client_interactions_delete" ON public.client_interactions FOR DELETE
USING (created_by = auth.uid());

-- ============================================================
-- Update client_surveys: add NPS and detailed ratings
-- ============================================================
ALTER TABLE public.client_surveys
  ADD COLUMN IF NOT EXISTS nps_score INTEGER,
  ADD COLUMN IF NOT EXISTS quality_rating INTEGER,
  ADD COLUMN IF NOT EXISTS timeliness_rating INTEGER,
  ADD COLUMN IF NOT EXISTS communication_rating INTEGER,
  ADD COLUMN IF NOT EXISTS competence_rating INTEGER,
  ADD COLUMN IF NOT EXISTS value_rating INTEGER,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS token TEXT;

-- Add website field to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS website TEXT;

-- Indexes
CREATE INDEX idx_client_contacts_client ON public.client_contacts(client_id);
CREATE INDEX idx_client_portal_tokens_token ON public.client_portal_tokens(token);
CREATE INDEX idx_client_portal_tokens_mission ON public.client_portal_tokens(mission_id);
CREATE INDEX idx_client_interactions_client ON public.client_interactions(client_id);
CREATE INDEX idx_client_interactions_date ON public.client_interactions(interaction_date);
