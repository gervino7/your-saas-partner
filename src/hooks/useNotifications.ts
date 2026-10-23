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
  staffing_assigned: 'UserPlus',
  staffing_adjustment_requested: 'RefreshCw',
  staffing_response: 'MessageCircle',
  document_deposited: 'Upload',
  portal_document_received: 'Upload',
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
  staffing_assigned: 'Nouvelle affectation',
  staffing_adjustment_requested: 'Demande d\'ajustement',
  staffing_response: 'Réponse d\'affectation',
  document_deposited: 'Pièce déposée',
  portal_document_received: 'Envoi client reçu',
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

  // Exact unread count across all notifications (not only the loaded page)
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      queryClient.setQueriesData({ queryKey: ['notifications', user?.id] }, (old: any) =>
        Array.isArray(old) ? old.map((n) => (n.id === id ? { ...n, is_read: true } : n)) : old);
      queryClient.setQueryData(['notifications', 'unread-count', user?.id], (c: number | undefined) =>
        Math.max(0, (c ?? 1) - 1));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
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
    onMutate: () => {
      queryClient.setQueryData(['notifications', 'unread-count', user?.id], 0);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const getNavigationPath = useCallback((notification: typeof notifications[0]) => {
    const { type, entity_type, entity_id } = notification;
    if (type === 'staffing_adjustment_requested') return '/staffing?tab=pending';
    if (type === 'staffing_response' || type === 'staffing_assigned') return '/staffing?tab=mine';
    if (type === 'document_deposited' || type === 'portal_document_received') return '/depots';
    if (type === 'timesheet_reminder') return '/timesheets';
    if (type === 'plan_submitted') return '/planning?tab=team';
    if (type === 'evaluation_assigned') return '/evaluations';
    if (type?.startsWith('evaluation_') && entity_id) return `/evaluations/${entity_id}`;
    if (type === 'new_evaluation') return '/evaluations';
    switch (entity_type) {
      case 'task': return entity_id ? `/projects/${entity_id}?tab=tasks` : null;
      case 'mission': return entity_id ? `/missions/${entity_id}` : '/missions';
      case 'project': return entity_id ? `/projects/${entity_id}` : null;
      case 'evaluation': return entity_id ? `/evaluations/${entity_id}` : '/evaluations';
      case 'client': return entity_id ? `/admin/clients/${entity_id}` : '/admin/clients';
      case 'obligation': return '/echeancier';
      case 'plan': return '/planning';
      case 'staffing': return '/staffing';
      case 'meeting': return '/calendar';
      case 'document': return '/documents';
      case 'conversation': return entity_id ? `/messages?c=${entity_id}` : '/messages';
      default: return '/notifications';
    }
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, getNavigationPath, ...rest };
}
