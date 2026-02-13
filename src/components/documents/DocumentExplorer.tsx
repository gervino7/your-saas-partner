import { useState, useMemo } from 'react';
import { Upload, FolderPlus, LayoutGrid, List, Search, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDocuments, useDocumentFolders, useDeleteDocument, useCreateFolder, downloadDocument, logDocumentAccess, DocumentRow } from '@/hooks/useDocuments';
import { useAuthStore } from '@/stores/authStore';
import FolderTree from './FolderTree';
import DocumentGridView from './DocumentGridView';
import DocumentListView from './DocumentListView';
import UploadZone from './UploadZone';
import VersionHistoryDialog from './VersionHistoryDialog';
import AccessLogDialog from './AccessLogDialog';
import ShareDialog from './ShareDialog';
import DocumentStatusBadge from './DocumentStatusBadge';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';

interface DocumentExplorerProps {
  missionId?: string;
  projectId?: string;
  activityId?: string;
}

export default function DocumentExplorer({ missionId, projectId, activityId }: DocumentExplorerProps) {
  const profile = useAuthStore((s) => s.profile);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir] = useState<'asc' | 'desc'>('desc');
  const [showUpload, setShowUpload] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ type: string; doc: DocumentRow } | null>(null);

  const { data: folders = [], isLoading: foldersLoading } = useDocumentFolders({
    projectId,
    organizationId: profile?.organization_id || undefined,
  });

  const { data: documents = [], isLoading: docsLoading } = useDocuments({
    missionId,
    projectId,
    activityId,
    folderId: selectedFolderId,
    search,
    statusFilter,
    sortBy,
    sortDir,
  });

  const deleteDoc = useDeleteDocument();

  // Compute document counts per folder
  const { data: allDocs = [] } = useDocuments({
    missionId,
    projectId,
    activityId,
    sortBy: 'created_at',
    sortDir: 'desc',
  });

  const docCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allDocs.forEach((d) => {
      if (d.folder_id) counts[d.folder_id] = (counts[d.folder_id] || 0) + 1;
    });
    return counts;
  }, [allDocs]);

  const handleAction = async (action: string, doc: DocumentRow) => {
    switch (action) {
      case 'download':
        await logDocumentAccess(doc.id, 'download');
        await downloadDocument(doc.file_path, doc.name);
        break;
      case 'delete':
        if (confirm('Supprimer ce document ?')) {
          deleteDoc.mutate({ id: doc.id, file_path: doc.file_path });
        }
        break;
      case 'preview':
        await logDocumentAccess(doc.id, 'view');
        setActionDialog({ type: 'preview', doc });
        break;
      case 'versions':
        setActionDialog({ type: 'versions', doc });
        break;
      case 'access_log':
        setActionDialog({ type: 'access_log', doc });
        break;
      case 'share':
        setActionDialog({ type: 'share', doc });
        break;
      default:
        break;
    }
  };

  const previewDoc = actionDialog?.type === 'preview' ? actionDialog.doc : null;

  if (foldersLoading) return <Loading />;

  return (
    <div className="flex gap-4 h-full min-h-[500px]">
      {/* Folder tree - left panel */}
      <div className="w-56 shrink-0 border-r pr-3 overflow-y-auto hidden md:block">
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          projectId={projectId}
          documentCounts={docCounts}
        />
      </div>

      {/* Main panel */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-1" /> Upload
          </Button>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="in_review">En revue</SelectItem>
              <SelectItem value="approved">Approuvé</SelectItem>
              <SelectItem value="published">Publié</SelectItem>
              <SelectItem value="archived">Archivé</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue placeholder="Tri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date</SelectItem>
              <SelectItem value="name">Nom</SelectItem>
              <SelectItem value="file_size">Taille</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Documents */}
        {docsLoading ? (
          <Loading />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun document"
            description={search ? 'Aucun document ne correspond à votre recherche.' : 'Uploadez votre premier document.'}
            actionLabel="Uploader"
            onAction={() => setShowUpload(true)}
          />
        ) : viewMode === 'grid' ? (
          <DocumentGridView documents={documents} onAction={handleAction} />
        ) : (
          <DocumentListView documents={documents} onAction={handleAction} />
        )}
      </div>

      {/* Upload dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Uploader des documents</DialogTitle>
          </DialogHeader>
          <UploadZone
            folderId={selectedFolderId}
            missionId={missionId}
            projectId={projectId}
            activityId={activityId}
          />
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setActionDialog(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                {previewDoc.name}
                <DocumentStatusBadge status={previewDoc.status} />
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-auto">
              {previewDoc.mime_type?.startsWith('image/') ? (
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/documents/${previewDoc.file_path}`}
                  alt={previewDoc.name}
                  className="max-w-full rounded-md"
                />
              ) : previewDoc.mime_type === 'application/pdf' ? (
                <iframe
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/documents/${previewDoc.file_path}`}
                  className="w-full h-[60vh] rounded-md"
                  title={previewDoc.name}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Aperçu non disponible pour ce type de fichier.</p>
                  <Button variant="outline" className="mt-4" onClick={() => handleAction('download', previewDoc)}>
                    Télécharger le fichier
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Version history dialog */}
      <VersionHistoryDialog
        doc={actionDialog?.type === 'versions' ? actionDialog.doc : null}
        open={actionDialog?.type === 'versions'}
        onClose={() => setActionDialog(null)}
      />

      {/* Access log dialog */}
      <AccessLogDialog
        doc={actionDialog?.type === 'access_log' ? actionDialog.doc : null}
        open={actionDialog?.type === 'access_log'}
        onClose={() => setActionDialog(null)}
      />

      {/* Share dialog */}
      <ShareDialog
        doc={actionDialog?.type === 'share' ? actionDialog.doc : null}
        open={actionDialog?.type === 'share'}
        onClose={() => setActionDialog(null)}
      />
    </div>
  );
}
