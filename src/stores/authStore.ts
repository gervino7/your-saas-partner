import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  grade: string | null;
  grade_level: number | null;
  is_online: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ session: null, user: null, profile: null }),
}));
