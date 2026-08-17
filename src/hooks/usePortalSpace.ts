import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeFileName, validateFile } from '@/lib/portalDocs';

export interface PortalDashboard {
  client_name: string | null;
  organization_name: string | null;
  organization_logo: string | null;
  pending_documents: number;
  new_documents: number;
  unpaid_invoices: number;
  next_deadline: { obligation: string; period_label: string; due_date: string; days_left: number } | null;
  next_meeting: { title: string; scheduled_at: string; meeting_link: string | null } | null;
}

export function usePortalDashboard() {
  return useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_dashboard');
      if (error) throw error;
      return data as unknown as PortalDashboard;
    },
    staleTime: 60 * 1000,
  });
}

export interface PortalObligation {
  id: string;
  obligation: string;
  category: string | null;
  period_label: string;
  due_date: string;
  days_left: number;
  is_late: boolean;
  client_status: string;
  documents_pending: number;
}

export function usePortalObligations() {
  return useQuery({
    queryKey: ['portal-obligations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_my_obligations');
      if (error) throw error;
      const payload = data as unknown as { upcoming?: PortalObligation[]; completed_count?: number };
      return { upcoming: payload?.upcoming ?? [], completed_count: payload?.completed_count ?? 0 };
    },
  });
}

export interface PortalObligationDoc {
  id: string;
  label: string;
  is_required: boolean;
  client_status: string;
  reject_reason: string | null;
  file_name: string | null;
  deposited_at: string | null;
}

export function usePortalObligationDocs(periodId: string | undefined) {
  return useQuery({
    queryKey: ['portal-obligation-docs', periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_obligation_documents', { _period_id: periodId! });
      if (error) throw error;
      return (data as unknown as PortalObligationDoc[]) ?? [];
    },
  });
}

export function useDepositObligationDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, file }: { documentId: string; file: File; periodId: string }) => {
      const invalid = validateFile(file);
      if (invalid) throw new Error(invalid);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Session expirée');
      const { data: me, error: meErr } = await supabase
        .from('portal_users')
        .select('client_id, organization_id')
        .eq('id', user.user.id)
        .maybeSingle();
      if (meErr) throw meErr;
      if (!me) throw new Error('Compte client introuvable');

      const path = `${me.organization_id}/${me.client_id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from('portal-shared')
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;

      const { error: rpcErr } = await supabase.rpc('portal_deposit_document', {
        _obligation_document_id: documentId,
        _file_path: path,
        _file_name: file.name,
      });
      if (rpcErr) {
        await supabase.storage.from('portal-shared').remove([path]);
        throw rpcErr;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['portal-obligation-docs', vars.periodId] });
      qc.invalidateQueries({ queryKey: ['portal-obligations'] });
      qc.invalidateQueries({ queryKey: ['portal-dashboard'] });
      toast.success('Pièce transmise à votre cabinet.');
    },
    onError: (e: Error) => toast.error(e.message || "L'envoi a échoué"),
  });
}

export interface PortalInvoiceLine {
  designation?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
}

export interface PortalInvoice {
  id: string;
  invoice_number: string;
  type: string | null;
  amount: number;
  tax_amount: number | null;
  total_amount: number;
  currency: string | null;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  is_overdue: boolean;
  line_items: PortalInvoiceLine[] | null;
}

export function usePortalInvoices() {
  return useQuery({
    queryKey: ['portal-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_my_invoices');
      if (error) throw error;
      const payload = data as unknown as {
        invoices?: PortalInvoice[];
        summary?: { total_due: number; overdue_count: number };
      };
      return {
        invoices: payload?.invoices ?? [],
        summary: payload?.summary ?? { total_due: 0, overdue_count: 0 },
      };
    },
  });
}

export interface PortalMeeting {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_link: string | null;
  type: string | null;
  status: string | null;
  client_summary: string | null;
  is_past: boolean;
}

export function usePortalMeetings() {
  return useQuery({
    queryKey: ['portal-meetings'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_my_meetings');
      if (error) throw error;
      return (data as unknown as PortalMeeting[]) ?? [];
    },
  });
}
