import { useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  HardDrive, Upload, FolderPlus, RefreshCw, Settings, ChevronRight,
  File, Folder, FolderOpen, Download, Trash2, Pencil, MoreHorizontal,
  AlertTriangle, Clock, CheckCircle2, XCircle, ArrowUpCircle, ArrowDownCircle,
  Search, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/authStore';
import {
  useWorkspace, useWorkspaceFiles, useWorkspacePendingFiles,
  useUploadWorkspaceFile, useCreateWorkspaceFolder,
  useDeleteWorkspaceFile, useRenameWorkspaceFile,
  useUpdateWorkspaceSettings, useForceSync,
  downloadWorkspaceFile, useSubordinates,
  WorkspaceFile
} from '@/hooks/useWorkspace';
import { formatFileSize } from '@/lib/fileUtils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Loading from '@/components/common/Loading';
import EmptyState from '@/components/common/EmptyState';
import { supabase } from '@/integrations/supabase/client';

function formatDate(d: string | null) {
  if (!d) return '—';
  return format(new Date(d), 'dd MMM yyyy HH:mm', { locale: fr });
}

const syncStatusConfig: Record<string, { label: string; icon: any; color: string }> = {
  synced: { label: 'Synchronisé', icon: CheckCircle2, color: 'text-emerald-500' },
  pending_upload: { label: 'En attente d\'upload', icon: ArrowUpCircle, color: 'text-amber-500' },
  pending_download: { label: 'En attente de téléchargement', icon: ArrowDownCircle, color: 'text-blue-500' },
  conflict: { label: 'Conflit', icon: AlertTriangle, color: 'text-destructive' },
  error: { label: 'Erreur', icon: XCircle, color: 'text-destructive' },
};

export default function WorkspacePage() {
  const { userId } = useParams<{ userId?: string }>();
  const profile = useAuthStore((s) => s.profile);
  const isOwnWorkspace = !userId || userId === profile?.id;
  const targetUserId = userId || profile?.id;

  const { data: workspace, isLoading: wsLoading } = useWorkspace(targetUserId);
  const [currentPath, setCurrentPath] = useState('/');
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingFile, setRenamingFile] = useState<WorkspaceFile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [viewingUserId, setViewingUserId] = useState<string | null>(userId || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: files = [], isLoading: filesLoading } = useWorkspaceFiles(workspace?.id, currentPath);
  const { data: pendingFiles = [] } = useWorkspacePendingFiles(workspace?.id);
  const { data: subordinates = [] } = useSubordinates();

  const uploadFile = useUploadWorkspaceFile();
  const createFolder = useCreateWorkspaceFolder();
  const deleteFile = useDeleteWorkspaceFile();
  const renameFile = useRenameWorkspaceFile();
  const updateSettings = useUpdateWorkspaceSettings();
  const forceSync = useForceSync();

  // Target user profile for banner
  const [targetProfile, setTargetProfile] = useState<any>(null);
  if (!isOwnWorkspace && !targetProfile) {
    supabase.from('profiles').select('full_name, grade').eq('id', targetUserId!).single()
      .then(({ data }) => setTargetProfile(data));
  }

  const handleUpload = useCallback(async (fileList: FileList) => {
    if (!workspace) return;
    for (const file of Array.from(fileList)) {
      await uploadFile.mutateAsync({ workspaceId: workspace.id, file, folderPath: currentPath });
    }
  }, [workspace, currentPath, uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isOwnWorkspace) return;
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  }, [handleUpload, isOwnWorkspace]);

  const handleCreateFolder = () => {
    if (!workspace || !newFolderName.trim()) return;
    createFolder.mutate(
      { workspaceId: workspace.id, name: newFolderName.trim(), folderPath: currentPath },
      { onSuccess: () => { setShowNewFolder(false); setNewFolderName(''); } }
    );
  };

  const handleRename = () => {
    if (!renamingFile || !renameValue.trim()) return;
    renameFile.mutate({ id: renamingFile.id, name: renameValue.trim() }, {
      onSuccess: () => setRenamingFile(null),
    });
  };

  const navigateToFolder = (folder: WorkspaceFile) => {
    setCurrentPath(currentPath === '/' ? `/${folder.file_name}` : `${currentPath}/${folder.file_name}`);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? '/' : '/' + parts.join('/'));
  };

  const breadcrumbs = currentPath === '/' ? ['Racine'] : ['Racine', ...currentPath.split('/').filter(Boolean)];

  const storageUsedPct = workspace ? Math.min(100, (workspace.storage_used / workspace.storage_limit) * 100) : 0;

  const filteredFiles = search
    ? files.filter(f => f.file_name.toLowerCase().includes(search.toLowerCase()))
    : files;

  const settings = workspace?.settings || {};

  if (wsLoading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <HardDrive className="h-6 w-6" />
            {isOwnWorkspace ? 'Mon Bureau' : `Bureau de ${targetProfile?.full_name || '...'}`}
          </h1>
          {workspace?.last_sync_at && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3.5 w-3.5" />
              Dernière synchronisation : {formatDate(workspace.last_sync_at)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Subordinate selector */}
          {subordinates.length > 0 && (
            <Select
              value={viewingUserId || ''}
              onValueChange={(v) => {
                setViewingUserId(v || null);
                window.location.href = v ? `/workspace/${v}` : '/workspace';
              }}
            >
              <SelectTrigger className="w-52 h-9">
                <SelectValue placeholder="Voir le bureau de..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Mon bureau</SelectItem>
                {subordinates.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name} ({s.grade || '—'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isOwnWorkspace && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-1" /> Paramètres
              </Button>
              <Button variant="outline" size="sm" disabled>
                <RefreshCw className="h-4 w-4 mr-1" /> Synchroniser
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Banner when viewing subordinate */}
      {!isOwnWorkspace && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Vous consultez le bureau de <strong>{targetProfile?.full_name}</strong>. Les actions d'écriture sont désactivées.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Espace utilisé</p>
            <div className="flex items-end gap-2">
              <span className="text-lg font-semibold">{formatFileSize(workspace?.storage_used || 0)}</span>
              <span className="text-xs text-muted-foreground">/ {formatFileSize(workspace?.storage_limit || 0)}</span>
            </div>
            <Progress value={storageUsedPct} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">Fichiers</p>
            <span className="text-lg font-semibold">{files.filter(f => !f.is_folder).length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground mb-1">En attente de sync</p>
            <span className="text-lg font-semibold">{pendingFiles.length}</span>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <Tabs defaultValue="explorer">
        <TabsList>
          <TabsTrigger value="explorer">Explorateur</TabsTrigger>
          <TabsTrigger value="pending">
            En attente {pendingFiles.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{pendingFiles.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explorer" className="mt-4 space-y-3">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {isOwnWorkspace && (
              <>
                <Button size="sm" onClick={() => inputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Upload
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowNewFolder(true)}>
                  <FolderPlus className="h-4 w-4 mr-1" /> Dossier
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleUpload(e.target.files)}
                />
              </>
            )}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <button
                  className="hover:text-accent transition-colors"
                  onClick={() => {
                    if (i === 0) setCurrentPath('/');
                    else setCurrentPath('/' + breadcrumbs.slice(1, i + 1).join('/'));
                  }}
                >
                  {part}
                </button>
              </span>
            ))}
          </div>

          {/* File list */}
          <div
            className="border rounded-lg overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={handleDrop}
          >
            {filesLoading ? <Loading /> : filteredFiles.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                {currentPath !== '/' && (
                  <Button variant="ghost" size="sm" onClick={navigateUp} className="mb-2">
                    ← Dossier parent
                  </Button>
                )}
                <p>Aucun fichier dans ce dossier</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden sm:table-cell">Taille</TableHead>
                    <TableHead className="hidden md:table-cell">Modifié</TableHead>
                    <TableHead className="hidden md:table-cell">Sync</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentPath !== '/' && (
                    <TableRow className="cursor-pointer hover:bg-accent/5" onClick={navigateUp}>
                      <TableCell className="flex items-center gap-2 text-muted-foreground">
                        <FolderOpen className="h-4 w-4" /> ..
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  )}
                  {filteredFiles.map((file) => {
                    const sync = syncStatusConfig[file.sync_status || 'synced'] || syncStatusConfig.synced;
                    const SyncIcon = sync.icon;
                    return (
                      <TableRow
                        key={file.id}
                        className={file.is_folder ? 'cursor-pointer' : ''}
                        onClick={() => file.is_folder && navigateToFolder(file)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {file.is_folder ? (
                              <Folder className="h-4 w-4 text-accent shrink-0" />
                            ) : (
                              <File className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{file.file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {file.is_folder ? '—' : formatFileSize(file.file_size || 0)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {formatDate(file.last_modified_remote || file.updated_at)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={`flex items-center gap-1 text-xs ${sync.color}`}>
                            <SyncIcon className="h-3.5 w-3.5" /> {sync.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isOwnWorkspace && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!file.is_folder && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); downloadWorkspaceFile(file.file_path, file.file_name); }}>
                                    <Download className="h-3.5 w-3.5 mr-2" /> Télécharger
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenamingFile(file); setRenameValue(file.file_name); }}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Renommer
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer ?')) deleteFile.mutate(file); }}>
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {!isOwnWorkspace && !file.is_folder && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); downloadWorkspaceFile(file.file_path, file.file_name); }}>
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {pendingFiles.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Tout est synchronisé" description="Aucun fichier en attente de synchronisation." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingFiles.map((file) => {
                  const sync = syncStatusConfig[file.sync_status || 'synced'] || syncStatusConfig.synced;
                  const SyncIcon = sync.icon;
                  return (
                    <TableRow key={file.id}>
                      <TableCell className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground" />
                        {file.file_name}
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 text-sm ${sync.color}`}>
                          <SyncIcon className="h-4 w-4" /> {sync.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isOwnWorkspace && (
                          <Button size="sm" variant="outline" onClick={() => forceSync.mutate(file.id)}>
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Forcer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* New folder dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Nouveau dossier</DialogTitle>
          </DialogHeader>
          <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Nom du dossier" onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>Annuler</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renamingFile} onOpenChange={() => setRenamingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Renommer</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRename()} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingFile(null)}>Annuler</Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>Renommer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Paramètres de synchronisation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Chemin du répertoire local</Label>
              <Input value={workspace?.sync_folder_path || '~/MissionFlow/'} readOnly className="mt-1 bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">Configuré dans l'agent desktop</p>
            </div>
            <div>
              <Label className="text-sm">Fréquence de synchronisation</Label>
              <Select
                value={settings.sync_frequency || '15'}
                onValueChange={(v) => workspace && updateSettings.mutate({ id: workspace.id, settings: { ...settings, sync_frequency: v } })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Toutes les 15 minutes</SelectItem>
                  <SelectItem value="30">Toutes les 30 minutes</SelectItem>
                  <SelectItem value="60">Toutes les heures</SelectItem>
                  <SelectItem value="manual">Manuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Fichiers à exclure</Label>
              <Input
                placeholder=".tmp, .cache, .log"
                value={settings.exclude_patterns || ''}
                onChange={(e) => workspace && updateSettings.mutate({ id: workspace.id, settings: { ...settings, exclude_patterns: e.target.value } })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Taille max par fichier (Mo)</Label>
              <Input
                type="number"
                value={settings.max_file_size_mb || 100}
                onChange={(e) => workspace && updateSettings.mutate({ id: workspace.id, settings: { ...settings, max_file_size_mb: Number(e.target.value) } })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Synchronisation activée</Label>
              <Switch
                checked={workspace?.sync_enabled ?? true}
                onCheckedChange={async (v) => {
                  if (!workspace) return;
                  await supabase.from('personal_workspaces').update({ sync_enabled: v }).eq('id', workspace.id);
                }}
              />
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${workspace?.sync_enabled ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                Agent desktop : {workspace?.sync_enabled ? 'Connecté' : 'Déconnecté'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
