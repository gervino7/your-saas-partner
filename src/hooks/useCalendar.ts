import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'meeting' | 'deadline' | 'copil' | 'milestone';
  color: string;
  metadata?: Record<string, any>;
}

export function useCalendar() {
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: meetings = [], ...meetingsQuery } = useQuery({
    queryKey: ['meetings', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('meetings')
        .select('*, meeting_participants(user_id, status)')
        .eq('organization_id', profile?.organization_id ?? '')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!profile?.organization_id,
  });

  const { data: committeeMeetings = [] } = useQuery({
    queryKey: ['committee_meetings_calendar', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('committee_meetings')
        .select('*, committees(name, type, mission_id)')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks_deadlines', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, priority')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ['org_members', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, grade, avatar_url')
        .eq('organization_id', profile.organization_id)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  // Transform data into calendar events
  const events: CalendarEvent[] = [
    ...meetings.map((m: any) => ({
      id: `meeting-${m.id}`,
      title: m.title,
      start: new Date(m.scheduled_at),
      end: new Date(new Date(m.scheduled_at).getTime() + (m.duration_minutes || 60) * 60000),
      type: 'meeting' as const,
      color: 'hsl(217, 91%, 60%)',
      metadata: { ...m, entityType: 'meeting' },
    })),
    ...committeeMeetings.map((cm: any) => ({
      id: `copil-${cm.id}`,
      title: `${cm.committees?.type === 'copil' ? 'COPIL' : 'CODIR'} — ${cm.title}`,
      start: new Date(cm.scheduled_at),
      end: new Date(new Date(cm.scheduled_at).getTime() + (cm.duration_minutes || 60) * 60000),
      type: 'copil' as const,
      color: 'hsl(38, 92%, 50%)',
      metadata: { ...cm, entityType: 'committee_meeting' },
    })),
    ...tasks
      .filter((t: any) => t.due_date)
      .map((t: any) => ({
        id: `task-${t.id}`,
        title: t.title,
        start: new Date(t.due_date),
        end: new Date(t.due_date),
        type: 'deadline' as const,
        color: t.status === 'overdue' || (new Date(t.due_date) < new Date() && t.status !== 'validated')
          ? 'hsl(0, 84%, 60%)'
          : 'hsl(0, 84%, 60%)',
        metadata: { ...t, entityType: 'task' },
      })),
  ];

  const createMeeting = useMutation({
    mutationFn: async (meeting: {
      title: string;
      description?: string;
      agenda?: string;
      scheduled_at: string;
      duration_minutes: number;
      type: string;
      meeting_link?: string;
      location?: string;
      recurrence?: string;
      reminders?: string[];
      participants: string[];
      mission_id?: string;
      project_id?: string;
    }) => {
      const { participants, ...meetingData } = meeting;
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          ...meetingData,
          organizer_id: user!.id,
          organization_id: profile!.organization_id,
          meeting_link: meetingData.meeting_link || `https://meet.jit.si/MissionFlow-${crypto.randomUUID().slice(0, 8)}`,
          status: 'scheduled',
        })
        .select()
        .single();
      if (error) throw error;

      // Add participants
      if (participants.length > 0) {
        const { error: partError } = await supabase
          .from('meeting_participants')
          .insert(
            participants.map((userId) => ({
              meeting_id: data.id,
              user_id: userId,
              status: 'invited',
            }))
          );
        if (partError) throw partError;
      }

      // Create notifications for participants
      const notifs = participants
        .filter((p) => p !== user!.id)
        .map((userId) => ({
          user_id: userId,
          type: 'meeting_invitation',
          title: `Invitation : ${meeting.title}`,
          content: `Vous êtes invité(e) à une réunion le ${new Date(meeting.scheduled_at).toLocaleDateString('fr-FR')}`,
          entity_type: 'meeting',
          entity_id: data.id,
        }));
      if (notifs.length > 0) {
        await supabase.from('notifications').insert(notifs);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const updateMeeting = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('meetings').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings'] }),
  });

  const respondToMeeting = useMutation({
    mutationFn: async ({ meetingId, status }: { meetingId: string; status: string }) => {
      const { error } = await supabase
        .from('meeting_participants')
        .update({ status })
        .eq('meeting_id', meetingId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings'] }),
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meetings'] }),
  });

  return {
    events,
    meetings,
    committeeMeetings,
    orgMembers,
    createMeeting,
    updateMeeting,
    respondToMeeting,
    deleteMeeting,
    isLoading: meetingsQuery.isLoading,
  };
}
