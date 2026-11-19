import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export type EtatAction = 'a_faire' | 'en_cours' | 'fait' | 'bloque';
export const ETAT_LABELS: Record<EtatAction, string> = {
  a_faire: 'À faire', en_cours: 'En cours', fait: 'Fait', bloque: 'Bloqué',
};

export type ActionElementaire = {
  id: string; time_entry_id: string; intitule: string; quantite: number | null;
  unite: string | null; etat: EtatAction; preuve: string | null; heures: number | null; ordre: number | null;
};

export type ActionInput = Pick<ActionElementaire, 'intitule' | 'quantite' | 'unite' | 'etat' | 'preuve' | 'heures'>;

const db = supabase as any;

export function useActionsElementaires(entryId: string | null) {
  return useQuery({
    queryKey: ['actions-elementaires', entryId],
    enabled: !!entryId,
    queryFn: async () => {
      const { data, error } = await db.from('actions_elementaires').select('*').eq('time_entry_id', entryId).order('ordre');
      if (error) throw error;
      return (data ?? []) as ActionElementaire[];
    },
  });
}

/** Number of actions per time entry, for the grid badges. */
export function useActionsCount(entryIds: string[]) {
  const key = [...entryIds].sort().join(',');
  return useQuery({
    queryKey: ['actions-elementaires-count', key],
    enabled: entryIds.length > 0,
    queryFn: async () => {
      const { data, error } = await db.from('actions_elementaires').select('time_entry_id').in('time_entry_id', entryIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of data ?? []) counts[r.time_entry_id] = (counts[r.time_entry_id] ?? 0) + 1;
      return counts;
    },
  });
}

export function useSaveAction(entryId: string) {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async ({ id, values, ordre }: { id?: string; values: ActionInput; ordre?: number }) => {
      if (id) {
        const { error } = await db.from('actions_elementaires').update(values).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await db.from('actions_elementaires').insert({
          time_entry_id: entryId, organization_id: profile!.organization_id, ...values, ordre,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions-elementaires', entryId] });
      qc.invalidateQueries({ queryKey: ['actions-elementaires-count'] });
    },
  });
}

export function useDeleteAction(entryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('actions_elementaires').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions-elementaires', entryId] });
      qc.invalidateQueries({ queryKey: ['actions-elementaires-count'] });
    },
  });
}

export type TacheImputable = {
  tache_id: string; intitule: string; tache_generale: boolean; mission_id: string | null;
  mission: string | null; projet: string | null; m_est_affecte: boolean; statut: string | null; echeance: string | null;
};

export function useTachesImputables() {
  return useQuery({
    queryKey: ['taches-imputables'],
    queryFn: async () => {
      const { data, error } = await db.rpc('taches_imputables', { _user_id: null });
      if (error) throw error;
      return (data ?? []) as TacheImputable[];
    },
  });
}

export function useEstDirecteurAssocie() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['est-directeur-associe', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await db.rpc('est_directeur_associe', { _user_id: profile!.id });
      if (error) throw error;
      return !!data;
    },
  });
}

export type LigneDisponibilite = {
  collaborateur_id: string; collaborateur: string; grade: string; staffe: boolean; missions: string | null;
  jours_ouvrables: number; capacite_heures: number; heures_planifiees: number; heures_imputees: number;
  heures_disponibles: number; taux_occupation: number | null;
};

export function useDisponibilite(debut: string, fin: string) {
  return useQuery({
    queryKey: ['disponibilite', debut, fin],
    enabled: !!debut && !!fin && debut <= fin,
    queryFn: async () => {
      const { data, error } = await db.rpc('disponibilite', { _debut: debut, _fin: fin });
      if (error) throw error;
      return (data ?? []) as LigneDisponibilite[];
    },
  });
}

export type LigneOccupation = { tache: string | null; mission: string | null; heures: number | null; action: string | null; quantite: string | null; etat: string | null };

export function useOccupationDuJour(userId: string | null, jour: string) {
  return useQuery({
    queryKey: ['occupation-du-jour', userId, jour],
    enabled: !!userId && !!jour,
    queryFn: async () => {
      const { data, error } = await db.rpc('occupation_du_jour', { _user_id: userId, _jour: jour });
      if (error) throw error;
      return (data ?? []) as LigneOccupation[];
    },
  });
}

/** "5,5 h" in French decimal format. */
export function formatHeures(h: number) {
  return `${Number(h.toFixed(2)).toLocaleString('fr-FR')} h`;
}
