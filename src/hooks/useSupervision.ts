import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupervisionRow {
  user_id: string;
  full_name: string;
  grade: string | null;
  grade_level: number | null;
  days_active: number;
  total_active_seconds: number;
  total_professional_seconds: number;
  avg_professional_ratio: number;
  total_files_synced: number;
  last_activity: string | null;
}

export interface ActivityKpis {
  total_collaborators: number;
  active_collaborators: number;
  avg_professional_ratio: number;
  total_active_hours: number;
  total_files_synced: number;
}

export interface ActivityDetailRow {
  report_date: string;
  active_seconds: number;
  idle_seconds: number;
  professional_seconds: number;
  professional_ratio: number;
  category_breakdown: Record<string, number> | null;
  top_apps: Array<{ name: string; seconds: number }> | null;
  files_synced: number;
  first_activity: string | null;
  last_activity: string | null;
}

export function useSupervisionSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['supervision-summary', startDate, endDate],
    queryFn: async (): Promise<SupervisionRow[]> => {
      const { data, error } = await (supabase.rpc as any)('get_activity_supervision', {
        _start_date: startDate,
        _end_date: endDate,
      });
      if (error) throw error;
      return (data ?? []) as SupervisionRow[];
    },
  });
}

export function useActivityKpis(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['activity-kpis', startDate, endDate],
    queryFn: async (): Promise<ActivityKpis | null> => {
      const { data, error } = await (supabase.rpc as any)('get_activity_kpis', {
        _start_date: startDate,
        _end_date: endDate,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as ActivityKpis | null;
    },
  });
}

export function useActivityDetail(userId: string | null, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['activity-detail', userId, startDate, endDate],
    enabled: !!userId,
    queryFn: async (): Promise<ActivityDetailRow[]> => {
      const { data, error } = await (supabase.rpc as any)('get_activity_detail', {
        _target_user: userId,
        _start_date: startDate,
        _end_date: endDate,
      });
      if (error) throw error;
      return (data ?? []) as ActivityDetailRow[];
    },
  });
}
