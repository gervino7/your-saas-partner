
-- ============================================================
-- 1. FIX: Invitations - restrict visibility to inviter + admins
-- ============================================================
DROP POLICY IF EXISTS "invitations_org_select" ON public.invitations;
CREATE POLICY "invitations_restricted_select" ON public.invitations
FOR SELECT USING (
  invited_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
);

-- ============================================================
-- 2. FIX: Invoices - restrict to grade <= 3 or admin/owner
-- ============================================================
DROP POLICY IF EXISTS "invoices_org_select" ON public.invoices;
CREATE POLICY "invoices_grade_select" ON public.invoices
FOR SELECT USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 3
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  )
);

-- ============================================================
-- 3. FIX: Committee members - add INSERT/UPDATE/DELETE for admins
-- and restrict SELECT to mission members
-- ============================================================
DROP POLICY IF EXISTS "committee_members_select" ON public.committee_members;
CREATE POLICY "committee_members_select" ON public.committee_members
FOR SELECT USING (
  committee_id IN (
    SELECT c.id FROM committees c
    JOIN mission_members mm ON c.mission_id = mm.mission_id
    WHERE mm.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "committee_members_insert" ON public.committee_members
FOR INSERT WITH CHECK (
  committee_id IN (
    SELECT c.id FROM committees c
    JOIN missions m ON c.mission_id = m.id
    WHERE m.organization_id = get_user_organization_id(auth.uid())
    AND (
      (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 3
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- ============================================================
-- 4. FIX: Mailing group recipients - add INSERT for org members
-- ============================================================
CREATE POLICY "mailing_recipients_insert" ON public.mailing_group_recipients
FOR INSERT WITH CHECK (
  group_id IN (
    SELECT id FROM mailing_groups
    WHERE organization_id = get_user_organization_id(auth.uid())
    AND (
      created_by = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- ============================================================
-- 5. FIX: Activity logs - allow admin/DA/DM to view for auditing
-- ============================================================
DROP POLICY IF EXISTS "activity_logs_own_select" ON public.activity_logs;
CREATE POLICY "activity_logs_select" ON public.activity_logs
FOR SELECT USING (
  user_id = auth.uid()
  OR (
    organization_id = get_user_organization_id(auth.uid())
    AND (
      (SELECT grade_level FROM profiles WHERE id = auth.uid()) <= 2
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'owner'::app_role)
    )
  )
);

-- ============================================================
-- 6. FIX: handle_new_user - sanitize full_name input
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    substring(
      regexp_replace(
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        '[^\w\sÀ-ÿ\-'']',
        '',
        'g'
      ),
      1, 255
    )
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$function$;
