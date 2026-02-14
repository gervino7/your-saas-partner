
-- ============================================================
-- TIME ENTRIES (Feuilles de temps)
-- ============================================================
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  hours NUMERIC(4,2) NOT NULL DEFAULT 0 CHECK (hours >= 0 AND hours <= 24),
  is_billable BOOLEAN DEFAULT true,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  week_start DATE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- User can CRUD own entries
CREATE POLICY "te_own_select" ON public.time_entries FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "te_own_insert" ON public.time_entries FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "te_own_update" ON public.time_entries FOR UPDATE USING (user_id = auth.uid() AND status IN ('draft','rejected'));
CREATE POLICY "te_own_delete" ON public.time_entries FOR DELETE USING (user_id = auth.uid() AND status = 'draft');

-- Superiors can view team entries (grade <= 3 sees org entries)
CREATE POLICY "te_superior_select" ON public.time_entries FOR SELECT USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 3
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Superiors can approve/reject
CREATE POLICY "te_superior_update" ON public.time_entries FOR UPDATE USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 4
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE INDEX idx_te_user_week ON public.time_entries(user_id, week_start);
CREATE INDEX idx_te_org_date ON public.time_entries(organization_id, date);
CREATE INDEX idx_te_status ON public.time_entries(status);

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- DAILY RATES (Taux journaliers)
-- ============================================================
CREATE TABLE public.daily_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  grade TEXT NOT NULL,
  daily_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'XOF',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, grade, currency)
);

ALTER TABLE public.daily_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dr_org_select" ON public.daily_rates FOR SELECT USING (
  organization_id = get_user_organization_id(auth.uid())
);
CREATE POLICY "dr_org_insert" ON public.daily_rates FOR INSERT WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  AND ((SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2 OR has_role(auth.uid(), 'admin'::app_role))
);
CREATE POLICY "dr_org_update" ON public.daily_rates FOR UPDATE USING (
  organization_id = get_user_organization_id(auth.uid())
  AND ((SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2 OR has_role(auth.uid(), 'admin'::app_role))
);
CREATE POLICY "dr_org_delete" ON public.daily_rates FOR DELETE USING (
  organization_id = get_user_organization_id(auth.uid())
  AND ((SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2 OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE TRIGGER update_daily_rates_updated_at
  BEFORE UPDATE ON public.daily_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add update/delete policies for expenses that were missing
CREATE POLICY "expenses_own_update" ON public.expenses FOR UPDATE USING (
  user_id = auth.uid() AND status = 'draft'
);
CREATE POLICY "expenses_own_delete" ON public.expenses FOR DELETE USING (
  user_id = auth.uid() AND status = 'draft'
);
-- Superiors can view/approve expenses
CREATE POLICY "expenses_superior_select" ON public.expenses FOR SELECT USING (
  mission_id IN (SELECT id FROM missions WHERE organization_id = get_user_organization_id(auth.uid()))
  AND ((SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 4 OR has_role(auth.uid(), 'admin'::app_role))
);
CREATE POLICY "expenses_superior_update" ON public.expenses FOR UPDATE USING (
  mission_id IN (SELECT id FROM missions WHERE organization_id = get_user_organization_id(auth.uid()))
  AND ((SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 4 OR has_role(auth.uid(), 'admin'::app_role))
);

-- Add update policy for invoices
CREATE POLICY "invoices_org_update" ON public.invoices FOR UPDATE USING (
  organization_id = get_user_organization_id(auth.uid())
  AND ((SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 3 OR has_role(auth.uid(), 'admin'::app_role))
);
CREATE POLICY "invoices_org_delete" ON public.invoices FOR DELETE USING (
  organization_id = get_user_organization_id(auth.uid())
  AND ((SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2 OR has_role(auth.uid(), 'admin'::app_role))
);
