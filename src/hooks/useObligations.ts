import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export interface EcheancierRow {
  id: string;
  client_id: string;
  client_name: string;
  obligation_code: string;
  obligation_label: string;
  category: string;
  period_label: string;
  due_date: string;
  days_left: number;
  is_late: boolean;
  status: string;
  assigned_to: string | null;
  assigned_name: string | null;
  last_reminder_at: string | null;
}

export function useEcheancier(params: {
  from?: string;
  to?: string;
  status?: string | null;
  clientId?: string | null;
}) {
  const { from, to, status, clientId } = params;
  return useQuery({
    queryKey: ['echeancier', from, to, status, clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_obligations_echeancier', {
        _from: from,
        _to: to,
        _status: status ?? null,
        _client_id: clientId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as EcheancierRow[];
    },
  });
}

export function useObligationsKpis() {
  return useQuery({
    queryKey: ['obligations-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_obligations_kpis');
      if (error) throw error;
      return (data?.[0] ?? {
        total_en_cours: 0, en_retard: 0, echeance_7j: 0,
        pieces_attendues: 0, deposees_ce_mois: 0,
      }) as {
        total_en_cours: number;
        en_retard: number;
        echeance_7j: number;
        pieces_attendues: number;
        deposees_ce_mois: number;
      };
    },
  });
}

export function useUpdateObligation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: {
      id: string;
      status?: string;
      assigned_to?: string | null;
      notes?: string | null;
      reference_depot?: string | null;
      montant?: number | null;
    }) => {
      const payload: Record<string, unknown> = { ...values };
      delete payload.deposed_at;
      delete payload.deposed_by;
      const { data, error } = await supabase
        .from('obligation_periods')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['echeancier'] });
      qc.invalidateQueries({ queryKey: ['obligations-kpis'] });
      qc.invalidateQueries({ queryKey: ['client-dossiers'] });
      toast.success('Échéance mise à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkUpdateObligations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, values }: {
      ids: string[];
      values: { status?: string; assigned_to?: string | null };
    }) => {
      const { error } = await supabase
        .from('obligation_periods')
        .update(values)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['echeancier'] });
      qc.invalidateQueries({ queryKey: ['obligations-kpis'] });
      toast.success('Mise à jour groupée effectuée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGeneratePeriods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month }: { year: number; month?: number | null }) => {
      const { data, error } = await supabase.rpc('generate_obligation_periods', {
        _year: year,
        _month: month ?? null,
      });
      if (error) throw error;
      return (data?.[0]?.created_count ?? 0) as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['echeancier'] });
      qc.invalidateQueries({ queryKey: ['obligations-kpis'] });
      qc.invalidateQueries({ queryKey: ['client-dossiers'] });
      toast.success(`${count} échéance(s) créée(s)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Client dossiers overview ──
export function useClientDossiers() {
  return useQuery({
    queryKey: ['client-dossiers'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_dossiers');
      if (error) throw error;
      return (data ?? []) as Array<{
        client_id: string;
        client_name: string;
        regime_fiscal: string | null;
        collaborateur_name: string | null;
        nb_obligations: number;
        nb_en_retard: number;
        nb_a_faire: number;
        prochaine_echeance: string | null;
        sante: 'ok' | 'vigilance' | 'retard';
      }>;
    },
  });
}

// ── Fiscal profile ──
export function useClientFiscalProfile(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-fiscal-profile', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from('client_fiscal_profile')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useUpsertFiscalProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown> & { client_id: string }) => {
      // organization_id is filled by a database trigger — never send it.
      const { organization_id, created_at, updated_at, ...payload } = values as Record<string, unknown>;
      const { data, error } = await supabase
        .from('client_fiscal_profile')
        .upsert(payload as never, { onConflict: 'client_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['client-fiscal-profile', d.client_id] });
      qc.invalidateQueries({ queryKey: ['client-dossiers'] });
      toast.success('Fiche fiscale enregistrée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Obligation types (referentiel) ──
export function useObligationTypes() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['obligation-types', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('obligation_types')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('category')
        .order('label');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useUpsertObligationType() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async (values: Record<string, unknown> & { id?: string }) => {
      const payload = { ...values, organization_id: profile!.organization_id } as never;
      const { data, error } = await supabase
        .from('obligation_types')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obligation-types'] });
      toast.success('Obligation enregistrée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSeedObligationTypes() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('seed_obligation_types', {
        _org_id: profile!.organization_id!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obligation-types'] });
      toast.success('Référentiel réinitialisé');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Client subscribed obligations ──
export function useClientObligations(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-obligations', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_obligations')
        .select('*, obligation_type:obligation_types(id, code, label, periodicite, applies_to_regimes)')
        .eq('client_id', clientId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

export function useToggleClientObligation() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async (values: {
      id?: string;
      client_id: string;
      obligation_type_id: string;
      is_active: boolean;
      responsible_id?: string | null;
      custom_deadline_day?: number | null;
    }) => {
      // organization_id is filled by a database trigger — never send it.
      const payload = { ...values };
      const { data, error } = await supabase
        .from('client_obligations')
        .upsert(payload, { onConflict: 'client_id,obligation_type_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['client-obligations', d.client_id] });
      qc.invalidateQueries({ queryKey: ['client-dossiers'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Client interactions (relances) ──
export function useObligationInteractions(obligationPeriodId: string | undefined) {
  return useQuery({
    queryKey: ['obligation-interactions', obligationPeriodId],
    queryFn: async () => {
      if (!obligationPeriodId) return [];
      const { data, error } = await supabase
        .from('client_interactions')
        .select('*, created_by_profile:profiles!client_interactions_created_by_fkey(full_name)')
        .eq('obligation_period_id', obligationPeriodId)
        .order('interaction_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!obligationPeriodId,
  });
}

export function useLogRelance() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async (values: {
      client_id: string;
      obligation_period_id: string;
      title: string;
      description: string;
      canal: string;
    }) => {
      const { error } = await supabase.from('client_interactions').insert({
        client_id: values.client_id,
        obligation_period_id: values.obligation_period_id,
        type: 'relance',
        title: values.title,
        description: values.description,
        interaction_date: new Date().toISOString(),
        created_by: profile!.id,
        metadata: { canal: values.canal },
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['echeancier'] });
      qc.invalidateQueries({ queryKey: ['obligation-interactions', vars.obligation_period_id] });
      toast.success('Relance enregistrée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Org collaborators (for assign selects) ──
export function useOrgCollaborators() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['org-collaborators', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, grade, grade_level')
        .eq('organization_id', profile.organization_id)
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });
}
