
CREATE TABLE public.organization_grades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    level integer NOT NULL,
    daily_rate numeric DEFAULT 0,
    currency text DEFAULT 'XOF',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, code),
    UNIQUE(organization_id, level)
);

ALTER TABLE public.organization_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_grades_select" ON public.organization_grades
FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "org_grades_insert" ON public.organization_grades
FOR INSERT TO authenticated
WITH CHECK (
    organization_id = get_user_organization_id(auth.uid())
    AND (
        (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'owner'::app_role)
    )
);

CREATE POLICY "org_grades_update" ON public.organization_grades
FOR UPDATE TO authenticated
USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
        (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'owner'::app_role)
    )
);

CREATE POLICY "org_grades_delete" ON public.organization_grades
FOR DELETE TO authenticated
USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (
        (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'owner'::app_role)
    )
);
