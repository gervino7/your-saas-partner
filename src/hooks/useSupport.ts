import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';

export const TICKET_STATUS_LABELS: Record<string, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  en_attente_client: 'En attente de votre réponse',
  resolu: 'Résolu',
  ferme: 'Fermé',
};

export const TICKET_STATUS_ORDER = ['ouvert', 'en_cours', 'en_attente_client', 'resolu', 'ferme'];

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  urgente: 'Urgente',
  haute: 'Haute',
  normale: 'Normale',
  basse: 'Basse',
};

export const TICKET_PRIORITY_ORDER = ['urgente', 'haute', 'normale', 'basse'];

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  question: 'Question',
  demande: 'Demande',
  facturation: 'Facturation',
  autre: 'Autre',
};

export interface Ticket {
  id: string;
  reference: string;
  organization_id: string | null;
  created_by: string | null;
  subject: string;
  description: string;
  category: string | null;
  priority: string | null;
  status: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name?: string | null;
  is_platform_side: boolean;
  is_internal_note: boolean;
  message: string;
  created_at: string | null;
}

// ── Côté cabinet ──
export function useMyTickets() {
  const orgId = useAuthStore((s) => s.profile?.organization_id);
  return useQuery({
    queryKey: ['support-tickets', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<Ticket[]> => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ticket[];
    },
  });
}

export function useTicket(ticketId?: string) {
  return useQuery({
    queryKey: ['support-ticket', ticketId],
    enabled: !!ticketId,
    queryFn: async (): Promise<{ ticket: Ticket; messages: TicketMessage[] }> => {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId!)
        .maybeSingle();
      if (error) throw error;
      if (!ticket) throw new Error('Demande introuvable');

      const { data: msgs, error: mErr } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true });
      if (mErr) throw mErr;

      const authorIds = Array.from(
        new Set([...(msgs ?? []).map((m: any) => m.author_id), ticket.created_by].filter(Boolean)),
      ) as string[];

      let names: Record<string, string> = {};
      if (authorIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', authorIds);
        names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
      }

      return {
        ticket: ticket as Ticket,
        messages: (msgs ?? []).map((m: any) => ({
          ...m,
          author_name: (m.author_id && names[m.author_id]) || (m.is_platform_side ? 'Support plateforme' : 'Cabinet'),
        })),
      };
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const profile = useAuthStore((s) => s.profile);
  return useMutation({
    mutationFn: async (payload: { subject: string; description: string; category: string; priority: string }) => {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          subject: payload.subject.trim(),
          description: payload.description.trim(),
          category: payload.category,
          priority: payload.priority,
          organization_id: profile?.organization_id ?? null,
          created_by: profile?.id ?? null,
        })
        .select('id, reference')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast({ title: 'Demande envoyée', description: `Référence ${d?.reference ?? ''}` });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

export function useReplyTicket() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      ticketId: string;
      message: string;
      isPlatformSide?: boolean;
      isInternalNote?: boolean;
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('support_ticket_messages').insert({
        ticket_id: payload.ticketId,
        author_id: auth.user?.id ?? null,
        message: payload.message.trim(),
        is_platform_side: !!payload.isPlatformSide,
        is_internal_note: !!payload.isInternalNote,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['support-ticket', v.ticketId] });
      qc.invalidateQueries({ queryKey: ['sa-tickets'] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

// ── Côté opérateur ──
export interface SuperAdminTicketRow {
  id: string;
  reference: string;
  subject: string;
  category: string | null;
  priority: string | null;
  status: string;
  organization_id: string | null;
  organization_name: string | null;
  created_by_name: string | null;
  created_by_email: string | null;
  message_count: number;
  last_message_at: string | null;
  created_at: string | null;
}

export function useSuperAdminTickets(status?: string | null) {
  return useQuery({
    queryKey: ['sa-tickets', status ?? 'all'],
    queryFn: async (): Promise<SuperAdminTicketRow[]> => {
      const { data, error } = await supabase.rpc('super_admin_tickets', { _status: status ?? null } as any);
      if (error) throw error;
      return (data ?? []) as SuperAdminTicketRow[];
    },
  });
}

/** Nombre de demandes ouvertes (hors résolu / fermé) - badge de navigation. */
export function useOpenTicketsCount() {
  const { data = [] } = useSuperAdminTickets(null);
  return data.filter((t) => t.status !== 'resolu' && t.status !== 'ferme').length;
}

export function useUpdateTicket() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      ticketId: string;
      status?: string;
      priority?: string;
      assigned_to?: string | null;
      resolution?: string;
      resolve?: boolean;
    }) => {
      const patch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (payload.status) patch.status = payload.status;
      if (payload.priority) patch.priority = payload.priority;
      if (payload.assigned_to !== undefined) patch.assigned_to = payload.assigned_to;
      if (payload.resolve) {
        patch.status = 'resolu';
        patch.resolved_at = new Date().toISOString();
        patch.resolution = payload.resolution ?? null;
      }
      const { error } = await supabase.from('support_tickets').update(patch).eq('id', payload.ticketId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast({ title: 'Demande mise à jour' });
      qc.invalidateQueries({ queryKey: ['support-ticket', v.ticketId] });
      qc.invalidateQueries({ queryKey: ['sa-tickets'] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}
