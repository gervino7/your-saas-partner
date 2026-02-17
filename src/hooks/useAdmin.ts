import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

// ─── KPIs ────────────────────────────────────────────
export function useAdminKPIs() {
  const profile = useAuthStore((s) => s.profile);
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ['admin-kpis', orgId],
    queryFn: async () => {
      if (!orgId) return null;

      // Missions
      const { data: missions } = await supabase
        .from('missions')
        .select('id, status')
        .eq('organization_id', orgId);
      const activeMissions = (missions ?? []).filter((m) => m.status === 'active').length;
      const totalMissions = (missions ?? []).length;

      // Users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, is_online, last_seen_at')
        .eq('organization_id', orgId);
      const totalUsers = (users ?? []).length;
      const today = new Date().toISOString().slice(0, 10);
      const activeToday = (users ?? []).filter(
        (u) => u.last_seen_at && u.last_seen_at.slice(0, 10) === today
      ).length;

      // Utilization: billable hours / total hours this month
      const monthStart = new Date();
      monthStart.setDate(1);
      const { data: entries } = await supabase
        .from('time_entries')
        .select('hours, is_billable')
        .eq('organization_id', orgId)
        .gte('date', monthStart.toISOString().slice(0, 10));
      const totalHours = (entries ?? []).reduce((s, e) => s + Number(e.hours), 0);
      const billableHours = (entries ?? []).filter((e) => e.is_billable).reduce((s, e) => s + Number(e.hours), 0);
      const utilization = totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0;

      // Monthly revenue: paid invoices this month
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status, paid_at')
        .eq('organization_id', orgId)
        .eq('status', 'paid')
        .gte('paid_at', monthStart.toISOString());
      const monthlyRevenue = (invoices ?? []).reduce((s, i) => s + Number(i.total_amount), 0);

      // Quality: avg task rating from task_submissions
      const { data: subs } = await supabase
        .from('task_submissions')
        .select('rating')
        .not('rating', 'is', null);
      const ratings = (subs ?? []).map((s) => s.rating).filter(Boolean) as number[];
      const avgQuality = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      // Client satisfaction
      const { data: surveys } = await supabase
        .from('client_surveys')
        .select('overall_rating')
        .not('overall_rating', 'is', null);
      const surveyRatings = (surveys ?? []).map((s) => s.overall_rating).filter(Boolean) as number[];
      const avgSatisfaction = surveyRatings.length > 0
        ? surveyRatings.reduce((a, b) => a + b, 0) / surveyRatings.length
        : 0;

      return {
        activeMissions, totalMissions, activeToday, totalUsers,
        utilization, monthlyRevenue, avgQuality, avgSatisfaction,
        billableHours, totalHours,
      };
    },
    enabled: !!orgId,
  });
}

// ─── Charts Data ─────────────────────────────────────
export function useMissionsByMonth() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['missions-by-month', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data } = await supabase
        .from('missions')
        .select('created_at, status')
        .eq('organization_id', profile.organization_id);
      const byMonth: Record<string, Record<string, number>> = {};
      (data ?? []).forEach((m) => {
        const month = m.created_at?.slice(0, 7) ?? '';
        if (!byMonth[month]) byMonth[month] = {};
        byMonth[month][m.status ?? 'draft'] = (byMonth[month][m.status ?? 'draft'] || 0) + 1;
      });
      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, statuses]) => ({ month, ...statuses }));
    },
    enabled: !!profile?.organization_id,
  });
}

export function useUtilizationByGrade() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['utilization-by-grade', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data: entries } = await supabase
        .from('time_entries')
        .select('hours, is_billable, user:profiles!time_entries_user_id_fkey(grade)')
        .eq('organization_id', profile.organization_id);
      const byGrade: Record<string, { total: number; billable: number }> = {};
      (entries ?? []).forEach((e: any) => {
        const grade = e.user?.grade || 'N/A';
        if (!byGrade[grade]) byGrade[grade] = { total: 0, billable: 0 };
        byGrade[grade].total += Number(e.hours);
        if (e.is_billable) byGrade[grade].billable += Number(e.hours);
      });
      return Object.entries(byGrade).map(([grade, v]) => ({
        grade,
        utilization: v.total > 0 ? Math.round((v.billable / v.total) * 100) : 0,
        total: v.total,
      }));
    },
    enabled: !!profile?.organization_id,
  });
}

export function useTaskStatusDistribution() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['task-status-dist', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data } = await supabase
        .from('tasks')
        .select('status, project:projects!inner(organization_id)')
        .eq('project.organization_id', profile.organization_id);
      const dist: Record<string, number> = {};
      (data ?? []).forEach((t: any) => {
        dist[t.status] = (dist[t.status] || 0) + 1;
      });
      const labels: Record<string, string> = {
        todo: 'À faire', in_progress: 'En cours', in_review: 'En revue',
        correction: 'Correction', validated: 'Validé', completed: 'Terminé', cancelled: 'Annulé',
      };
      return Object.entries(dist).map(([status, count]) => ({
        name: labels[status] || status, value: count, status,
      }));
    },
    enabled: !!profile?.organization_id,
  });
}

// ─── Activity Logs ───────────────────────────────────
export function useActivityLogs(filters: {
  userId?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  entityType?: string;
} = {}) {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['activity-logs', filters, profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      let query = supabase
        .from('activity_logs')
        .select('*, user:profiles!activity_logs_user_id_fkey(id, full_name, avatar_url, grade)')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.userId) query = query.eq('user_id', filters.userId);
      if (filters.action) query = query.eq('action', filters.action);
      if (filters.entityType) query = query.eq('entity_type', filters.entityType);
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });
}

// ─── Organization Settings ───────────────────────────
export function useOrganization() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['organization', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (values: Record<string, any>) => {
      if (!profile?.organization_id) throw new Error('No org');
      const { error } = await supabase
        .from('organizations')
        .update(values)
        .eq('id', profile.organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Paramètres enregistrés');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateOrgSettings() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async (settingsPartial: Record<string, any>) => {
      if (!profile?.organization_id) throw new Error('No org');
      // Get current settings then merge
      const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', profile.organization_id)
        .single();
      const current = (org?.settings as Record<string, any>) ?? {};
      const merged = { ...current, ...settingsPartial };
      const { error } = await supabase
        .from('organizations')
        .update({ settings: merged })
        .eq('id', profile.organization_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Paramètres enregistrés');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── User Management ─────────────────────────────────
export function useUpdateUserGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, grade, grade_level }: { userId: string; grade: string; grade_level: number }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ grade, grade_level })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-users'] });
      toast.success('Grade mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: async ({ email, grade }: { email: string; grade: string }) => {
      if (!profile?.organization_id) throw new Error('Organisation non trouvée');
      const token = crypto.randomUUID();
      const { error } = await supabase.from('invitations').insert({
        email,
        grade,
        token,
        organization_id: profile.organization_id,
        invited_by: profile.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-users'] });
      toast.success('Invitation envoyée avec succès');
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });
}
