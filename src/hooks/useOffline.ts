import { useEffect, useCallback } from 'react';
import { useOfflineStore } from '@/stores/offlineStore';
import { getPendingCount } from '@/lib/offlineDb';
import { processSyncQueue, refreshOfflineCache } from '@/lib/syncManager';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export function useOffline() {
  const { setOnline, setPendingCount, setLastSyncResult } = useOfflineStore();
  const userId = useAuthStore((s) => s.user?.id);

  const syncNow = useCallback(async () => {
    const count = await getPendingCount();
    if (count === 0) return;

    const result = await processSyncQueue();
    setLastSyncResult(result);
    setPendingCount(await getPendingCount());

    if (result.synced > 0 || result.errors > 0) {
      toast.info(
        `Synchronisation : ${result.synced} action(s) envoyée(s)${
          result.errors > 0 ? `, ${result.errors} erreur(s)` : ''
        }`
      );
    }

    // Refresh cache after sync
    if (userId) {
      await refreshOfflineCache(userId);
    }
  }, [userId, setLastSyncResult, setPendingCount]);

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      toast.success('Connexion rétablie — synchronisation en cours…');
      await syncNow();
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending count on mount
    getPendingCount().then(setPendingCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, setPendingCount, syncNow]);

  // Initial cache fill
  useEffect(() => {
    if (userId) {
      refreshOfflineCache(userId);
    }
  }, [userId]);

  return { syncNow };
}
