import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getWeekStart } from '@/lib/timeUtils';
import type { StaffingRole, StaffingStatus } from '@/lib/staffing';

export interface StaffingAssignment {
  id: string;
  user_id: string;
  mission_id: string;
  project_id: string | null;
  role: StaffingRole;
  start_date: string;
  end_date: string | null;
  weekly_hours: number;
  assigned_by: string | null;
  status: StaffingStatus;
  collaborator_note: string | null;
  chef_response: string | null;
  responded_at: string | null;
  responded_by: string | null;
  adjustment_requested_at: string | null;
  revision_count: number | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  mission?: { id: string; name: string; code: string | null } | null;
  project?: { id: string; name: string } | null;
  profile?: { id: string; full_name: string; grade: string; grade_level: number; avatar_url: string | null } | null;
  responder?: { id: string; full_name: string } | null;
}

export type StaffingPeriod = 'current' | 'upcoming' | 'past' | 'all';

interface UseStaffingArgs {
  missionId?: string | null;
  userId?: string | null;
  status?: StaffingStatus | null;
  period?: StaffingPeriod;
}

const SELECT = `
  *,
  mission:missions(id, name, code),
  project:projects(id, name),
  profile:profiles!staffing_assignments_user_id_fkey(id, full_name, grade, grade_level, avatar_url),
  responder:profiles!staffing_assignments_responded_by_fkey(id, full_name)
`;

export function useStaffingAssignments(args: UseStaffingArgs = {}) {
  const { missionId, userId, status, period = 'all' } = args;
  return useQuery({
    queryKey: ['staffing', 'list', missionId ?? null, userId ?? null, status ?? null, period],
    queryFn: async () => {
      let q = supabase.from('staffing_assignments').select(SELECT).order('start_date', { ascending: false });
      if (missionId) q = q.eq('mission_id', missionId);
      if (userId) q = q.eq('user_id', userId);
      if (status) q = q.eq('status', status);
      const today = format(new Date(), 'yyyy-MM-dd');
      if (period === 'current') {
        q = q.lte('start_date', today).or(`end_date.is.null,end_date.gte.${today}`);
      } else if (period === 'upcoming') {
        q = q.gt('start_date', today);
      } else if (period === 'past') {
        q = q.not('end_date', 'is', null).lt('end_date', today);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as StaffingAssignment[];
    },
  });
}

export function useMyAssignments() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['staffing', 'mine', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staffing_assignments')
        .select(SELECT)
        .eq('user_id', profile!.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as StaffingAssignment[];
    },
  });
}

export interface PendingAdjustment {
  id: string;
  user_id: string;
  collaborator_name: string;
  collaborator_grade: string;
  mission_id: string;
  mission_name: string;
  project_name: string | null;
  role: StaffingRole;
  start_date: string;
  end_date: string | null;
  weekly_hours: number;
  collaborator_note: string | null;
  adjustment_requested_at: string;
  revision_count: number;
  current_total_hours: number;
}

export function usePendingAdjustments() {
  const profile = useAuthStore((s) => s.profile);
  const isManager = (profile?.grade_level ?? 8) <= 3;
  return useQuery({
    queryKey: ['pending-adjustments', profile?.id],
    enabled: !!profile?.id && isManager,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_adjustments');
      if (error) {
        if (/refus|denied/i.test(error.message)) return [] as PendingAdjustment[];
        throw error;
      }
      return (data ?? []) as unknown as PendingAdjustment[];
    },
  });
}

export interface CreateAssignmentInput {
  mission_id: string;
  project_id?: string | null;
  user_id: string;
  role: StaffingRole;
  start_date: string;
  end_date?: string | null;
  weekly_hours: number;
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAssignmentInput) => {
      const { error } = await supabase.from('staffing_assignments').insert({
        mission_id: payload.mission_id,
        project_id: payload.project_id ?? null,
        user_id: payload.user_id,
        role: payload.role,
        start_date: payload.start_date,
        end_date: payload.end_date ?? null,
        weekly_hours: payload.weekly_hours,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staffing'] });
      toast.success('Affectation créée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<CreateAssignmentInput> & { status?: StaffingStatus; collaborator_note?: string | null }) => {
      const { error } = await supabase.from('staffing_assignments').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staffing'] });
      toast.success('Affectation mise à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staffing_assignments').update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staffing'] });
      toast.success('Affectation annulée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRespondToAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; status: 'accepted' | 'adjustment_requested'; collaborator_note?: string }) => {
      if (payload.status === 'adjustment_requested' && !payload.collaborator_note?.trim()) {
        throw new Error('Veuillez expliquer votre demande');
      }
      const patch: Record<string, unknown> = { status: payload.status };
      if (payload.status === 'adjustment_requested') patch.collaborator_note = payload.collaborator_note!.trim();
      const { error } = await supabase.from('staffing_assignments').update(patch).eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['staffing'] });
      qc.invalidateQueries({ queryKey: ['pending-adjustments'] });
      toast.success(vars.status === 'accepted' ? 'Affectation acceptée' : 'Demande d\'ajustement envoyée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface ArbitrateInput {
  id: string;
  chef_response: string;
  status: 'proposed' | 'cancelled';
  weekly_hours?: number;
  start_date?: string;
  end_date?: string | null;
  role?: StaffingRole;
}

export function useArbitrateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ArbitrateInput) => {
      if (!input.chef_response?.trim()) {
        throw new Error('Veuillez motiver votre décision');
      }
      const patch: Record<string, unknown> = {
        chef_response: input.chef_response.trim(),
        status: input.status,
      };
      if (input.weekly_hours !== undefined) patch.weekly_hours = input.weekly_hours;
      if (input.start_date !== undefined) patch.start_date = input.start_date;
      if (input.end_date !== undefined) patch.end_date = input.end_date;
      if (input.role !== undefined) patch.role = input.role;
      const { error } = await supabase.from('staffing_assignments').update(patch).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staffing'] });
      qc.invalidateQueries({ queryKey: ['pending-adjustments'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
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
      return (data ?? []) as Array<{
        user_id: string;
        full_name: string;
        grade: string;
        planned_hours: number;
        capacity_hours: number;
        load_rate: number;
        is_overloaded: boolean;
      }>;
    },
  });
}
