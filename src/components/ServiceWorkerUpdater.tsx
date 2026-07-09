import { useEffect } from 'react';
// @ts-ignore - virtual module provided by vite-plugin-pwa
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function ServiceWorkerUpdater() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      if (r) {
        setInterval(() => {
          r.update().catch(() => {});
        }, 60_000);
      }
    },
    onRegisterError(error: unknown) {
      console.error('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
