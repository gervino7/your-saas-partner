import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Plan } from '@/lib/plans';

const mapPlan = (row: any): Plan => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description ?? null,
  price_monthly: Number(row.price_monthly ?? 0),
  max_users: Number(row.max_users ?? 0),
  max_missions: row.max_missions === null || row.max_missions === undefined ? null : Number(row.max_missions),
  max_storage_gb: Number(row.max_storage_gb ?? 0),
  max_clients: row.max_clients ?? null,
  features: Array.isArray(row.features) ? (row.features as string[]) : [],
  is_active: row.is_active !== false,
  is_public: row.is_public !== false,
  sort_order: row.sort_order ?? null,
});

/** Plans actifs — source unique pour tout affichage de plan. */
export function usePlans() {
  return useQuery({
    queryKey: ['plans', 'active'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapPlan);
    },
  });
}

/** Plans actifs et publics — page tarifs, onboarding. */
export function usePublicPlans() {
  return useQuery({
    queryKey: ['plans', 'public'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapPlan);
    },
  });
}


/** Tous les plans, y compris inactifs — console super admin. */
export function useAllPlans() {
  return useQuery({
    queryKey: ['plans', 'all'],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapPlan);
    },
  });
}

export interface UpsertPlanPayload {
  _code: string;
  _name: string;
  _price_monthly: number;
  _max_users: number;
  _max_missions: number | null;
  _max_storage_gb: number;
  _features?: string[];
  _description?: string | null;
  _is_active?: boolean;
  _is_public?: boolean;
}

export function useUpsertPlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: UpsertPlanPayload) => {
      const { error } = await supabase.rpc('super_admin_upsert_plan', payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Plan enregistré' });
      qc.invalidateQueries({ queryKey: ['plans'] });
      qc.invalidateQueries({ queryKey: ['subscription-limits'] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}
