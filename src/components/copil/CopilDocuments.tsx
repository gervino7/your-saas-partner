import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Upload, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmptyState from '@/components/common/EmptyState';

interface Props {
  committeeId: string;
  missionId: string;
  canManage: boolean;
}

const CopilDocuments = ({ committeeId, missionId, canManage }: Props) => {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['copil-documents', committeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, file_path, mime_type, file_size, created_at, status, version, uploaded_by, profiles:profiles!documents_uploaded_by_fkey(full_name)')
        .eq('committee_id', committeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !profile) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const filePath = `${profile.organization_id}/copil/${committeeId}/${Date.now()}_${file.name}`;

        const { error: storageError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from('documents').insert({
          name: file.name,
          file_path: filePath,
          mime_type: file.type,
          file_size: file.size,
          mission_id: missionId,
          organization_id: profile.organization_id,
          uploaded_by: profile.id,
          committee_id: committeeId,
          status: 'published',
        });

        if (dbError) throw dbError;
      }

      toast.success(`${files.length} document(s) ajouté(s)`);
      queryClient.invalidateQueries({ queryKey: ['copil-documents', committeeId] });
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [committeeId, missionId, profile, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['copil-documents', committeeId] });
      toast.success('Document supprimé');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1048576).toFixed(1)} Mo`;
  };

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Documents partagés avec les membres externes du COPIL via le portail.
          </p>
          {canManage && (
            <div className="relative">
              <input
                type="file"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button size="sm" disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                Ajouter
              </Button>
            </div>
          )}
        </div>

        {!documents || documents.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun document COPIL" description="Ajoutez des documents à partager avec les membres externes." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Ajouté par</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Taille</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc: any) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{doc.name}</span>
                      <Badge variant="secondary" className="text-xs">{doc.status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(doc.profiles as any)?.full_name || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatSize(doc.file_size)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default CopilDocuments;
