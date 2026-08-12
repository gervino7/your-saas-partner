import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AccountType = 'portal_client' | 'staff';

export interface AccountTypeResult {
  type: AccountType;
  clientId: string | null;
}

export function useAccountType() {
  return useQuery<AccountTypeResult>({
    queryKey: ['account-type'],
    queryFn: async () => {
      const { data: isPortal } = await supabase.rpc('is_portal_user');
      if (isPortal) {
        const { data: clientId } = await supabase.rpc('current_portal_client');
        const result: AccountTypeResult = { type: 'portal_client', clientId: (clientId as string) ?? null };
        console.log('[AccountType]', { ...result, path: window.location.pathname });
        return result;
      }
      const result: AccountTypeResult = { type: 'staff', clientId: null };
      console.log('[AccountType]', { ...result, path: window.location.pathname });
      return result;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
