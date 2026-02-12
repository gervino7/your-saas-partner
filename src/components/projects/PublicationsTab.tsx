import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText } from 'lucide-react';
import { useProjectPublications, useCreatePublication } from '@/hooks/useProject';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmptyState from '@/components/common/EmptyState';

const typeLabels: Record<string, string> = {
  note: 'Note',
  annonce: 'Annonce',
  mise_a_jour: 'Mise à jour',
  decision: 'Décision',
};

const typeColors: Record<string, string> = {
  note: 'bg-muted text-muted-foreground',
  annonce: 'bg-info/15 text-info',
  mise_a_jour: 'bg-warning/15 text-warning',
  decision: 'bg-success/15 text-success',
};

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

export default function PublicationsTab({ projectId }: { projectId: string }) {
  const { data: publications = [], isLoading } = useProjectPublications(projectId);
  const createPub = useCreatePublication();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('note');
  const [filterType, setFilterType] = useState('all');

  const filtered = filterType === 'all' ? publications : publications.filter((p: any) => p.type === filterType);

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) return;
    createPub.mutate(
      { title, content, project_id: projectId, type },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setTitle('');
          setContent('');
          setType('note');
        },
      }
    );
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold font-display">Publications</h3>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="note">Note</SelectItem>
              <SelectItem value="annonce">Annonce</SelectItem>
              <SelectItem value="mise_a_jour">Mise à jour</SelectItem>
              <SelectItem value="decision">Décision</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouvelle publication
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucune publication"
          description="Partagez des informations avec l'équipe du projet."
          actionLabel="Créer une publication"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((pub: any) => (
            <Card key={pub.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={pub.author?.avatar_url ?? ''} />
                    <AvatarFallback className="text-[9px]">{initials(pub.author?.full_name ?? '')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{pub.author?.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(pub.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${typeColors[pub.type] ?? ''}`}>
                  {typeLabels[pub.type] ?? pub.type}
                </Badge>
              </div>
              <h4 className="text-sm font-semibold">{pub.title}</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pub.content}</p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Nouvelle publication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="annonce">Annonce</SelectItem>
                <SelectItem value="mise_a_jour">Mise à jour</SelectItem>
                <SelectItem value="decision">Décision</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Contenu..." rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={createPub.isPending || !title.trim()}>
                {createPub.isPending ? 'Publication...' : 'Publier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
