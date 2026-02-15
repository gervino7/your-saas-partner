import { create } from 'zustand';

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  dataSaverEnabled: boolean;
  lastSyncResult: { synced: number; errors: number } | null;
  setOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
  setDataSaverEnabled: (enabled: boolean) => void;
  setLastSyncResult: (result: { synced: number; errors: number } | null) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingCount: 0,
  dataSaverEnabled: typeof localStorage !== 'undefined'
    ? localStorage.getItem('mf_data_saver') === 'true'
    : false,
  lastSyncResult: null,
  setOnline: (isOnline) => set({ isOnline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setDataSaverEnabled: (dataSaverEnabled) => {
    localStorage.setItem('mf_data_saver', String(dataSaverEnabled));
    set({ dataSaverEnabled });
  },
  setLastSyncResult: (lastSyncResult) => set({ lastSyncResult }),
}));
