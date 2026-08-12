import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PortalAccount {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  is_active: boolean;
  activated_at: string | null;
  last_seen_at: string | null;
  invited_at: string | null;
}

export interface PortalPendingInvitation {
  id: string;
  email: string;
  full_name: string | null;
  invited_at: string;
  expires_at: string;
  is_expired: boolean;
}

export interface ClientPortalAccess {
  accounts: PortalAccount[];
  pending_invitations: PortalPendingInvitation[];
}

export function useClientPortalAccess(clientId: string | undefined) {
  return useQuery<ClientPortalAccess>({
    queryKey: ['client-portal-access', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_portal_access', { _client_id: clientId! });
      if (error) throw error;
      const payload = data as unknown as ClientPortalAccess;
      return {
        accounts: payload?.accounts ?? [],
        pending_invitations: payload?.pending_invitations ?? [],
      };
    },
    enabled: !!clientId,
  });
}

export function useInvitePortalContact(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, fullName }: { email: string; fullName?: string }) => {
      const { data, error } = await supabase.functions.invoke('send-portal-invitation', {
        body: { client_id: clientId, email, full_name: fullName || null },
      });
      const payload = data as { success?: boolean; error?: string } | null;
      if (error || !payload?.success) {
        throw new Error(payload?.error ?? "L'invitation n'a pas pu être envoyée.");
      }
      return payload;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-portal-access', clientId] });
      toast.success('Invitation envoyée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTogglePortalAccess(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ portalUserId, activate, reason }: { portalUserId: string; activate: boolean; reason: string }) => {
      const { error } = await supabase.rpc('portal_toggle_access', {
        _portal_user_id: portalUserId,
        _activate: activate,
        _reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['client-portal-access', clientId] });
      toast.success(vars.activate ? 'Accès rétabli' : 'Accès révoqué');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelPortalInvitation(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('portal_invitations')
        .update({ status: 'revoked', revoked_at: new Date().toISOString() })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-portal-access', clientId] });
      toast.success('Invitation annulée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
