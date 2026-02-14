import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/hooks/use-toast';
import { compressImage, computeChecksum } from '@/lib/fileUtils';

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  file_name: string;
  file_path: string;
  local_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  checksum: string | null;
  sync_status: string | null;
  folder_path: string;
  is_folder: boolean;
  last_modified_local: string | null;
  last_modified_remote: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PersonalWorkspace {
  id: string;
  user_id: string;
  storage_used: number;
  storage_limit: number;
  sync_enabled: boolean;
  last_sync_at: string | null;
  sync_folder_path: string | null;
  settings: any;
  created_at: string | null;
}

// Get or create the user's workspace
export function useWorkspace(userId?: string) {
  const profile = useAuthStore((s) => s.profile);
  const targetUserId = userId || profile?.id;

  return useQuery({
    queryKey: ['workspace', targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      // Try to get existing workspace
      const { data, error } = await supabase
        .from('personal_workspaces')
        .select('*')
        .eq('user_id', targetUserId!)
        .maybeSingle();

      if (error) throw error;
      if (data) return data as PersonalWorkspace;

      // Create workspace if it's our own and doesn't exist
      if (targetUserId === profile?.id) {
        const { data: created, error: createErr } = await supabase
          .from('personal_workspaces')
          .insert({ user_id: targetUserId })
          .select()
          .single();
        if (createErr) throw createErr;
        return created as PersonalWorkspace;
      }

      return null;
    },
  });
}

export function useWorkspaceFiles(workspaceId: string | undefined, folderPath: string) {
  return useQuery({
    queryKey: ['workspace_files', workspaceId, folderPath],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_files')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .eq('folder_path', folderPath)
        .order('is_folder', { ascending: false })
        .order('file_name');

      if (error) throw error;
      return (data || []) as WorkspaceFile[];
    },
  });
}

export function useWorkspacePendingFiles(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace_files_pending', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_files')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .neq('sync_status', 'synced')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as WorkspaceFile[];
    },
  });
}

export function useUploadWorkspaceFile() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (input: {
      workspaceId: string;
      file: File;
      folderPath: string;
    }) => {
      const userId = profile!.id;
      const compressed = await compressImage(input.file);
      const checksum = await computeChecksum(compressed);

      const sanitizedName = input.file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${userId}/${Date.now()}_${sanitizedName}`;

      const { error: uploadErr } = await supabase.storage
        .from('workspace')
        .upload(storagePath, compressed, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { data, error } = await supabase
        .from('workspace_files')
        .insert({
          workspace_id: input.workspaceId,
          file_name: input.file.name,
          file_path: storagePath,
          file_size: compressed.size,
          mime_type: compressed.type,
          checksum,
          sync_status: 'synced',
          folder_path: input.folderPath,
          is_folder: false,
          last_modified_remote: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      // Update storage used
      await supabase.rpc('update_workspace_storage' as any, { ws_id: input.workspaceId });

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace_files'] });
      qc.invalidateQueries({ queryKey: ['workspace'] });
      toast({ title: 'Fichier uploadé' });
    },
    onError: (e: any) => toast({ title: 'Erreur upload', description: e.message, variant: 'destructive' }),
  });
}

export function useCreateWorkspaceFolder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { workspaceId: string; name: string; folderPath: string }) => {
      const { data, error } = await supabase
        .from('workspace_files')
        .insert({
          workspace_id: input.workspaceId,
          file_name: input.name,
          file_path: '',
          folder_path: input.folderPath,
          is_folder: true,
          sync_status: 'synced',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace_files'] });
      toast({ title: 'Dossier créé' });
    },
  });
}

export function useDeleteWorkspaceFile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: WorkspaceFile) => {
      if (!file.is_folder && file.file_path) {
        await supabase.storage.from('workspace').remove([file.file_path]);
      }
      const { error } = await supabase.from('workspace_files').delete().eq('id', file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace_files'] });
      qc.invalidateQueries({ queryKey: ['workspace'] });
      toast({ title: 'Supprimé' });
    },
  });
}

export function useRenameWorkspaceFile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('workspace_files').update({ file_name: name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace_files'] });
      toast({ title: 'Renommé' });
    },
  });
}

export function useUpdateWorkspaceSettings() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, settings }: { id: string; settings: any }) => {
      const { error } = await supabase
        .from('personal_workspaces')
        .update({ settings })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace'] });
      toast({ title: 'Paramètres mis à jour' });
    },
  });
}

export function useForceSync() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase
        .from('workspace_files')
        .update({ sync_status: 'synced', updated_at: new Date().toISOString() })
        .eq('id', fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace_files'] });
      qc.invalidateQueries({ queryKey: ['workspace_files_pending'] });
      toast({ title: 'Synchronisation forcée' });
    },
  });
}

export async function downloadWorkspaceFile(filePath: string, fileName: string) {
  const { data, error } = await supabase.storage.from('workspace').download(filePath);
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

// Get subordinates whose workspaces the current user can view
export function useSubordinates() {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['subordinates', profile?.id, profile?.grade_level],
    enabled: !!profile && (profile.grade_level ?? 8) <= 4,
    queryFn: async () => {
      if (!profile) return [];

      // DA sees all org members
      if (profile.grade_level === 1) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, grade, grade_level')
          .eq('organization_id', profile.organization_id!)
          .neq('id', profile.id)
          .order('full_name');
        if (error) throw error;
        return data || [];
      }

      // DM sees mission members
      if (profile.grade_level === 2) {
        const { data: missions } = await supabase
          .from('missions')
          .select('id')
          .or(`director_id.eq.${profile.id},chief_id.eq.${profile.id}`);

        if (!missions?.length) return [];

        const missionIds = missions.map((m) => m.id);
        const { data: members } = await supabase
          .from('mission_members')
          .select('user_id, profiles:profiles!mission_members_user_id_fkey(id, full_name, avatar_url, grade, grade_level)')
          .in('mission_id', missionIds);

        const uniqueMap = new Map<string, any>();
        members?.forEach((m: any) => {
          if (m.profiles && m.profiles.id !== profile.id) {
            uniqueMap.set(m.profiles.id, m.profiles);
          }
        });
        return Array.from(uniqueMap.values());
      }

      // CM / SUP sees project members
      if (profile.grade_level && profile.grade_level <= 4) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .eq('lead_id', profile.id);

        if (!projects?.length) return [];

        const projectIds = projects.map((p) => p.id);
        const { data: members } = await supabase
          .from('project_members')
          .select('user_id, profiles:profiles!project_members_user_id_fkey(id, full_name, avatar_url, grade, grade_level)')
          .in('project_id', projectIds);

        const uniqueMap = new Map<string, any>();
        members?.forEach((m: any) => {
          if (m.profiles && m.profiles.id !== profile.id) {
            uniqueMap.set(m.profiles.id, m.profiles);
          }
        });
        return Array.from(uniqueMap.values());
      }

      return [];
    },
  });
}
