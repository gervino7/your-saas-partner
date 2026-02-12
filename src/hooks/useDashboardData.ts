import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export function useDashboardData() {
  const { user, profile } = useAuthStore();
  const gradeLevel = profile?.grade_level ?? 8;
  const isDirector = gradeLevel <= 2; // DA or DM see org-wide

  const activeMissions = useQuery({
    queryKey: ['dashboard', 'activeMissions', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const myTasks = useQuery({
    queryKey: ['dashboard', 'myTasks', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('task_assignments')
        .select('task_id, tasks!inner(status)', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('tasks.status', ['todo', 'in_progress', 'in_review', 'correction']);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const weeklyDocuments = useQuery({
    queryKey: ['dashboard', 'weeklyDocs', user?.id, weekStart],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart)
        .lte('created_at', weekEnd);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const weeklyHours = useQuery({
    queryKey: ['dashboard', 'weeklyHours', user?.id, weekStart],
    queryFn: async () => {
      if (!user) return 0;
      const query = supabase
        .from('timesheets')
        .select('hours')
        .gte('date', weekStart)
        .lte('date', weekEnd);

      if (!isDirector) {
        query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data?.reduce((sum, t) => sum + Number(t.hours), 0) ?? 0;
    },
    enabled: !!user,
  });

  const urgentTasks = useQuery({
    queryKey: ['dashboard', 'urgentTasks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('task_assignments')
        .select(`
          task_id,
          tasks (
            id, title, status, priority, due_date,
            projects (name)
          )
        `)
        .eq('user_id', user.id)
        .not('tasks.status', 'in', '("completed","cancelled","validated")')
        .not('tasks.due_date', 'is', null)
        .order('tasks(due_date)', { ascending: true })
        .limit(5);
      if (error) throw error;
      return (data ?? [])
        .map((d: any) => d.tasks)
        .filter(Boolean)
        .sort((a: any, b: any) => (a.due_date > b.due_date ? 1 : -1));
    },
    enabled: !!user,
  });

  const upcomingMeetings = useQuery({
    queryKey: ['dashboard', 'upcomingMeetings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('id, title, scheduled_at, duration_minutes, meeting_link, type')
        .gte('scheduled_at', new Date().toISOString())
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const recentActivity = useQuery({
    queryKey: ['dashboard', 'recentActivity', user?.id],
    queryFn: async () => {
      const query = supabase
        .from('activity_logs')
        .select('id, action, entity_type, entity_id, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(8);

      if (!isDirector) {
        query.eq('user_id', user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  return {
    activeMissions: activeMissions.data ?? 0,
    myTasks: myTasks.data ?? 0,
    weeklyDocuments: weeklyDocuments.data ?? 0,
    weeklyHours: weeklyHours.data ?? 0,
    urgentTasks: urgentTasks.data ?? [],
    upcomingMeetings: upcomingMeetings.data ?? [],
    recentActivity: recentActivity.data ?? [],
    isLoading:
      activeMissions.isLoading ||
      myTasks.isLoading ||
      weeklyDocuments.isLoading ||
      weeklyHours.isLoading,
  };
}
