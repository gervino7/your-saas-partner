import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type Department = Tables<'departments'>;

export function useDepartments() {
  const org = useAuthStore(s => s.profile?.organization_id);
  return useQuery({ queryKey: ['departments', org], enabled: !!org, queryFn: async () => {
    if (!org) return [];
    const { data, error } = await supabase.from('departments').select('*').eq('organization_id', org).order('sort_order').order('label');
    if (error) throw error;
    return data;
  }});
}

export function useSaveDepartment() {
  const org = useAuthStore(s => s.profile?.organization_id);
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (value: { id?: string; code: string; label: string; is_active: boolean; sort_order: number }) => {
    if (!org) throw new Error('Cabinet introuvable. Reconnectez-vous.');
    const { id, ...fields } = value;
    const query = id ? supabase.from('departments').update(fields).eq('id', id).eq('organization_id', org) : supabase.from('departments').insert({ ...fields, organization_id: org });
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }, onSuccess: () => { void qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Département enregistré'); }, onError: (e: Error) => toast.error(e.message) });
}

export function useDefaultDepartment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (id: string) => {
    const { error } = await supabase.rpc('set_default_dossier_department', { _department_id: id });
    if (error) throw error;
  }, onSuccess: () => { void qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Département par défaut enregistré'); }, onError: (e: Error) => toast.error(e.message) });
}