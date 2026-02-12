import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ChevronRight, ChevronDown, FolderTree } from 'lucide-react';
import { useProjectActivities, useCreateActivity } from '@/hooks/useProject';
import EmptyState from '@/components/common/EmptyState';

interface ActivityNodeProps {
  activity: any;
  allActivities: any[];
  projectId: string;
  onAddChild: (parentId: string, depth: number) => void;
}

function ActivityNode({ activity, allActivities, projectId, onAddChild }: ActivityNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const children = allActivities.filter((a) => a.parent_id === activity.id);

  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
        <button onClick={() => setExpanded(!expanded)} className="shrink-0">
          {children.length > 0 ? (
            expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <span className="w-4" />
          )}
        </button>
        <span className="text-sm font-medium flex-1">{activity.name}</span>
        <Badge variant="outline" className="text-[10px]">{activity.status ?? 'pending'}</Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onAddChild(activity.id, (activity.depth ?? 0) + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      {expanded && children.length > 0 && (
        <div className="ml-6 border-l border-border">
          {children.map((child) => (
            <ActivityNode
              key={child.id}
              activity={child}
              allActivities={allActivities}
              projectId={projectId}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActivitiesTab({ projectId }: { projectId: string }) {
  const { data: activities = [], isLoading } = useProjectActivities(projectId);
  const createActivity = useCreateActivity();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [depth, setDepth] = useState(0);
  const [name, setName] = useState('');

  const rootActivities = activities.filter((a: any) => !a.parent_id);

  const handleAdd = (pId: string | null, d: number) => {
    setParentId(pId);
    setDepth(d);
    setName('');
    setDialogOpen(true);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createActivity.mutate(
      { name: name.trim(), project_id: projectId, parent_id: parentId ?? undefined, depth },
      { onSuccess: () => { setDialogOpen(false); setName(''); } }
    );
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  if (activities.length === 0) {
    return (
      <>
        <EmptyState
          icon={FolderTree}
          title="Aucune activité"
          description="Structurez votre projet en créant des activités et sous-activités."
          actionLabel="Ajouter une activité"
          onAction={() => handleAdd(null, 0)}
        />
        <ActivityDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          name={name}
          onNameChange={setName}
          onCreate={handleCreate}
          isPending={createActivity.isPending}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-display">Activités ({activities.length})</h3>
        <Button size="sm" onClick={() => handleAdd(null, 0)}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter une activité
        </Button>
      </div>
      <div className="border rounded-lg p-2">
        {rootActivities.map((a: any) => (
          <ActivityNode
            key={a.id}
            activity={a}
            allActivities={activities}
            projectId={projectId}
            onAddChild={handleAdd}
          />
        ))}
      </div>
      <ActivityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        name={name}
        onNameChange={setName}
        onCreate={handleCreate}
        isPending={createActivity.isPending}
      />
    </div>
  );
}

function ActivityDialog({ open, onOpenChange, name, onNameChange, onCreate, isPending }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  name: string;
  onNameChange: (n: string) => void;
  onCreate: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Nouvelle activité</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Nom de l'activité"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCreate()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={onCreate} disabled={isPending || !name.trim()}>
              {isPending ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
