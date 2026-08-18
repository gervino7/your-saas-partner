import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PendingDeposit {
  document_id: string;
  label: string;
  file_name: string | null;
  file_path: string | null;
  deposited_at: string | null;
  deposited_by: string | null;
  source: string | null;
  client_id: string;
  client_name: string;
  period_id: string;
  period_label: string;
  obligation_code: string;
  obligation_label: string;
  due_date: string | null;
  is_late: boolean;
  assigned_to: string | null;
  assigned_name: string | null;
}

export interface FreeUpload {
  document_id: string;
  title: string | null;
  category: string | null;
  file_name: string | null;
  file_path: string | null;
  uploaded_at: string | null;
  client_id: string;
  client_name: string;
  uploaded_by: string | null;
}

export interface DepositsInbox {
  pending: PendingDeposit[];
  free_uploads: FreeUpload[];
  counts: { pending_total: number; pending_mine: number };
}

const EMPTY: DepositsInbox = { pending: [], free_uploads: [], counts: { pending_total: 0, pending_mine: 0 } };

export function useDepositsInbox(onlyMine = false) {
  return useQuery({
    queryKey: ['deposits-inbox', onlyMine],
    queryFn: async (): Promise<DepositsInbox> => {
      const { data, error } = await supabase.rpc('get_deposits_inbox', { _only_mine: onlyMine });
      if (error) throw error;
      const d = (data ?? {}) as Partial<DepositsInbox>;
      return {
        pending: d.pending ?? [],
        free_uploads: d.free_uploads ?? [],
        counts: d.counts ?? EMPTY.counts,
      };
    },
    refetchInterval: 120000,
  });
}

/** Badge de la barre latérale : nombre de pièces en attente de validation. */
export function usePendingDepositsCount() {
  const { data } = useDepositsInbox(false);
  return data?.counts.pending_total ?? 0;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['deposits-inbox'] });
  qc.invalidateQueries({ queryKey: ['echeancier'] });
  qc.invalidateQueries({ queryKey: ['obligations-kpis'] });
  qc.invalidateQueries({ queryKey: ['obligations-kpis-badge'] });
  qc.invalidateQueries({ queryKey: ['period-documents'] });
  qc.invalidateQueries({ queryKey: ['period-doc-counts'] });
}

export function useReviewDeposits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { documentIds: string[]; action: 'validate' | 'reject'; reason?: string }) => {
      const { data, error } = await supabase.rpc('review_deposited_documents', {
        _document_ids: vars.documentIds,
        _action: vars.action,
        _reason: vars.reason ?? null,
      });
      if (error) throw error;
      return data as { success: boolean; processed: number; action: string };
    },
    onSuccess: () => invalidateAll(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAttachFreeUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { portalDocumentId: string; obligationDocumentId: string }) => {
      const { data, error } = await supabase.rpc('attach_free_upload_to_obligation', {
        _portal_document_id: vars.portalDocumentId,
        _obligation_document_id: vars.obligationDocumentId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateAll(qc);
      toast.success('Pièce rattachée à la déclaration');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Pièces ouvertes d'un client, pour rattacher un envoi libre. */
export function useClientOpenObligationDocs(clientId: string | null) {
  return useQuery({
    queryKey: ['client-open-obligation-docs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obligation_documents')
        .select(`
          id, label, status,
          obligation_periods!inner (
            id, period_label, due_date, client_id,
            obligation_types!inner ( code, label )
          )
        `)
        .eq('obligation_periods.client_id', clientId!)
        .in('status', ['attendue', 'rejetee'])
        .order('label');
      if (error) throw error;
      return (data ?? []).map((row) => {
        const period = row.obligation_periods as unknown as {
          id: string; period_label: string; due_date: string | null;
          obligation_types: { code: string; label: string };
        };
        return {
          id: row.id as string,
          label: row.label as string,
          status: row.status as string,
          period_label: period?.period_label ?? '',
          due_date: period?.due_date ?? null,
          obligation_code: period?.obligation_types?.code ?? '',
          obligation_label: period?.obligation_types?.label ?? '',
        };
      });
    },
    enabled: !!clientId,
  });
}

/**
 * Les pièces déposées par le client vivent dans « portal-shared »,
 * celles enregistrées par le cabinet dans « documents ». Toujours signer.
 */
export async function getDepositUrl(path: string | null, source?: string | null): Promise<string | null> {
  if (!path) return null;
  const buckets = source === 'portail' ? ['portal-shared', 'documents'] : ['documents', 'portal-shared'];
  for (const bucket of buckets) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (data?.signedUrl) return data.signedUrl;
  }
  return null;
}
