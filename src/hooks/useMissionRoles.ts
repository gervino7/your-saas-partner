import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export function useMissionRoles(userId?: string | null, enabled = true) {
  const profile = useAuthStore(s => s.profile);
  return useQuery({
    queryKey: ['mission-role-eligibility', profile?.organization_id, profile?.id, userId],
    enabled: enabled && !!userId && !!profile?.id,
    staleTime: 0,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('mission_roles_for_user', { _user_id: userId });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}