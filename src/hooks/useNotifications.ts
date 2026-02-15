import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export const notificationIcons: Record<string, string> = {
  task_assigned: 'ClipboardList',
  task_deadline_soon: 'Clock',
  task_overdue: 'AlertTriangle',
  submission_received: 'Send',
  correction_needed: 'RotateCcw',
  task_validated: 'CheckCircle',
  meeting_invite: 'Video',
  meeting_reminder: 'Bell',
  document_shared: 'FileText',
  message_mention: 'AtSign',
  new_message: 'MessageSquare',
  copil_report: 'Mail',
  budget_alert: 'DollarSign',
  new_evaluation: 'Star',
  timesheet_reminder: 'Clock',
  invitation_received: 'UserPlus',
};

export const notificationLabels: Record<string, string> = {
  task_assigned: 'Tâche assignée',
  task_deadline_soon: 'Deadline proche',
  task_overdue: 'Tâche en retard',
  submission_received: 'Soumission reçue',
  correction_needed: 'Correction demandée',
  task_validated: 'Tâche validée',
  meeting_invite: 'Invitation réunion',
  meeting_reminder: 'Rappel réunion',
  document_shared: 'Document partagé',
  message_mention: 'Mention',
  new_message: 'Nouveau message',
  copil_report: 'Rapport COPIL',
  budget_alert: 'Alerte budget',
  new_evaluation: 'Évaluation',
  timesheet_reminder: 'Rappel timesheet',
  invitation_received: 'Invitation',
};

export function useNotifications(limit = 20) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: notifications = [], ...rest } = useQuery({
    queryKey: ['notifications', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const getNavigationPath = useCallback((notification: typeof notifications[0]) => {
    const { type, entity_type, entity_id } = notification;
    if (!entity_id) return null;
    switch (entity_type) {
      case 'task': return `/projects/${entity_id}`;
      case 'mission': return `/missions/${entity_id}`;
      case 'project': return `/projects/${entity_id}`;
      case 'meeting': return '/calendar';
      case 'document': return '/documents';
      case 'conversation': return '/messages';
      default: return null;
    }
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, getNavigationPath, ...rest };
}
