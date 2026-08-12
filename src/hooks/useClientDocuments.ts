import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeFileName } from '@/lib/portalDocs';

export interface SharedDoc {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
  first_downloaded_at: string | null;
  download_count: number | null;
  is_available: boolean;
}

export interface ReceivedDoc {
  id: string;
  title: string;
  category: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
  uploaded_by: string | null;
  uploaded_by_email: string | null;
}

export function useClientSharedDocs(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-shared-docs', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_shared_documents', { _client_id: clientId! });
      if (error) throw error;
      const payload = data as unknown as { shared?: SharedDoc[]; received?: ReceivedDoc[] };
      return { shared: payload?.shared ?? [], received: payload?.received ?? [] };
    },
    enabled: !!clientId,
  });
}

export function useShareDocument(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; title: string; category: string; description?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Session expirée');
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.user.id)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile?.organization_id) throw new Error('Organisation introuvable');

      const path = `${profile.organization_id}/${clientId}/${crypto.randomUUID()}-${sanitizeFileName(input.file.name)}`;
      const { error: upErr } = await supabase.storage
        .from('portal-shared')
        .upload(path, input.file, { contentType: input.file.type || undefined, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('portal_documents').insert({
        client_id: clientId,
        direction: 'to_client',
        title: input.title,
        category: input.category,
        description: input.description || null,
        file_path: path,
        file_name: input.file.name,
        file_size: input.file.size,
        mime_type: input.file.type || null,
      } as never);
      if (insErr) {
        await supabase.storage.from('portal-shared').remove([path]);
        throw insErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-shared-docs', clientId] });
      toast.success('Document partagé');
    },
    onError: (e: Error) => toast.error(e.message || 'Le partage a échoué'),
  });
}

export function useWithdrawDocument(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, restore }: { documentId: string; restore: boolean }) => {
      const { error } = await supabase.rpc('portal_withdraw_document', {
        _document_id: documentId,
        _restore: restore,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['client-shared-docs', clientId] });
      toast.success(vars.restore ? 'Document rétabli' : 'Document retiré du partage');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDownloadSharedDoc() {
  return useMutation({
    mutationFn: async (doc: { file_path: string; file_name: string }) => {
      const { data, error } = await supabase.storage
        .from('portal-shared')
        .createSignedUrl(doc.file_path, 3600);
      if (error || !data?.signedUrl) throw error ?? new Error('Lien indisponible');
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = doc.file_name;
      link.rel = 'noopener noreferrer';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    onError: (e: Error) => toast.error(e.message || 'Téléchargement impossible'),
  });
}

export interface PortalLogEntry {
  id: string;
  action: string;
  created_at: string;
  details: unknown;
  portal_users: { full_name: string | null; email: string } | null;
}

export function usePortalAccessLog(clientId: string | undefined) {
  return useQuery<PortalLogEntry[]>({
    queryKey: ['portal-access-log', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_access_log')
        .select('id, action, created_at, details, portal_users(full_name, email)')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as PortalLogEntry[];
    },
    enabled: !!clientId,
  });
}
