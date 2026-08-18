import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientMissions } from '@/hooks/useCRM';
import { downloadDocument } from '@/hooks/useDocuments';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';

function formatSize(bytes: number | null) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1048576).toFixed(1)} Mo`;
}

export default function ClientDocumentsTab({ clientId }: { clientId: string }) {
  const { data: missions } = useClientMissions(clientId);
  const missionIds = (missions ?? []).map((m: any) => m.id);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['client-documents', clientId, missionIds],
    queryFn: async () => {
      if (missionIds.length === 0) return [];
      const { data, error } = await supabase
        .from('documents')
        .select('*, uploader:profiles!documents_uploaded_by_fkey(full_name), mission:missions(name, code)')
        .in('mission_id', missionIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: missionIds.length > 0,
  });

  const { sorted, sort, handleSort } = useTableSort(documents ?? []);

  if (isLoading) return <Loading />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents associés</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Documents liés aux missions de ce client (contrats, propositions commerciales, livrables publiés).
        </p>
        {!documents?.length ? (
          <EmptyState icon={FileText} title="Aucun document" description="Aucun document trouvé dans les missions associées à ce client." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="name" currentSort={sort} onSort={handleSort}>Nom</SortableTableHead>
                <SortableTableHead sortKey="mission.name" currentSort={sort} onSort={handleSort}>Mission</SortableTableHead>
                <SortableTableHead sortKey="file_size" currentSort={sort} onSort={handleSort}>Taille</SortableTableHead>
                <SortableTableHead sortKey="status" currentSort={sort} onSort={handleSort}>Statut</SortableTableHead>
                <SortableTableHead sortKey="uploader.full_name" currentSort={sort} onSort={handleSort}>Ajouté par</SortableTableHead>
                <SortableTableHead sortKey="created_at" currentSort={sort} onSort={handleSort}>Date</SortableTableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((doc: any) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    {doc.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {doc.mission?.code || doc.mission?.name || '-'}
                  </TableCell>
                  <TableCell className="text-xs">{formatSize(doc.file_size)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{doc.status || 'brouillon'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{doc.uploader?.full_name || '-'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {doc.created_at ? format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr }) : '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadDocument(doc.file_path, doc.name)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
