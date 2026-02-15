import { supabase } from '@/integrations/supabase/client';
import {
  offlineDb,
  getPendingActions,
  markActionDone,
  markActionError,
  clearDoneActions,
  type QueuedAction,
} from './offlineDb';

interface SyncResult {
  synced: number;
  errors: number;
}

async function processAction(action: QueuedAction): Promise<boolean> {
  const { table, data } = action;

  try {
    switch (action.action) {
      case 'insert': {
        const { error } = await supabase.from(table as any).insert(data as any);
        if (error) throw error;
        break;
      }
      case 'update': {
        const { id, ...rest } = data;
        const { error } = await supabase.from(table as any).update(rest as any).eq('id', id as string);
        if (error) throw error;
        break;
      }
      case 'upsert': {
        const { error } = await supabase.from(table as any).upsert(data as any);
        if (error) throw error;
        break;
      }
      case 'delete': {
        const { error } = await supabase.from(table as any).delete().eq('id', data.id as string);
        if (error) throw error;
        break;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function processSyncQueue(): Promise<SyncResult> {
  const pending = await getPendingActions();
  let synced = 0;
  let errors = 0;

  for (const action of pending) {
    const success = await processAction(action);
    if (success) {
      await markActionDone(action.id!);
      synced++;
    } else {
      await markActionError(action.id!, 'Sync failed');
      errors++;
    }
  }

  await clearDoneActions();
  return { synced, errors };
}

// ── Pull fresh data into IndexedDB ──
export async function refreshOfflineCache(userId: string) {
  try {
    // Tasks assigned to user
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, project_id, activity_id, description, estimated_hours, updated_at')
      .eq('created_by', userId)
      .limit(500);

    if (tasks?.length) {
      await offlineDb.tasks.bulkPut(
        tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status ?? 'todo',
          priority: t.priority,
          due_date: t.due_date,
          project_id: t.project_id,
          activity_id: t.activity_id,
          description: t.description,
          estimated_hours: t.estimated_hours,
          updated_at: t.updated_at ?? new Date().toISOString(),
          _synced: true,
        }))
      );
    }

    // Recent notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('id, title, content, type, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notifs?.length) {
      await offlineDb.notifications.bulkPut(notifs.map((n) => ({ ...n, is_read: n.is_read ?? false })));
    }
  } catch {
    // Silently fail — we're probably offline
  }
}
