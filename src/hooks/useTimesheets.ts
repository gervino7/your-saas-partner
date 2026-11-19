import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { startOfWeek, format } from 'date-fns';

export function useTimeEntries(weekStart: Date, userId?: string) {
  const profile = useAuthStore((s) => s.profile);
  const targetUserId = userId || profile?.id;
  const weekStr = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['time-entries', targetUserId, weekStr],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          mission:missions(id, name, code),
          project:projects(id, name, code),
          task:tasks(id, title)
        `)
        .eq('user_id', targetUserId)
        .eq('week_start', weekStr)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!targetUserId,
  });
}

export function useMonthTimeEntries(year: number, month: number, userId?: string) {
  const profile = useAuthStore((s) => s.profile);
  const targetUserId = userId || profile?.id;
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endMonth = month === 11 ? 0 : month + 1;
  const endYear = month === 11 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-01`;

  return useQuery({
    queryKey: ['time-entries-month', targetUserId, year, month],
    queryFn: async () => {
      if (!targetUserId) return [];
      const { data, error } = await supabase
        .from('time_entries')
        .select('date, hours, status')
        .eq('user_id', targetUserId)
        .gte('date', startDate)
        .lt('date', endDate);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!targetUserId,
  });
}

export function useUpsertTimeEntry() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (entry: {
      id?: string;
      mission_id: string;
      project_id?: string | null;
      task_id?: string | null;
      date: string;
      hours: number;
      is_billable?: boolean;
      description?: string;
      week_start: string;
    }) => {
      const payload = {
        ...entry,
        user_id: profile!.id,
        organization_id: profile!.organization_id!,
      };

      if (entry.id) {
        const { error } = await supabase
          .from('time_entries')
          .update({ hours: entry.hours, description: entry.description, is_billable: entry.is_billable })
          .eq('id', entry.id);
        if (error) throw error;
      } else {
        if (entry.hours <= 0) return;
        const { error } = await supabase.from('time_entries').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
}

export function useAddTimesheetRow() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (row: {
      mission_id: string | null;
      project_id?: string | null;
      task_id?: string | null;
      is_billable?: boolean;
      description?: string;
      week_start: string;
      dates: string[];
    }) => {
      const entries = row.dates.map((date) => ({
        user_id: profile!.id,
        organization_id: profile!.organization_id!,
        mission_id: row.mission_id,
        project_id: row.project_id || null,
        task_id: row.task_id || null,
        is_billable: row.is_billable ?? true,
        description: row.description || '',
        date,
        hours: 0,
        week_start: row.week_start,
        status: 'draft' as const,
      }));
      const { error } = await supabase.from('time_entries').insert(entries);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Ligne ajoutée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSubmitTimesheet() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { weekStart: string; userId: string }) => {
      const { error } = await supabase
        .from('time_entries')
        .update({ status: 'submitted' })
        .eq('user_id', params.userId)
        .eq('week_start', params.weekStart)
        .eq('status', 'draft');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Feuille de temps soumise');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApproveTimeEntries() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (params: { ids: string[]; action: 'approved' | 'rejected'; comment?: string }) => {
      if (params.action === 'rejected' && (params.comment?.trim().length ?? 0) < 5) {
        throw new Error('Précisez ce qui doit être corrigé');
      }
      const { error } = await supabase
        .from('time_entries')
        .update({
          status: params.action,
          reviewer_id: profile!.id,
          reviewed_at: new Date().toISOString(),
          review_comment: params.comment?.trim() || null,
        })
        .in('id', params.ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-entries'] });
      qc.invalidateQueries({ queryKey: ['team-timesheets'] });
      qc.invalidateQueries({ queryKey: ['team-timesheets-pending-count'] });
      toast.success('Mise à jour effectuée');
    },
    // Surface the database trigger's French messages as-is
    onError: (e: Error) => toast.error(e.message),
  });
}


export function useTeamTimesheets(weekStart: Date, allWeeks = false) {
  const profile = useAuthStore((s) => s.profile);
  const weekStr = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['team-timesheets', profile?.id, allWeeks ? 'all' : weekStr],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      let q = supabase
        .from('time_entries')
        .select(`
          *,
          mission:missions(name, code),
          project:projects(name, code),
          task:tasks(title)
        `)
        .eq('organization_id', profile.organization_id)
        .eq('status', 'submitted')
        .neq('user_id', profile.id);
      if (!allWeeks) q = q.eq('week_start', weekStr);
      const { data, error } = await q
        .order('week_start', { ascending: true })
        .order('date');
      if (error) throw error;
      const rows = data ?? [];
      // user_id references auth.users, so profiles are read separately (RLS applies).
      const ids = Array.from(new Set(rows.map((r: any) => r.user_id)));
      if (ids.length === 0) return [];
      const { data: profs } = await supabase.from('profiles').select('id, full_name, avatar_url, grade').in('id', ids);
      const byId = new Map((profs ?? []).map((pr: any) => [pr.id, pr]));
      return rows.map((r: any) => ({ ...r, user: byId.get(r.user_id) ?? null }));
    },
    enabled: !!profile?.organization_id,
  });
}

export function usePendingTimesheetsCount() {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['team-timesheets-pending-count', profile?.id],
    queryFn: async () => {
      if (!profile?.organization_id) return 0;
      const { count, error } = await supabase
        .from('time_entries')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id)
        .eq('status', 'submitted')
        .neq('user_id', profile.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profile?.organization_id && (profile?.grade_level ?? 99) <= 3,
  });
}

export function useDailyRates() {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['daily-rates', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('daily_rates')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('grade');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useUpsertDailyRate() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (rate: { id?: string; grade: string; daily_rate: number; currency?: string }) => {
      if (rate.id) {
        const { error } = await supabase
          .from('daily_rates')
          .update({ daily_rate: rate.daily_rate, currency: rate.currency || 'XOF' })
          .eq('id', rate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('daily_rates').insert({
          organization_id: profile!.organization_id!,
          grade: rate.grade,
          daily_rate: rate.daily_rate,
          currency: rate.currency || 'XOF',
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-rates'] });
      toast.success('Taux mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useExpenses(filters: { missionId?: string; userId?: string; status?: string } = {}) {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['expenses', filters, profile?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          user:profiles!expenses_user_id_fkey(id, full_name, grade),
          mission:missions(id, name, code)
        `)
        .order('date', { ascending: false });

      if (filters.missionId) query = query.eq('mission_id', filters.missionId);
      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (values: {
      amount: number;
      date: string;
      category?: string;
      description?: string;
      mission_id?: string;
      currency?: string;
    }) => {
      const { error } = await supabase.from('expenses').insert({
        ...values,
        user_id: profile!.id,
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Note de frais créée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (params: { id: string; action: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('expenses')
        .update({ status: params.action, approved_by: profile!.id })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Note de frais mise à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useInvoices(filters: { clientId?: string; missionId?: string; status?: string } = {}) {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['invoices', filters, profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      let query = supabase
        .from('invoices')
        .select(`
          *,
          client:clients(id, name),
          mission:missions(id, name, code)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (filters.clientId) query = query.eq('client_id', filters.clientId);
      if (filters.missionId) query = query.eq('mission_id', filters.missionId);
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (values: {
      client_id: string;
      mission_id?: string;
      type?: string;
      amount: number;
      tax_amount?: number;
      total_amount: number;
      line_items?: any[];
      notes?: string;
      due_date?: string;
      currency?: string;
    }) => {
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile!.organization_id!);
      const invoiceNumber = `FAC-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;

      const { error } = await supabase.from('invoices').insert({
        ...values,
        invoice_number: invoiceNumber,
        organization_id: profile!.organization_id!,
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Facture créée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('invoices').update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Facture mise à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface MissionBudgetRow {
  id: string;
  name: string;
  code: string;
  status: string;
  budget: number;
  total_hours: number;
  /** null when daily rates are not readable or a grade has no rate. */
  total_cost: number | null;
  consumed_pct: number | null;
}

const GRADE_CODE_BY_LEVEL: Record<number, string> = {
  1: 'DA', 2: 'DM', 3: 'MGR', 4: 'SUP', 5: 'AS', 6: 'AUD', 7: 'AJ', 8: 'STG',
};

/**
 * Budgets come only from mission_budgets (RLS: associate / mission director);
 * missions absent from that answer are left out, never shown at zero.
 * Rates come only from daily_rates (RLS: levels 1-2); no fallback value.
 */
export function useMissionBudgetSummary() {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['mission-budget-summary', profile?.organization_id],
    queryFn: async (): Promise<{ rows: MissionBudgetRow[]; ratesAvailable: boolean }> => {
      if (!profile?.organization_id) return { rows: [], ratesAvailable: false };
      const orgId = profile.organization_id;

      const { data: budgets, error: bErr } = await supabase
        .from('mission_budgets')
        .select('mission_id, amount, currency')
        .eq('organization_id', orgId);
      if (bErr) throw bErr;
      const missionIds = (budgets ?? []).map((b: any) => b.mission_id);

      const { data: rates, error: rErr } = await supabase
        .from('daily_rates')
        .select('grade, daily_rate, currency')
        .eq('organization_id', orgId);
      if (rErr) throw rErr;
      const rateMap: Record<string, number> = Object.fromEntries(
        (rates ?? []).map((r: any) => [r.grade, Number(r.daily_rate)]),
      );
      const ratesAvailable = (rates ?? []).length > 0;

      if (missionIds.length === 0) return { rows: [], ratesAvailable };

      const { data: missions, error: mErr } = await supabase
        .from('missions')
        .select('id, name, code, status')
        .in('id', missionIds);
      if (mErr) throw mErr;

      const { data: entries, error: eErr } = await supabase
        .from('time_entries')
        .select('mission_id, hours, user_id')
        .eq('organization_id', orgId)
        .in('mission_id', missionIds)
        .in('status', ['approved', 'submitted']);
      if (eErr) throw eErr;

      // time_entries.user_id references auth users, not profiles: read profiles separately.
      const userIds = [...new Set((entries ?? []).map((e: any) => e.user_id).filter(Boolean))];
      const levelByUser: Record<string, number | null> = {};
      if (userIds.length > 0) {
        const { data: profs, error: pErr } = await supabase
          .from('profiles')
          .select('id, grade_level')
          .in('id', userIds);
        if (pErr) throw pErr;
        (profs ?? []).forEach((p: any) => { levelByUser[p.id] = p.grade_level; });
      }

      const budgetByMission: Record<string, number> = Object.fromEntries(
        (budgets ?? []).map((b: any) => [b.mission_id, Number(b.amount)]),
      );

      const rows = (missions ?? []).map((m: any) => {
        const mEntries = (entries ?? []).filter((e: any) => e.mission_id === m.id);
        const totalHours = mEntries.reduce((s: number, e: any) => s + Number(e.hours), 0);
        let totalCost: number | null = ratesAvailable ? 0 : null;
        for (const e of mEntries) {
          if (totalCost === null) break;
          const code = GRADE_CODE_BY_LEVEL[levelByUser[e.user_id] ?? -1];
          const rate = code ? rateMap[code] : undefined;
          totalCost = rate === undefined ? null : totalCost + (Number(e.hours) / 8) * rate;
        }
        const budget = budgetByMission[m.id];
        return {
          id: m.id,
          name: m.name,
          code: m.code,
          status: m.status,
          budget,
          total_hours: totalHours,
          total_cost: totalCost,
          consumed_pct: totalCost !== null && budget > 0 ? Math.round((totalCost / budget) * 100) : null,
        };
      });
      return { rows, ratesAvailable };
    },
    enabled: !!profile?.organization_id,
  });
}
