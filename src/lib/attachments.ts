import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * The 'attachments' bucket is PRIVATE. Never call getPublicUrl on it.
 * Always generate a fresh signed URL on demand from the stored storage `path`.
 */
export async function getAttachmentDownloadUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data.signedUrl;
}

export async function downloadAttachment(file: { path?: string; name?: string }) {
  if (!file.path) {
    toast.error('Chemin du fichier manquant');
    return;
  }
  const url = await getAttachmentDownloadUrl(file.path);
  if (!url) {
    toast.error('Impossible de télécharger le fichier');
    return;
  }
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name ?? '';
  link.rel = 'noopener noreferrer';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
