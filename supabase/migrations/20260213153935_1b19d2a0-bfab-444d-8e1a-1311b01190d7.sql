
-- Create the documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for document storage
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can view documents in their org"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Add UPDATE policy for document_folders
CREATE POLICY "doc_folders_org_update"
ON public.document_folders FOR UPDATE
USING (organization_id = get_user_organization_id(auth.uid()));

-- Add DELETE policy for document_folders
CREATE POLICY "doc_folders_org_delete"
ON public.document_folders FOR DELETE
USING (organization_id = get_user_organization_id(auth.uid()));

-- Add DELETE policy for documents
CREATE POLICY "documents_org_delete"
ON public.documents FOR DELETE
USING (organization_id = get_user_organization_id(auth.uid()));
