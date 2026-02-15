import Dexie, { type Table } from 'dexie';

// ── Offline action queue item ──
export interface QueuedAction {
  id?: number;
  timestamp: number;
  action: 'insert' | 'update' | 'delete' | 'upsert';
  table: string;
  data: Record<string, unknown>;
  status: 'pending' | 'processing' | 'error' | 'done';
  error?: string;
}

// ── Cached entity shapes (lightweight) ──
export interface CachedTask {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  project_id: string | null;
  activity_id: string | null;
  description: string | null;
  estimated_hours: number | null;
  updated_at: string;
  _synced: boolean;
}

export interface CachedDocMeta {
  id: string;
  name: string;
  mime_type: string | null;
  file_size: number | null;
  status: string | null;
  project_id: string | null;
  mission_id: string | null;
  updated_at: string;
}

export interface CachedMessage {
  id: string;
  conversation_id: string;
  content: string;
  sender_id: string | null;
  created_at: string;
  _synced: boolean;
}

export interface CachedTimesheet {
  id: string;
  user_id: string;
  date: string;
  hours: number;
  mission_id: string | null;
  project_id: string | null;
  task_id: string | null;
  description: string | null;
  status: string;
  _synced: boolean;
}

export interface CachedNotification {
  id: string;
  title: string;
  content: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

// ── Database ──
class MissionFlowOfflineDB extends Dexie {
  tasks!: Table<CachedTask, string>;
  documents_metadata!: Table<CachedDocMeta, string>;
  messages!: Table<CachedMessage, string>;
  timesheets!: Table<CachedTimesheet, string>;
  notifications!: Table<CachedNotification, string>;
  syncQueue!: Table<QueuedAction, number>;

  constructor() {
    super('MissionFlowOffline');

    this.version(1).stores({
      tasks: 'id, status, project_id, updated_at',
      documents_metadata: 'id, project_id, mission_id, updated_at',
      messages: 'id, conversation_id, created_at',
      timesheets: 'id, user_id, date, status',
      notifications: 'id, is_read, created_at',
      syncQueue: '++id, status, timestamp',
    });
  }
}

export const offlineDb = new MissionFlowOfflineDB();

// ── Queue helpers ──
export async function enqueueAction(
  action: QueuedAction['action'],
  table: string,
  data: Record<string, unknown>,
) {
  await offlineDb.syncQueue.add({
    timestamp: Date.now(),
    action,
    table,
    data,
    status: 'pending',
  });
}

export async function getPendingActions() {
  return offlineDb.syncQueue.where('status').equals('pending').sortBy('timestamp');
}

export async function markActionDone(id: number) {
  await offlineDb.syncQueue.update(id, { status: 'done' });
}

export async function markActionError(id: number, error: string) {
  await offlineDb.syncQueue.update(id, { status: 'error', error });
}

export async function clearDoneActions() {
  await offlineDb.syncQueue.where('status').equals('done').delete();
}

export async function getPendingCount() {
  return offlineDb.syncQueue.where('status').equals('pending').count();
}
