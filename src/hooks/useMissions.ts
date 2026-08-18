import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { sanitizeSearchTerm } from '@/lib/search';


export interface MissionFilters {
  status?: string;
  type?: string;
  priority?: string;
  clientId?: string;
  search?: string;
}

export function useMissions(filters: MissionFilters = {}) {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['missions', filters, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      let query = supabase
        .from('missions')
        .select(`
          *,
          client:clients(id, name),
          director:profiles!missions_director_id_fkey(id, full_name, avatar_url),
          chief:profiles!missions_chief_id_fkey(id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters.clientId && filters.clientId !== 'all') {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters.search) {
        const term = sanitizeSearchTerm(filters.search);
        if (term) query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`);

      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });
}

export function useMission(id: string | undefined) {
  return useQuery({
    queryKey: ['mission', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('missions')
        .select(`
          *,
          client:clients(id, name, contact_name, contact_email),
          director:profiles!missions_director_id_fkey(id, full_name, avatar_url, grade),
          chief:profiles!missions_chief_id_fkey(id, full_name, avatar_url, grade)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useMissionMembers(missionId: string | undefined) {
  return useQuery({
    queryKey: ['mission-members', missionId],
    queryFn: async () => {
      if (!missionId) return [];
      const { data, error } = await supabase
        .from('mission_members')
        .select(`
          *,
          user:profiles!mission_members_user_id_fkey(id, full_name, avatar_url, grade, grade_level, is_online, email)
        `)
        .eq('mission_id', missionId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!missionId,
  });
}

export function useMissionProjects(missionId: string | undefined) {
  return useQuery({
    queryKey: ['mission-projects', missionId],
    queryFn: async () => {
      if (!missionId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          lead:profiles!projects_lead_id_fkey(id, full_name, avatar_url)
        `)
        .eq('mission_id', missionId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!missionId,
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      type?: string;
      client_id?: string;
      director_id?: string;
      chief_id?: string;
      budget_amount?: number;
      budget_currency?: string;
      start_date?: string;
      end_date?: string;
      priority?: string;
    }) => {
      if (!profile?.id) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data, error } = await (supabase as any).rpc('create_mission_with_members', {
        _name: values.name,
        _description: values.description ?? null,
        _type: values.type ?? null,
        _client_id: values.client_id ?? null,
        _director_id: values.director_id ?? null,
        _chief_id: values.chief_id ?? null,
        _budget_amount: values.budget_amount ?? null,
        _budget_currency: values.budget_currency ?? 'XOF',
        _start_date: values.start_date ?? null,
        _end_date: values.end_date ?? null,
        _priority: values.priority ?? 'medium',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      toast.success('Mission créée avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('missions')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['mission', data.id] });
      toast.success('Mission mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('missions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      toast.success('Mission supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useAddMissionMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ missionId, userId, role }: { missionId: string; userId: string; role: string }) => {
      const { error } = await supabase
        .from('mission_members')
        .insert({ mission_id: missionId, user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mission-members', vars.missionId] });
      toast.success('Membre ajouté');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useRemoveMissionMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ missionId, userId, reason }: { missionId: string; userId: string; reason: string }) => {
      const { error } = await supabase.rpc('remove_mission_member' as any, {
        _mission_id: missionId,
        _user_id: userId,
        _reason: reason,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mission-members', vars.missionId] });
      queryClient.invalidateQueries({ queryKey: ['staffing-assignments'] });
      toast.success('Collaborateur retiré de la mission');
    },
  });
}



export function useOrganizationUsers() {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['org-users', profile?.organization_id, profile?.grade_level],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, grade, grade_level, email, is_online')
        .eq('organization_id', profile.organization_id)
        .order('grade_level', { ascending: true });
      if (error) throw error;
      const viewerLevel = profile.grade_level ?? 8;
      // DA/DM (level <= 2) see everyone. Others see same grade or lower (level >= viewer).
      const filtered = viewerLevel <= 2
        ? (data ?? [])
        : (data ?? []).filter((u: any) => (u.grade_level ?? 8) >= viewerLevel || u.id === profile.id);
      return filtered;
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      mission_id: string;
      lead_id?: string;
      budget_allocated?: number;
      start_date?: string;
      end_date?: string;
    }) => {
      if (!profile?.id) {
        throw new Error('Utilisateur non authentifié');
      }
      if (!profile.organization_id) {
        throw new Error('Votre profil n\'est rattaché à aucune organisation');
      }

      const { error } = await supabase
        .from('projects')
        .insert({
          mission_id: values.mission_id,
          organization_id: profile.organization_id,
          name: values.name,
          description: values.description ?? null,
          lead_id: values.lead_id ?? null,
          budget_allocated: values.budget_allocated ?? 0,
          start_date: values.start_date ?? null,
          end_date: values.end_date ?? null,
          status: 'planning',
        });
      if (error) throw error;

      return null;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['mission-projects', vars.mission_id] });
      toast.success('Projet créé avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mission-projects', data.mission_id] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
      toast.success('Projet mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, missionId }: { id: string; missionId: string }) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      return missionId;
    },
    onSuccess: (missionId) => {
      queryClient.invalidateQueries({ queryKey: ['mission-projects', missionId] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      toast.success('Projet supprimé avec toutes ses tâches');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useClients() {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['clients', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('organization_id', profile.organization_id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });
}
