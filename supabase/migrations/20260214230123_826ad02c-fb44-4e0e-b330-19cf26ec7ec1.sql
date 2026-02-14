
-- Create a public bucket for organization assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('org-assets', 'org-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their org folder
CREATE POLICY "org_assets_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'org-assets');

-- Allow public read
CREATE POLICY "org_assets_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'org-assets');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "org_assets_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'org-assets');

CREATE POLICY "org_assets_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'org-assets');
