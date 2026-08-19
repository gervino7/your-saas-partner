import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getWeekStart } from '@/lib/timeUtils';

export type PlanEntryType = 'mission' | 'rendez_vous' | 'formation' | 'admin' | 'conge';
export type PlanEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface PlanEntry {
  id: string;
  user_id: string;
  plan_date: string;
  week_start: string;
  entry_type: PlanEntryType;
  status: PlanEntryStatus;
  planned_hours: number;
  start_time: string | null;
  end_time: string | null;
  title: string | null;
  location: string | null;
  mission_id: string | null;
  project_id: string | null;
  task_id: string | null;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  mission?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
  profile?: { id: string; full_name: string; grade: string } | null;
}

export function usePlanEntries(rangeStart: Date, rangeEnd: Date, userId?: string) {
  const profile = useAuthStore((s) => s.profile);
  const uid = userId ?? profile?.id;
  const s = format(rangeStart, 'yyyy-MM-dd');
  const e = format(rangeEnd, 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['plan-entries', uid, s, e],
    queryFn: async () => {
      if (!uid) return [] as PlanEntry[];
      const { data, error } = await supabase
        .from('plan_entries')
        .select('*, mission:missions(id, name), project:projects(id, name), task:tasks(id, title)')
        .eq('user_id', uid)
        .gte('plan_date', s)
        .lte('plan_date', e)
        .order('plan_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PlanEntry[];
    },
    enabled: !!uid,
  });
}

export function useUpsertPlanEntry() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<PlanEntry> & { plan_date: string; entry_type: PlanEntryType; planned_hours: number }) => {
      if (!profile?.id) throw new Error('Non authentifié');
      const weekStart = format(getWeekStart(new Date(payload.plan_date)), 'yyyy-MM-dd');
      const row = {
        user_id: profile.id,
        plan_date: payload.plan_date,
        week_start: weekStart,
        entry_type: payload.entry_type,
        planned_hours: payload.planned_hours,
        start_time: payload.start_time ?? null,
        end_time: payload.end_time ?? null,
        title: payload.title ?? null,
        location: payload.location ?? null,
        mission_id: payload.mission_id ?? null,
        project_id: payload.project_id ?? null,
        task_id: payload.task_id ?? null,
        status: (payload.status ?? 'draft') as PlanEntryStatus,
      };
      if (payload.id) {
        const { error } = await supabase.from('plan_entries').update(row).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plan_entries').insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan-entries'] });
      toast.success('Planning enregistré');
    },
    // L'erreur est affichée par l'appelant (message de la base tel quel)
  });
}

export function useDeletePlanEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plan_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan-entries'] });
      toast.success('Entrée supprimée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSubmitWeek() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weekStart: Date) => {
      if (!profile?.id) throw new Error('Non authentifié');
      const ws = format(getWeekStart(weekStart), 'yyyy-MM-dd');
      const { error } = await supabase
        .from('plan_entries')
        .update({ status: 'submitted' })
        .eq('user_id', profile.id)
        .eq('week_start', ws)
        .eq('status', 'draft');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan-entries'] });
      toast.success('Planning soumis pour validation');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMyStaffing() {
  const profile = useAuthStore((s) => s.profile);
  const today = format(new Date(), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['my-staffing', profile?.id, today],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('staffing_assignments')
        .select('*, mission:missions(id, name, code), project:projects(id, name)')
        .eq('user_id', profile.id)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });
}

export function usePlannableMissions() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['plannable-missions', profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('missions')
        .select('id, name, code, status')
        .in('status', ['planning', 'in_progress', 'active'])
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTeamPlans(weekStart: Date, allWeeks = false) {
  const profile = useAuthStore((s) => s.profile);
  const ws = format(getWeekStart(weekStart), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['team-plans', profile?.id, allWeeks ? 'all' : ws],
    queryFn: async () => {
      if (!profile?.id) return [] as PlanEntry[];
      let q = supabase
        .from('plan_entries')
        .select('*, mission:missions(id, name), project:projects(id, name), task:tasks(id, title), profile:profiles!plan_entries_user_id_fkey(id, full_name, grade)')
        .eq('status', 'submitted')
        .neq('user_id', profile.id);
      if (!allWeeks) q = q.eq('week_start', ws);
      const { data, error } = await q
        .order('week_start', { ascending: true })
        .order('plan_date', { ascending: true });
      if (error) throw error;
      console.log('[TeamPlans] rows:', data?.length, 'week:', allWeeks ? 'toutes' : ws);
      return (data ?? []) as unknown as PlanEntry[];
    },
    enabled: !!profile?.id,
  });
}

export function usePendingPlansCount() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['team-plans-pending-count', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count, error } = await supabase
        .from('plan_entries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted')
        .neq('user_id', profile.id);
      if (error) throw error;
      return count ?? 0;
    },
  });
}


export function useReviewPlan() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ids: string[]; status: 'approved' | 'rejected'; review_comment?: string }) => {
      if (!profile?.id) throw new Error('Non authentifié');
      if (payload.status === 'rejected' && !payload.review_comment?.trim()) {
        throw new Error('Un commentaire est obligatoire pour renvoyer un planning');
      }
      const { error } = await supabase
        .from('plan_entries')
        .update({
          status: payload.status,
          reviewer_id: profile.id,
          reviewed_at: new Date().toISOString(),
          review_comment: payload.review_comment ?? null,
        })
        .in('id', payload.ids);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['team-plans'] });
      qc.invalidateQueries({ queryKey: ['team-plans-pending-count'] });

      toast.success(vars.status === 'approved' ? 'Planning validé' : 'Planning renvoyé');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWorkload(weekStart: Date) {
  const ws = format(getWeekStart(weekStart), 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['workload', ws],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_workload', { _week_start: ws });
      if (error) throw error;
      return data ?? [];
    },
  });
}
