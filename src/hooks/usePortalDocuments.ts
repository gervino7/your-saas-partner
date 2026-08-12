import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeFileName } from '@/lib/portalDocs';

export interface PortalReceivedDoc {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_name: string;
  file_size: number | null;
  uploaded_at: string;
  first_downloaded_at: string | null;
}

export interface PortalSentDoc {
  id: string;
  title: string;
  category: string | null;
  file_name: string;
  uploaded_at: string;
}

export function usePortalIdentity() {
  return useQuery({
    queryKey: ['portal-identity'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const { data, error } = await supabase
        .from('portal_users')
        .select('id, client_id, organization_id, full_name, email')
        .eq('id', user.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useMyPortalDocuments() {
  return useQuery({
    queryKey: ['portal-my-documents'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_my_documents');
      if (error) throw error;
      const payload = data as unknown as { received?: PortalReceivedDoc[]; sent?: PortalSentDoc[] };
      return { received: payload?.received ?? [], sent: payload?.sent ?? [] };
    },
  });
}

export function useDownloadPortalDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data: doc, error: docErr } = await supabase
        .from('portal_documents')
        .select('file_path, file_name')
        .eq('id', documentId)
        .maybeSingle();
      if (docErr) throw docErr;
      if (!doc) throw new Error('Document introuvable');

      const { data: signed, error: signErr } = await supabase.storage
        .from('portal-shared')
        .createSignedUrl(doc.file_path, 3600);
      if (signErr || !signed?.signedUrl) throw signErr ?? new Error('Lien indisponible');

      await supabase.rpc('portal_mark_downloaded', { _document_id: documentId });

      const link = document.createElement('a');
      link.href = signed.signedUrl;
      link.download = doc.file_name;
      link.rel = 'noopener noreferrer';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-my-documents'] }),
    onError: (e: Error) => toast.error(e.message || 'Téléchargement impossible'),
  });
}

export function useUploadPortalDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: File; title: string; category: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Session expirée');
      const { data: me, error: meErr } = await supabase
        .from('portal_users')
        .select('client_id, organization_id')
        .eq('id', user.user.id)
        .maybeSingle();
      if (meErr) throw meErr;
      if (!me) throw new Error('Compte client introuvable');

      const path = `${me.organization_id}/${me.client_id}/${crypto.randomUUID()}-${sanitizeFileName(input.file.name)}`;
      const { error: upErr } = await supabase.storage
        .from('portal-shared')
        .upload(path, input.file, { contentType: input.file.type || undefined, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from('portal_documents').insert({
        client_id: me.client_id,
        direction: 'from_client',
        title: input.title,
        category: input.category,
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
      qc.invalidateQueries({ queryKey: ['portal-my-documents'] });
      toast.success('Document transmis à votre cabinet.');
    },
    onError: (e: Error) => toast.error(e.message || "L'envoi a échoué"),
  });
}
