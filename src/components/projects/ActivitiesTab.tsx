import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, ChevronRight, ChevronDown, FolderTree, Trash2, Pencil } from 'lucide-react';
import { useProjectActivities, useCreateActivity, useUpdateActivity, useDeleteActivity } from '@/hooks/useProject';
import EmptyState from '@/components/common/EmptyState';

const LEVEL_LABELS: Record<number, string> = {
  0: 'Activité',
  1: 'Sous-activité',
  2: 'Sous-sous-activité',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

interface ActivityNodeProps {
  activity: any;
  allActivities: any[];
  projectId: string;
  onAddChild: (parentId: string, depth: number) => void;
  onEdit: (activity: any) => void;
  onDelete: (id: string) => void;
}

function ActivityNode({ activity, allActivities, projectId, onAddChild, onEdit, onDelete }: ActivityNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const children = allActivities.filter((a) => a.parent_id === activity.id);
  const depth = activity.depth ?? 0;
  const canAddChild = depth < 2; // Max 3 levels (0, 1, 2)

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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {activity.code && (
              <span className="text-xs font-mono text-muted-foreground">{activity.code}</span>
            )}
            <span className="text-sm font-medium truncate">{activity.name}</span>
          </div>
          {activity.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{activity.description}</p>
          )}
        </div>

        {(activity.progress != null && activity.progress > 0) && (
          <div className="w-16 shrink-0">
            <Progress value={activity.progress} className="h-1.5" />
          </div>
        )}

        <Badge variant="outline" className={`text-[10px] shrink-0 ${STATUS_COLORS[activity.status] ?? ''}`}>
          {activity.status ?? 'pending'}
        </Badge>

        <Badge variant="secondary" className="text-[10px] shrink-0">
          {LEVEL_LABELS[depth] ?? `Niv.${depth}`}
        </Badge>

        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {canAddChild && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddChild(activity.id, depth + 1)}>
              <Plus className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(activity)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(activity.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
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
              onEdit={onEdit}
              onDelete={onDelete}
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
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [depth, setDepth] = useState(0);
  const [form, setForm] = useState({ name: '', description: '', code: '', planned_start_date: '', planned_end_date: '' });

  const rootActivities = activities.filter((a: any) => !a.parent_id);

  const resetForm = () => setForm({ name: '', description: '', code: '', planned_start_date: '', planned_end_date: '' });

  const handleAdd = (pId: string | null, d: number) => {
    setEditingActivity(null);
    setParentId(pId);
    setDepth(d);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (activity: any) => {
    setEditingActivity(activity);
    setParentId(activity.parent_id);
    setDepth(activity.depth ?? 0);
    setForm({
      name: activity.name ?? '',
      description: activity.description ?? '',
      code: activity.code ?? '',
      planned_start_date: activity.planned_start_date ?? '',
      planned_end_date: activity.planned_end_date ?? '',
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette activité et tous ses enfants ?')) {
      deleteActivity.mutate({ id, projectId });
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      code: form.code.trim() || undefined,
      planned_start_date: form.planned_start_date || undefined,
      planned_end_date: form.planned_end_date || undefined,
    };

    if (editingActivity) {
      updateActivity.mutate(
        { id: editingActivity.id, ...payload },
        { onSuccess: () => { setDialogOpen(false); resetForm(); } }
      );
    } else {
      createActivity.mutate(
        { ...payload, project_id: projectId, parent_id: parentId ?? undefined, depth },
        { onSuccess: () => { setDialogOpen(false); resetForm(); } }
      );
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  if (activities.length === 0) {
    return (
      <>
        <EmptyState
          icon={FolderTree}
          title="Aucune activité"
          description="Structurez votre projet en créant des activités et sous-activités (jusqu'à 3 niveaux)."
          actionLabel="Ajouter une activité"
          onAction={() => handleAdd(null, 0)}
        />
        <ActivityFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          isPending={createActivity.isPending}
          isEditing={false}
          depth={depth}
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
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
      <ActivityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        isPending={createActivity.isPending || updateActivity.isPending}
        isEditing={!!editingActivity}
        depth={depth}
      />
    </div>
  );
}

function ActivityFormDialog({ open, onOpenChange, form, setForm, onSubmit, isPending, isEditing, depth }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  form: { name: string; description: string; code: string; planned_start_date: string; planned_end_date: string };
  setForm: (f: any) => void;
  onSubmit: () => void;
  isPending: boolean;
  isEditing: boolean;
  depth: number;
}) {
  const levelLabel = LEVEL_LABELS[depth] ?? `Niveau ${depth}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? `Modifier ${levelLabel.toLowerCase()}` : `Nouvelle ${levelLabel.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Code (ex: 1.1)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="col-span-1"
            />
            <Input
              placeholder="Nom de l'activité"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="col-span-2"
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
          </div>
          <Textarea
            placeholder="Description (optionnel)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Date début prévue</label>
              <Input
                type="date"
                value={form.planned_start_date}
                onChange={(e) => setForm({ ...form, planned_start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date fin prévue</label>
              <Input
                type="date"
                value={form.planned_end_date}
                onChange={(e) => setForm({ ...form, planned_end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={onSubmit} disabled={isPending || !form.name.trim()}>
              {isPending ? (isEditing ? 'Mise à jour...' : 'Création...') : (isEditing ? 'Enregistrer' : 'Créer')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
