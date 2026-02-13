import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { DocumentRow } from '@/hooks/useDocuments';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  doc: DocumentRow | null;
  open: boolean;
  onClose: () => void;
}

export default function AccessLogDialog({ doc, open, onClose }: Props) {
  const { data: logs = [] } = useQuery({
    queryKey: ['document_access_log', doc?.id],
    enabled: !!doc?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_access_log')
        .select('*, user:profiles!document_access_log_user_id_fkey(full_name)')
        .eq('document_id', doc!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  if (!doc) return null;

  const actionLabels: Record<string, string> = {
    view: 'Consultation',
    download: 'Téléchargement',
    edit: 'Modification',
    share: 'Partage',
    delete: 'Suppression',
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Historique d'accès — {doc.name}</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{log.user?.full_name || '—'}</TableCell>
                  <TableCell className="text-sm">{actionLabels[log.action] || log.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.created_at ? format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: fr }) : ''}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-4">Aucun accès enregistré</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
