import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

// ── Clients (full) ──
export function useClientsFullList() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['clients-full', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async (values: { name: string; industry?: string; contact_name?: string; contact_email?: string; contact_phone?: string; address?: string; city?: string; country?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...values, organization_id: profile!.organization_id! }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients-full'] }); toast.success('Client créé'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [k: string]: any }) => {
      const { data, error } = await supabase.from('clients').update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['clients-full'] }); qc.invalidateQueries({ queryKey: ['client', d.id] }); toast.success('Client mis à jour'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Client Contacts ──
export function useClientContacts(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-contacts', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { client_id: string; name: string; position?: string; email?: string; phone?: string; is_primary?: boolean }) => {
      const { data, error } = await supabase.from('client_contacts').insert([values]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['client-contacts', d.client_id] }); toast.success('Contact ajouté'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [k: string]: any }) => {
      const { data, error } = await supabase.from('client_contacts').update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['client-contacts', d.client_id] }); toast.success('Contact mis à jour'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase.from('client_contacts').delete().eq('id', id);
      if (error) throw error;
      return clientId;
    },
    onSuccess: (clientId) => { qc.invalidateQueries({ queryKey: ['client-contacts', clientId] }); toast.success('Contact supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Client Missions ──
export function useClientMissions(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-missions', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('missions')
        .select('id, name, code, status, start_date, end_date, progress, chief:profiles!missions_chief_id_fkey(full_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

// ── Client Interactions ──
export function useClientInteractions(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-interactions', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_interactions')
        .select('*, creator:profiles!client_interactions_created_by_fkey(full_name)')
        .eq('client_id', clientId)
        .order('interaction_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async (values: { client_id: string; type: string; title: string; description?: string; mission_id?: string }) => {
      const { data, error } = await supabase
        .from('client_interactions')
        .insert([{ ...values, created_by: profile!.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['client-interactions', d.client_id] }); toast.success('Interaction ajoutée'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Client Surveys ──
export function useClientSurveys(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-surveys', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_surveys')
        .select('*, mission:missions(name, code)')
        .eq('client_id', clientId)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

// ── Portal Tokens ──
export function usePortalTokens(clientId: string | undefined) {
  return useQuery({
    queryKey: ['portal-tokens', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_portal_tokens')
        .select('*, mission:missions(name, code)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useCreatePortalToken() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async ({ clientId, missionId }: { clientId: string; missionId: string }) => {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const { data, error } = await supabase
        .from('client_portal_tokens')
        .insert({
          client_id: clientId,
          mission_id: missionId,
          token,
          created_by: profile!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['portal-tokens', d.client_id] }); toast.success('Lien portail créé'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Satisfaction stats ──
export function useSatisfactionStats() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['satisfaction-stats', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      const { data, error } = await supabase
        .from('client_surveys')
        .select('overall_rating, nps_score')
        .eq('organization_id', profile.organization_id);
      if (error) throw error;
      if (!data || data.length === 0) return { avg: 0, nps: 0, count: 0 };
      const ratings = data.filter(d => d.overall_rating != null).map(d => d.overall_rating!);
      const npsScores = data.filter(d => d.nps_score != null).map(d => d.nps_score!);
      const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      const promoters = npsScores.filter(n => n >= 9).length;
      const detractors = npsScores.filter(n => n <= 6).length;
      const nps = npsScores.length > 0 ? Math.round(((promoters - detractors) / npsScores.length) * 100) : 0;
      return { avg: Math.round(avg * 10) / 10, nps, count: data.length };
    },
    enabled: !!profile?.organization_id,
  });
}
