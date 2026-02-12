import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

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
    queryKey: ['missions', filters, profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      let query = supabase
        .from('missions')
        .select(`
          *,
          client:clients(id, name),
          director:profiles!missions_director_id_fkey(id, full_name, avatar_url),
          chief:profiles!missions_chief_id_fkey(id, full_name, avatar_url)
        `)
        .eq('organization_id', profile.organization_id)
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
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
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
      // Generate mission code
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile!.organization_id!);
      const code = `MIS-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('missions')
        .insert({
          ...values,
          code,
          organization_id: profile!.organization_id!,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      // Add director and chief as mission members
      const members: { mission_id: string; user_id: string; role: string }[] = [];
      if (values.director_id) {
        members.push({ mission_id: data.id, user_id: values.director_id, role: 'director' });
      }
      if (values.chief_id && values.chief_id !== values.director_id) {
        members.push({ mission_id: data.id, user_id: values.chief_id, role: 'chief' });
      }
      if (members.length > 0) {
        await supabase.from('mission_members').insert(members);
      }

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

export function useOrganizationUsers() {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['org-users', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, grade, grade_level, email, is_online')
        .eq('organization_id', profile.organization_id)
        .order('grade_level', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
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
