import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { useOfflineStore } from '@/stores/offlineStore';
import { useState } from 'react';
import { useOffline } from '@/hooks/useOffline';

const OfflineBanner = () => {
  const { isOnline, pendingCount } = useOfflineStore();
  const { syncNow } = useOffline();
  const [syncing, setSyncing] = useState(false);

  if (isOnline && pendingCount === 0) return null;

  const handleSync = async () => {
    setSyncing(true);
    await syncNow();
    setSyncing(false);
  };

  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${
      isOnline
        ? 'bg-warning/15 text-warning'
        : 'bg-destructive/15 text-destructive'
    }`}>
      {!isOnline && (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>Vous êtes hors ligne — les modifications seront synchronisées à la reconnexion</span>
        </>
      )}
      {isOnline && pendingCount > 0 && (
        <>
          <span>{pendingCount} action(s) en attente de synchronisation</span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1 underline hover:no-underline"
          >
            {syncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Synchroniser
          </button>
        </>
      )}
    </div>
  );
};

export default OfflineBanner;
