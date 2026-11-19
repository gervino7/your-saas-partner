import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export type MissionBudget =
  | { etat: 'reserve' }
  | { etat: 'non_fixe'; peutFixer: boolean }
  | { etat: 'fixe'; montant: number; devise: string; notes: string | null; fixePar: string | null; peutFixer: boolean };

const db = supabase as any;

/** The database decides who sees the budget: zero rows from budget_de_la_mission is a refusal, never a zero amount. */
export function useMissionBudget(missionId: string | undefined) {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['mission-budget', missionId],
    enabled: !!missionId && !!profile?.id,
    queryFn: async (): Promise<MissionBudget> => {
      const { data, error } = await db.rpc('budget_de_la_mission', { _mission_id: missionId });
      if (error) throw error;
      const row = (data ?? [])[0];
      if (row) {
        if (row.montant == null) return { etat: 'non_fixe', peutFixer: !!row.le };
        return { etat: 'fixe', montant: Number(row.montant), devise: row.devise || 'XOF', notes: row.notes, fixePar: row.fixe_par, peutFixer: !!row.le };
      }
      // No row: either no budget exists yet, or the caller may not see it.
      const [{ data: voir }, { data: fixer }] = await Promise.all([
        db.rpc('peut_voir_le_budget', { _user_id: profile!.id, _mission_id: missionId }),
        db.rpc('peut_fixer_le_budget', { _user_id: profile!.id, _mission_id: missionId }),
      ]);
      if (!voir) return { etat: 'reserve' };
      return { etat: 'non_fixe', peutFixer: !!fixer };
    },
  });
}

export function useSetMissionBudget(missionId: string) {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async ({ montant, devise, notes }: { montant: number; devise: string; notes?: string | null }) => {
      const { error } = await db.from('mission_budgets').upsert({
        mission_id: missionId, organization_id: profile!.organization_id,
        amount: montant, currency: devise || 'XOF', notes: notes ?? null, created_by: profile!.id,
      }, { onConflict: 'mission_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mission-budget', missionId] }),
  });
}

export function formatMontant(n: number, devise = 'XOF') {
  const s = new Intl.NumberFormat('fr-FR').format(n).replace(/\u202f|\u00a0/g, ' ');
  return devise === 'XOF' || devise === 'XAF' ? `${s} FCFA` : `${s} ${devise}`;
}
