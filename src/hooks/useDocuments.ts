import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/hooks/use-toast';

export interface DocumentRow {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  status: string | null;
  version: number | null;
  visibility_grade: number | null;
  tags: any;
  folder_id: string | null;
  mission_id: string | null;
  project_id: string | null;
  activity_id: string | null;
  organization_id: string | null;
  uploaded_by: string | null;
  parent_version_id: string | null;
  checksum: string | null;
  created_at: string | null;
  updated_at: string | null;
  uploader?: { full_name: string; avatar_url?: string | null } | null;
}

export interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  project_id: string | null;
  organization_id: string | null;
  created_by: string | null;
  created_at: string | null;
}

interface UseDocumentsOptions {
  missionId?: string;
  projectId?: string;
  activityId?: string;
  folderId?: string | null;
  search?: string;
  statusFilter?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export function useDocuments(opts: UseDocumentsOptions) {
  const profile = useAuthStore((s) => s.profile);
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ['documents', opts, orgId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from('documents')
        .select('*, uploader:profiles!documents_uploaded_by_fkey(full_name, avatar_url)')
        .eq('organization_id', orgId!);

      if (opts.missionId) q = q.eq('mission_id', opts.missionId);
      if (opts.projectId) q = q.eq('project_id', opts.projectId);
      if (opts.activityId) q = q.eq('activity_id', opts.activityId);

      if (opts.folderId === null) {
        q = q.is('folder_id', null);
      } else if (opts.folderId) {
        q = q.eq('folder_id', opts.folderId);
      }

      if (opts.statusFilter && opts.statusFilter !== 'all') {
        q = q.eq('status', opts.statusFilter);
      }

      if (opts.search) {
        q = q.ilike('name', `%${opts.search}%`);
      }

      const col = opts.sortBy || 'created_at';
      q = q.order(col as any, { ascending: opts.sortDir === 'asc' });

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as DocumentRow[];
    },
  });
}

export function useDocumentFolders(opts: { projectId?: string; organizationId?: string }) {
  const profile = useAuthStore((s) => s.profile);
  const orgId = opts.organizationId || profile?.organization_id;

  return useQuery({
    queryKey: ['document_folders', orgId, opts.projectId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase.from('document_folders').select('*').eq('organization_id', orgId!);
      if (opts.projectId) q = q.eq('project_id', opts.projectId);
      q = q.order('name');
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as FolderRow[];
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (input: { name: string; parentId?: string | null; projectId?: string }) => {
      const { data, error } = await supabase
        .from('document_folders')
        .insert({
          name: input.name,
          parent_id: input.parentId || null,
          project_id: input.projectId || null,
          organization_id: profile!.organization_id,
          created_by: profile!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document_folders'] });
      toast({ title: 'Dossier créé' });
    },
    onError: () => toast({ title: 'Erreur', description: 'Impossible de créer le dossier', variant: 'destructive' }),
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('document_folders').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document_folders'] });
      toast({ title: 'Dossier renommé' });
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_folders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document_folders'] });
      toast({ title: 'Dossier supprimé' });
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (input: {
      file: File;
      folderId?: string | null;
      missionId?: string;
      projectId?: string;
      activityId?: string;
      visibilityGrade?: number;
      checksum?: string;
    }) => {
      const orgId = profile!.organization_id!;
      const filePath = `${orgId}/${input.missionId || '_'}/${input.projectId || '_'}/${Date.now()}_${input.file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(filePath, input.file, { upsert: false });
      if (uploadErr) throw uploadErr;

      // Check for existing file with same name in same folder for versioning
      const { data: existing } = await supabase
        .from('documents')
        .select('id, version')
        .eq('organization_id', orgId)
        .eq('name', input.file.name)
        .eq('folder_id', input.folderId || '')
        .order('version', { ascending: false })
        .limit(1);

      const parentVersionId = existing?.[0]?.id || null;
      const version = existing?.[0]?.version ? (existing[0].version as number) + 1 : 1;

      const { data, error } = await supabase
        .from('documents')
        .insert({
          name: input.file.name,
          file_path: filePath,
          file_size: input.file.size,
          mime_type: input.file.type,
          folder_id: input.folderId || null,
          mission_id: input.missionId || null,
          project_id: input.projectId || null,
          activity_id: input.activityId || null,
          organization_id: orgId,
          uploaded_by: profile!.id,
          visibility_grade: input.visibilityGrade || 8,
          version,
          parent_version_id: parentVersionId,
          checksum: input.checksum || null,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast({ title: 'Document uploadé' });
    },
    onError: (e: any) => toast({ title: 'Erreur upload', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateDocumentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('documents').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast({ title: 'Statut mis à jour' });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      await supabase.storage.from('documents').remove([doc.file_path]);
      const { error } = await supabase.from('documents').delete().eq('id', doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast({ title: 'Document supprimé' });
    },
  });
}

export function useMoveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string | null }) => {
      const { error } = await supabase.from('documents').update({ folder_id: folderId }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast({ title: 'Document déplacé' });
    },
  });
}

export function useDocumentVersions(documentName: string, folderId: string | null, orgId: string | null) {
  return useQuery({
    queryKey: ['document_versions', documentName, folderId, orgId],
    enabled: !!orgId && !!documentName,
    queryFn: async () => {
      let q = supabase
        .from('documents')
        .select('*, uploader:profiles!documents_uploaded_by_fkey(full_name)')
        .eq('organization_id', orgId!)
        .eq('name', documentName)
        .order('version', { ascending: false });

      if (folderId) {
        q = q.eq('folder_id', folderId);
      } else {
        q = q.is('folder_id', null);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as DocumentRow[];
    },
  });
}

export async function downloadDocument(filePath: string, fileName: string) {
  const { data, error } = await supabase.storage.from('documents').download(filePath);
  if (error) {
    toast({ title: 'Erreur téléchargement', variant: 'destructive' });
    return;
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function logDocumentAccess(documentId: string, action: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('document_access_log').insert({
    document_id: documentId,
    user_id: user.id,
    action,
  });
}
