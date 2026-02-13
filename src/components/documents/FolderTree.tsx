import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FolderRow, useCreateFolder, useRenameFolder, useDeleteFolder } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface FolderTreeProps {
  folders: FolderRow[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  projectId?: string;
  documentCounts?: Record<string, number>;
}

export default function FolderTree({ folders, selectedFolderId, onSelectFolder, projectId, documentCounts = {} }: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creatingIn, setCreatingIn] = useState<string | null | undefined>(undefined);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createFolder.mutate({ name: newName.trim(), parentId: creatingIn, projectId }, {
      onSuccess: () => { setCreatingIn(undefined); setNewName(''); },
    });
  };

  const handleRename = () => {
    if (!renamingId || !renameValue.trim()) return;
    renameFolder.mutate({ id: renamingId, name: renameValue.trim() }, {
      onSuccess: () => setRenamingId(null),
    });
  };

  const getChildren = (parentId: string | null) => folders.filter((f) => f.parent_id === parentId);

  const renderFolder = (folder: FolderRow, depth: number) => {
    const children = getChildren(folder.id);
    const isExpanded = expanded.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const count = documentCounts[folder.id] || 0;

    return (
      <div key={folder.id}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-accent/10 transition-colors',
                isSelected && 'bg-accent/20 text-accent-foreground font-medium'
              )}
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => onSelectFolder(folder.id)}
            >
              {children.length > 0 ? (
                <button onClick={(e) => { e.stopPropagation(); toggle(folder.id); }} className="p-0.5">
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <span className="w-4" />
              )}
              {isSelected ? <FolderOpen className="h-4 w-4 text-accent shrink-0" /> : <Folder className="h-4 w-4 text-muted-foreground shrink-0" />}
              {renamingId === folder.id ? (
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  className="h-6 text-xs"
                  autoFocus
                />
              ) : (
                <span className="truncate flex-1">{folder.name}</span>
              )}
              {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => { setCreatingIn(folder.id); setExpanded((p) => new Set(p).add(folder.id)); }}>
              <Plus className="h-3.5 w-3.5 mr-2" /> Nouveau sous-dossier
            </ContextMenuItem>
            <ContextMenuItem onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name); }}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Renommer
            </ContextMenuItem>
            <ContextMenuItem className="text-destructive" onClick={() => deleteFolder.mutate(folder.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {isExpanded && children.map((c) => renderFolder(c, depth + 1))}
        {creatingIn === folder.id && (
          <div className="flex items-center gap-1 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreatingIn(undefined); }}
              placeholder="Nom du dossier"
              className="h-6 text-xs"
              autoFocus
            />
          </div>
        )}
      </div>
    );
  };

  const rootFolders = getChildren(null);

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-accent/10',
          selectedFolderId === null && 'bg-accent/20 font-medium'
        )}
        onClick={() => onSelectFolder(null)}
      >
        <FolderOpen className="h-4 w-4 text-accent" />
        <span>Tous les documents</span>
      </div>

      {rootFolders.map((f) => renderFolder(f, 1))}

      {creatingIn === null && (
        <div className="flex items-center gap-1 px-2 py-1 ml-4">
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreatingIn(undefined); }}
            placeholder="Nom du dossier"
            className="h-6 text-xs"
            autoFocus
          />
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-xs text-muted-foreground mt-1"
        onClick={() => setCreatingIn(null)}
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Nouveau dossier
      </Button>
    </div>
  );
}
