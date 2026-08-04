import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PeriodDocument {
  id: string;
  label: string;
  is_required: boolean;
  status: string;
  source: string | null;
  file_name: string | null;
  file_path?: string | null;
  document_id: string | null;
  deposited_at: string | null;
  deposited_by_contact: string | null;
  validated_at: string | null;
  validated_by_name?: string | null;
  reject_reason: string | null;
}

export interface PeriodDocProgress {
  total_required: number;
  received_required: number;
  pending_validation: number;
}

export function usePeriodDocuments(periodId: string | undefined) {
  return useQuery({
    queryKey: ['period-documents', periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_period_documents', {
        _period_id: periodId!,
      });
      if (error) throw error;
      const payload = (data ?? {}) as {
        documents?: PeriodDocument[];
        progress?: PeriodDocProgress;
      };
      const documents = payload.documents ?? [];

      // The RPC does not expose file_path / validator name — fetch them in one go.
      let extras: Record<string, { file_path: string | null; validator: string | null }> = {};
      if (documents.length) {
        const { data: rows } = await supabase
          .from('obligation_documents')
          .select('id, file_path, validated_by_profile:profiles!obligation_documents_validated_by_fkey(full_name)')
          .eq('obligation_period_id', periodId!);
        extras = Object.fromEntries(
          (rows ?? []).map((r: Record<string, unknown>) => [
            r.id as string,
            {
              file_path: (r.file_path as string) ?? null,
              validator: ((r.validated_by_profile as { full_name?: string } | null)?.full_name) ?? null,
            },
          ]),
        );
      }

      return {
        documents: documents.map((d) => ({
          ...d,
          file_path: extras[d.id]?.file_path ?? null,
          validated_by_name: extras[d.id]?.validator ?? null,
        })),
        progress: payload.progress ?? { total_required: 0, received_required: 0, pending_validation: 0 },
      };
    },
  });
}

export function useGenerateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      const { data, error } = await supabase.rpc('generate_period_documents', {
        _period_id: periodId,
      });
      if (error) throw error;
      return (data ?? 0) as number;
    },
    onSuccess: (_, periodId) => {
      qc.invalidateQueries({ queryKey: ['period-documents', periodId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, periodId, ...values }: {
      id: string;
      periodId: string;
      status?: string;
      source?: string | null;
      file_path?: string | null;
      file_name?: string | null;
      document_id?: string | null;
      notes?: string | null;
      reject_reason?: string | null;
      validated_at?: string | null;
      validated_by?: string | null;
    }) => {
      // organization_id is filled by a database trigger — never send it.
      const payload = { ...values } as Record<string, unknown>;
      delete payload.organization_id;
      const { error } = await supabase
        .from('obligation_documents')
        .update(payload as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['period-documents', vars.periodId] });
      qc.invalidateQueries({ queryKey: ['period-doc-counts'] });
      qc.invalidateQueries({ queryKey: ['echeancier'] });
      qc.invalidateQueries({ queryKey: ['obligation-period', vars.periodId] });
      qc.invalidateQueries({ queryKey: ['obligations-kpis'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddManualDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { periodId: string; label: string; is_required: boolean }) => {
      const { error } = await supabase.from('obligation_documents').insert({
        obligation_period_id: values.periodId,
        label: values.label,
        is_required: values.is_required,
        status: 'attendue',
      } as never);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['period-documents', vars.periodId] });
      qc.invalidateQueries({ queryKey: ['period-doc-counts'] });
      toast.success('Pièce ajoutée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface DocCounts {
  total: number;
  received: number;
  pending_validation: number;
}

/** Batched counts for the échéancier rows (no N+1). */
export function usePeriodDocCounts(periodIds: string[]) {
  const key = [...periodIds].sort().join(',');
  return useQuery({
    queryKey: ['period-doc-counts', key],
    enabled: periodIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obligation_documents')
        .select('obligation_period_id, status, is_required')
        .in('obligation_period_id', periodIds);
      if (error) throw error;
      const map: Record<string, DocCounts> = {};
      for (const r of (data ?? []) as Array<{ obligation_period_id: string; status: string; is_required: boolean }>) {
        const c = (map[r.obligation_period_id] ??= { total: 0, received: 0, pending_validation: 0 });
        if (r.is_required) {
          c.total += 1;
          if (r.status === 'recue') c.received += 1;
        }
        if (r.status === 'deposee') c.pending_validation += 1;
      }
      return map;
    },
  });
}

// ── Référentiel : pièces types par obligation ──
export function useObligationDocTypes(obligationTypeId: string | undefined) {
  return useQuery({
    queryKey: ['obligation-doc-types', obligationTypeId],
    enabled: !!obligationTypeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obligation_document_types')
        .select('*')
        .eq('obligation_type_id', obligationTypeId!)
        .order('sort_order')
        .order('label');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertDocType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      id?: string;
      obligation_type_id: string;
      label: string;
      is_required: boolean;
      sort_order: number;
    }) => {
      const { error } = await supabase.from('obligation_document_types').upsert(values as never);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['obligation-doc-types', v.obligation_type_id] });
      toast.success('Pièce type enregistrée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDocType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; obligation_type_id: string }) => {
      const { error } = await supabase.from('obligation_document_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['obligation-doc-types', v.obligation_type_id] });
      toast.success('Pièce type supprimée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSeedDocTypes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase.rpc('seed_obligation_documents', { _org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['obligation-doc-types'] });
      toast.success('Pièces types réinitialisées');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Private 'documents' bucket — always sign, never getPublicUrl. */
export async function getObligationDocUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data.signedUrl;
}
