import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getWeekStart } from '@/lib/timeUtils';

export type AttendanceEventType = 'arrivee' | 'sortie_pro' | 'retour' | 'depart';
export type AttendanceState = 'not_arrived' | 'present' | 'out' | 'left';

export interface AttendanceEvent {
  id: string;
  user_id: string;
  organization_id: string;
  event_type: AttendanceEventType;
  event_at: string;
  event_date: string;
  reason: string | null;
  destination: string | null;
  mission_id: string | null;
  authorized_by: string | null;
  note: string | null;
  mission?: { id: string; name: string } | null;
  authorizer?: { id: string; full_name: string } | null;
}

function deriveState(events: AttendanceEvent[]): AttendanceState {
  if (!events.length) return 'not_arrived';
  const last = events[events.length - 1];
  switch (last.event_type) {
    case 'arrivee':
    case 'retour':
      return 'present';
    case 'sortie_pro':
      return 'out';
    case 'depart':
      return 'left';
    default:
      return 'not_arrived';
  }
}

export function useTodayAttendance() {
  const profile = useAuthStore((s) => s.profile);
  const today = format(new Date(), 'yyyy-MM-dd');
  const query = useQuery({
    queryKey: ['attendance-today', profile?.id, today],
    queryFn: async () => {
      if (!profile?.id) return [] as AttendanceEvent[];
      const { data, error } = await supabase
        .from('attendance_events')
        .select('*, mission:missions(id, name), authorizer:profiles!attendance_events_authorized_by_fkey(id, full_name)')
        .eq('user_id', profile.id)
        .eq('event_date', today)
        .order('event_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AttendanceEvent[];
    },
    enabled: !!profile?.id,
  });
  const events = query.data ?? [];
  return { ...query, events, currentState: deriveState(events) };
}

export function useCreateAttendanceEvent() {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      event_type: AttendanceEventType;
      reason?: string | null;
      destination?: string | null;
      mission_id?: string | null;
      authorized_by?: string | null;
      note?: string | null;
    }) => {
      if (!profile?.id) throw new Error('Non authentifié');
      if (payload.event_type === 'sortie_pro' && !payload.reason?.trim()) {
        throw new Error('Le motif est obligatoire');
      }
      const { error } = await supabase.from('attendance_events').insert({
        user_id: profile.id,
        event_type: payload.event_type,
        reason: payload.reason ?? null,
        destination: payload.destination ?? null,
        mission_id: payload.mission_id ?? null,
        authorized_by: payload.authorized_by ?? null,
        note: payload.note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      qc.invalidateQueries({ queryKey: ['attendance-week'] });
      const labels: Record<AttendanceEventType, string> = {
        arrivee: 'Arrivée enregistrée',
        sortie_pro: 'Sortie enregistrée',
        retour: 'Retour enregistré',
        depart: 'Départ enregistré',
      };
      toast.success(labels[vars.event_type]);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWeekAttendance(weekStart?: Date) {
  const profile = useAuthStore((s) => s.profile);
  const start = getWeekStart(weekStart ?? new Date());
  const startStr = format(start, 'yyyy-MM-dd');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const endStr = format(end, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['attendance-week', profile?.id, startStr],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('attendance_daily')
        .select('*')
        .eq('user_id', profile.id)
        .gte('event_date', startStr)
        .lte('event_date', endStr)
        .order('event_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });
}
