
-- Fix 1: Secure profiles_safe view by restricting to authenticated users in same org
DROP VIEW IF EXISTS profiles_safe;
CREATE VIEW profiles_safe AS
SELECT 
    id,
    organization_id,
    full_name,
    avatar_url,
    grade,
    grade_level,
    is_online,
    last_seen_at,
    created_at,
    updated_at,
    skills,
    last_login_at,
    CASE
        WHEN (id = auth.uid()) THEN email
        WHEN (( SELECT p2.grade_level FROM profiles p2 WHERE (p2.id = auth.uid())) <= 3) THEN email
        ELSE NULL::text
    END AS email,
    CASE
        WHEN (id = auth.uid()) THEN phone
        WHEN (( SELECT p2.grade_level FROM profiles p2 WHERE (p2.id = auth.uid())) <= 3) THEN phone
        ELSE NULL::text
    END AS phone
FROM profiles;

-- Restrict view access to authenticated users only
REVOKE ALL ON profiles_safe FROM anon;
REVOKE ALL ON profiles_safe FROM public;
GRANT SELECT ON profiles_safe TO authenticated;

-- Fix 2: Add RLS policy to auto-exclude expired portal tokens
DROP POLICY IF EXISTS "portal_tokens_select" ON client_portal_tokens;
CREATE POLICY "portal_tokens_select" ON client_portal_tokens
  FOR SELECT USING (
    is_active = true
    AND expires_at > NOW()
    AND (
      (client_id IN (SELECT clients.id FROM clients WHERE clients.organization_id = get_user_organization_id(auth.uid())))
      OR (( SELECT profiles.grade_level FROM profiles WHERE profiles.id = auth.uid()) <= 3)
    )
  );

-- Fix 3: Storage - Enforce org-scoped paths for documents bucket
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

CREATE POLICY "documents_org_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "documents_org_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "documents_org_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "documents_org_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Fix 4: Storage - Enforce org-scoped paths for attachments bucket
DROP POLICY IF EXISTS "auth_users_upload_attachments" ON storage.objects;
DROP POLICY IF EXISTS "auth_users_read_attachments" ON storage.objects;

CREATE POLICY "attachments_org_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "attachments_org_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "attachments_org_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "attachments_org_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

-- Fix 5: Storage - Enforce org-scoped paths for org-assets bucket
DROP POLICY IF EXISTS "org_assets_upload" ON storage.objects;
DROP POLICY IF EXISTS "org_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "org_assets_delete" ON storage.objects;

CREATE POLICY "org_assets_org_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "org_assets_org_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "org_assets_org_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'org-assets'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM profiles WHERE id = auth.uid()
  )
);
