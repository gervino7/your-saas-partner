import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineStore } from '@/stores/offlineStore';

/**
 * Pauses realtime subscriptions when the tab is not visible
 * and when data saver mode is on for non-essential channels.
 */
export function useVisibilityRealtime() {
  const dataSaver = useOfflineStore((s) => s.dataSaverEnabled);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Unsubscribe all channels when tab hidden
        channelsRef.current = supabase.getChannels();
        if (dataSaver) {
          channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
        }
      }
      // Channels re-subscribe automatically when components re-mount
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [dataSaver]);
}
