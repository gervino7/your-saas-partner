import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, FileUp, Inbox, Plus, RotateCcw, Share2, ShieldOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import { formatFileSize } from '@/lib/fileUtils';
import { categoryLabel } from '@/lib/portalDocs';
import {
  useClientSharedDocs,
  useDownloadSharedDoc,
  useWithdrawDocument,
  type SharedDoc,
} from '@/hooks/useClientDocuments';
import ShareDocumentDialog from './ShareDocumentDialog';

const fmt = (v: string | null) => (v ? format(new Date(v), 'dd MMM yyyy', { locale: fr }) : '-');

export default function ClientSharedDocsTab({ clientId }: { clientId: string }) {
  const { data, isLoading } = useClientSharedDocs(clientId);
  const download = useDownloadSharedDoc();
  const withdraw = useWithdrawDocument(clientId);
  const [shareOpen, setShareOpen] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<SharedDoc | null>(null);

  if (isLoading) return <Loading />;

  const shared = data?.shared ?? [];
  const received = data?.received ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Share2 className="h-5 w-5" /> Partagés avec le client
          </CardTitle>
          <Button size="sm" onClick={() => setShareOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Partager un document
          </Button>
        </CardHeader>
        <CardContent>
          {shared.length === 0 ? (
            <EmptyState icon={Share2} title="Aucun partage" description="Aucun document partagé avec ce client." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Partagé le</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead>Consulté</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shared.map((d) => (
                  <TableRow key={d.id} className={d.is_available ? '' : 'opacity-50'}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {d.title}
                        {!d.is_available && <Badge variant="secondary">Retiré</Badge>}
                      </div>
                      {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{categoryLabel(d.category)}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.file_name} <span className="whitespace-nowrap">({formatFileSize(d.file_size)})</span>
                    </TableCell>
                    <TableCell>{fmt(d.uploaded_at)}</TableCell>
                    <TableCell>{d.uploaded_by || '-'}</TableCell>
                    <TableCell>
                      {d.first_downloaded_at ? (
                        <span className="text-sm font-medium text-success">
                          Téléchargé le {fmt(d.first_downloaded_at)}
                          {(d.download_count ?? 0) > 1 ? ` (${d.download_count}×)` : ''}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-warning">Pas encore consulté</span>
                      )}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button variant="ghost" size="sm" onClick={() => download.mutate(d)}>
                        <Download className="mr-1 h-4 w-4" /> Télécharger
                      </Button>
                      {d.is_available ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setWithdrawTarget(d)}
                        >
                          <ShieldOff className="mr-1 h-4 w-4" /> Retirer du partage
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => withdraw.mutate({ documentId: d.id, restore: true })}
                        >
                          <RotateCcw className="mr-1 h-4 w-4" /> Rétablir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-5 w-5" /> Reçus du client
          </CardTitle>
        </CardHeader>
        <CardContent>
          {received.length === 0 ? (
            <EmptyState icon={FileUp} title="Aucun dépôt" description="Aucun document reçu de ce client." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Déposé le</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {received.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell><Badge variant="outline">{categoryLabel(d.category)}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.file_name} <span className="whitespace-nowrap">({formatFileSize(d.file_size)})</span>
                    </TableCell>
                    <TableCell>{fmt(d.uploaded_at)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{d.uploaded_by || '-'}</p>
                        {d.uploaded_by_email && <p className="text-xs text-muted-foreground">{d.uploaded_by_email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => download.mutate(d)}>
                        <Download className="mr-1 h-4 w-4" /> Télécharger
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ShareDocumentDialog clientId={clientId} open={shareOpen} onOpenChange={setShareOpen} />

      <Dialog open={!!withdrawTarget} onOpenChange={(o) => { if (!o) setWithdrawTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer du partage</DialogTitle>
            <DialogDescription>Le client n'aura plus accès à ce document.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawTarget(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={withdraw.isPending}
              onClick={async () => {
                if (!withdrawTarget) return;
                await withdraw.mutateAsync({ documentId: withdrawTarget.id, restore: false });
                setWithdrawTarget(null);
              }}
            >
              <ShieldOff className="mr-2 h-4 w-4" /> Retirer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
