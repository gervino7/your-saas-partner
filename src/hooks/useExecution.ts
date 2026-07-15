import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface ExecutionRow {
  user_id: string;
  full_name: string;
  mission_id: string | null;
  mission_name: string | null;
  planned_hours: number;
  actual_hours: number;
  execution_rate: number | null;
  gap_hours: number;
}

export function useExecution(startDate: Date, endDate: Date, userId?: string | null) {
  const s = format(startDate, 'yyyy-MM-dd');
  const e = format(endDate, 'yyyy-MM-dd');
  return useQuery({
    queryKey: ['execution', s, e, userId ?? 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_plan_execution', {
        _start_date: s,
        _end_date: e,
        _user_id: userId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as unknown as ExecutionRow[];
    },
  });
}
