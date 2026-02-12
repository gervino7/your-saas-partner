import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, StickyNote, Search } from 'lucide-react';
import { useProjectNotes, useCreateNote } from '@/hooks/useProject';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmptyState from '@/components/common/EmptyState';

export default function NotesTab({ projectId }: { projectId: string }) {
  const { data: notes = [], isLoading } = useProjectNotes(projectId);
  const createNote = useCreateNote();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [search, setSearch] = useState('');

  const filtered = search
    ? notes.filter((n: any) => n.title?.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    : notes;

  const handleCreate = () => {
    if (!content.trim()) return;
    createNote.mutate(
      { title: title || undefined, content, project_id: projectId, is_private: isPrivate },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setTitle('');
          setContent('');
        },
      }
    );
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold font-display">Notes</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle note
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Aucune note"
          description="Créez des notes personnelles ou partagées pour le projet."
          actionLabel="Nouvelle note"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((note: any) => (
            <Card key={note.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold truncate">{note.title || 'Sans titre'}</h4>
                <Badge variant={note.is_private ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                  {note.is_private ? 'Privée' : 'Partagée'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{note.content}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(note.updated_at ?? note.created_at), 'd MMM yyyy', { locale: fr })}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Nouvelle note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Titre (optionnel)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Contenu..." rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
            <div className="flex items-center gap-2">
              <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} />
              <Label htmlFor="private" className="text-sm">Note privée</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={createNote.isPending || !content.trim()}>
                {createNote.isPending ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
