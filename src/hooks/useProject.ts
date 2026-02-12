import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          lead:profiles!projects_lead_id_fkey(id, full_name, avatar_url, grade),
          mission:missions!projects_mission_id_fkey(id, name, code)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          user:profiles!project_members_user_id_fkey(id, full_name, avatar_url, grade, grade_level, email, is_online)
        `)
        .eq('project_id', projectId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignments:task_assignments(
            id,
            user:profiles!task_assignments_user_id_fkey(id, full_name, avatar_url)
          )
        `)
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function useProjectActivities(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      project_id: string;
      activity_id?: string;
      parent_task_id?: string;
      status?: string;
      priority?: string;
      due_date?: string;
      start_date?: string;
      estimated_hours?: number;
      compartment?: string;
      tags?: string[];
      assigned_to?: string[];
    }) => {
      const { assigned_to, ...taskValues } = values;
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskValues,
          created_by: profile!.id,
          status: values.status || 'todo',
          priority: values.priority || 'medium',
          tags: values.tags ? JSON.stringify(values.tags) : '[]',
        })
        .select()
        .single();
      if (error) throw error;

      if (assigned_to && assigned_to.length > 0) {
        const assignments = assigned_to.map((userId) => ({
          task_id: data.id,
          user_id: userId,
          assigned_by: profile!.id,
        }));
        await supabase.from('task_assignments').insert(assignments);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', data.project_id] });
      toast.success('Tâche créée avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', data.project_id] });
      toast.success('Tâche mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      project_id: string;
      parent_id?: string;
      depth?: number;
      code?: string;
      planned_start_date?: string;
      planned_end_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('activities')
        .insert({ ...values, created_by: profile?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', data.project_id] });
      toast.success('Activité créée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('activities')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', data.project_id] });
      toast.success('Activité mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
      toast.success('Activité supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, userId, role, subTeam }: {
      projectId: string;
      userId: string;
      role: string;
      subTeam?: string;
    }) => {
      const { error } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: userId, role, sub_team: subTeam });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', vars.projectId] });
      toast.success('Membre ajouté au projet');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useProjectPublications(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-publications', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('publications')
        .select(`
          *,
          author:profiles!publications_author_id_fkey(id, full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
  });
}

export function useCreatePublication() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (values: {
      title: string;
      content: string;
      project_id: string;
      type?: string;
      visibility_grade?: number;
    }) => {
      const { data, error } = await supabase
        .from('publications')
        .insert({ ...values, author_id: profile!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-publications', data.project_id] });
      toast.success('Publication créée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useProjectNotes(projectId: string | undefined) {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['project-notes', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .or(`project_id.eq.${projectId},and(user_id.eq.${profile!.id},project_id.is.null)`)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId && !!profile?.id,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (values: {
      title?: string;
      content: string;
      project_id?: string;
      is_private?: boolean;
      tags?: string[];
    }) => {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          ...values,
          user_id: profile!.id,
          tags: values.tags ? JSON.stringify(values.tags) : '[]',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-notes', data.project_id] });
      toast.success('Note créée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
