import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export interface BudgetDuCabinet {
  mission_id: string;
  code: string;
  intitule: string;
  statut: string;
  montant: number | null;
  devise: string | null;
  notes: string | null;
  fixe_par: string | null;
  peut_le_fixer: boolean;
}

const db = supabase as any;

/** Budgets are read and set only from Finances; budgets_du_cabinet decides who sees which mission. */
export function useBudgetsDuCabinet() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['budgets-du-cabinet', profile?.organization_id],
    enabled: !!profile?.id,
    queryFn: async (): Promise<BudgetDuCabinet[]> => {
      const { data, error } = await db.rpc('budgets_du_cabinet');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSetMissionBudget() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async ({ missionId, montant, devise, notes }: { missionId: string; montant: number; devise: string; notes?: string | null }) => {
      const { data, error } = await db.from('mission_budgets').upsert({
        mission_id: missionId,
        organization_id: profile!.organization_id,
        amount: montant,
        currency: devise || 'XOF',
        notes: notes || null,
      }, { onConflict: 'mission_id' }).select('mission_id');
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Ce budget n'a pas été enregistré : seul l'associé de la mission peut le fixer.");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets-du-cabinet'] });
      qc.invalidateQueries({ queryKey: ['mission-budget-summary'] });
    },
  });
}

export function formatMontant(n: number, devise = 'XOF') {
  const s = new Intl.NumberFormat('fr-FR').format(n).replace(/\u202f|\u00a0/g, ' ');
  return devise === 'XOF' || devise === 'XAF' ? `${s} FCFA` : `${s} ${devise}`;
}
