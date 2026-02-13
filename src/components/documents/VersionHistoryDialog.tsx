import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentVersions, downloadDocument, DocumentRow } from '@/hooks/useDocuments';
import { useAuthStore } from '@/stores/authStore';
import { formatFileSize } from '@/lib/fileUtils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, RotateCcw } from 'lucide-react';

interface Props {
  doc: DocumentRow | null;
  open: boolean;
  onClose: () => void;
}

export default function VersionHistoryDialog({ doc, open, onClose }: Props) {
  const orgId = useAuthStore((s) => s.profile?.organization_id) || null;
  const { data: versions = [] } = useDocumentVersions(
    doc?.name || '',
    doc?.folder_id || null,
    orgId
  );

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Historique des versions — {doc.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div>
                <p className="text-sm font-medium">v{v.version}</p>
                <p className="text-xs text-muted-foreground">
                  {(v.uploader as any)?.full_name || '—'} · {v.created_at ? format(new Date(v.created_at), 'dd MMM yyyy HH:mm', { locale: fr }) : ''}
                </p>
                <p className="text-xs text-muted-foreground">{formatFileSize(v.file_size)}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadDocument(v.file_path, `${v.name}_v${v.version}`)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {versions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune version antérieure</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
