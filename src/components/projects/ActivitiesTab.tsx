import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, ChevronRight, ChevronDown, FolderTree, Trash2, Pencil, CheckSquare, GripVertical } from 'lucide-react';
import { useProjectActivities, useCreateActivity, useUpdateActivity, useDeleteActivity, useProjectTasks, useUpdateTask, useDeleteTask, useProjectMembers, useReorderActivities } from '@/hooks/useProject';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/database';
import EmptyState from '@/components/common/EmptyState';
import TaskFormDialog from './TaskFormDialog';

const LEVEL_LABELS: Record<number, string> = {
  0: 'Activité',
  1: 'Sous-activité',
  2: 'Sous-sous-activité',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-info/15 text-info',
  completed: 'bg-success/15 text-success',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-info/15 text-info',
  in_review: 'bg-warning/15 text-warning',
  correction: 'bg-destructive/15 text-destructive',
  validated: 'bg-success/15 text-success',
  completed: 'bg-primary/15 text-primary',
};

const TASK_PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/15 text-info',
  high: 'bg-warning/15 text-warning',
  urgent: 'bg-destructive/15 text-destructive',
};

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

interface TaskItemProps {
  task: any;
  onEdit: (task: any) => void;
  onDelete: (task: any) => void;
}

function TaskItem({ task, onEdit, onDelete }: TaskItemProps) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-sm group/task">
      <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="font-medium truncate flex-1">{task.title}</span>
      <div className="flex -space-x-1 shrink-0">
        {task.assignments?.slice(0, 2).map((a: any) => (
          <Avatar key={a.id} className="h-5 w-5 border border-background">
            <AvatarImage src={a.user?.avatar_url ?? ''} />
            <AvatarFallback className="text-[8px]">{initials(a.user?.full_name ?? '')}</AvatarFallback>
          </Avatar>
        ))}
      </div>
      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${TASK_STATUS_COLORS[task.status] ?? ''}`}>
        {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] ?? task.status}
      </Badge>
      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${TASK_PRIORITY_COLORS[task.priority] ?? ''}`}>
        {TASK_PRIORITY_LABELS[task.priority as keyof typeof TASK_PRIORITY_LABELS] ?? task.priority}
      </Badge>
      <div className="flex gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity shrink-0">
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEdit(task)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => onDelete(task)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

interface ActivityNodeProps {
  activity: any;
  allActivities: any[];
  tasks: any[];
  projectId: string;
  numbering: string;
  onAddChild: (parentId: string, depth: number) => void;
  onEdit: (activity: any) => void;
  onDelete: (id: string) => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (task: any) => void;
  onDragStart: (e: React.DragEvent, id: string, parentId: string | null) => void;
  onDragOver: (e: React.DragEvent, id: string, parentId: string | null) => void;
  onDragEnd: () => void;
  dragOverId: string | null;
}

function ActivityNode({
  activity, allActivities, tasks, projectId, numbering,
  onAddChild, onEdit, onDelete, onEditTask, onDeleteTask,
  onDragStart, onDragOver, onDragEnd, dragOverId,
}: ActivityNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const children = allActivities
    .filter((a) => a.parent_id === activity.id)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const activityTasks = tasks.filter((t) => t.activity_id === activity.id);
  const depth = activity.depth ?? 0;
  const canAddChild = depth < 2;
  const hasContent = children.length > 0 || activityTasks.length > 0;
  const isDragOver = dragOverId === activity.id;

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, activity.id, activity.parent_id)}
        onDragOver={(e) => onDragOver(e, activity.id, activity.parent_id)}
        onDragEnd={onDragEnd}
        className={`flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group cursor-grab active:cursor-grabbing ${
          isDragOver ? 'ring-2 ring-primary/50 bg-primary/5' : ''
        }`}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

        <button onClick={() => setExpanded(!expanded)} className="shrink-0">
          {hasContent ? (
            expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <span className="w-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-primary">{numbering}</span>
            <span className="text-sm font-medium truncate">{activity.name}</span>
            {activityTasks.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                ({activityTasks.length} tâche{activityTasks.length > 1 ? 's' : ''})
              </span>
            )}
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

        <Badge variant="secondary" className={`text-[10px] shrink-0`}>
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

      {expanded && hasContent && (
        <div className="ml-6 border-l border-border pl-1">
          {children.map((child, idx) => (
            <ActivityNode
              key={child.id}
              activity={child}
              allActivities={allActivities}
              tasks={tasks}
              projectId={projectId}
              numbering={`${numbering}.${idx + 1}`}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              dragOverId={dragOverId}
            />
          ))}
          {activityTasks.length > 0 && (
            <div className="ml-4 space-y-1 py-1">
              {activityTasks.map((task) => (
                <TaskItem key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ActivitiesTab({ projectId }: { projectId: string }) {
  const { data: activities = [], isLoading } = useProjectActivities(projectId);
  const { data: tasks = [] } = useProjectTasks(projectId);
  const { data: members = [] } = useProjectMembers(projectId);
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const deleteTask = useDeleteTask();
  const reorderActivities = useReorderActivities();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [depth, setDepth] = useState(0);
  const [form, setForm] = useState({ name: '', description: '', planned_start_date: '', planned_end_date: '' });
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  // Drag state
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItemRef = useRef<{ id: string; parentId: string | null } | null>(null);

  const rootActivities = activities
    .filter((a: any) => !a.parent_id)
    .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const unlinkedTasks = tasks.filter((t: any) => !t.activity_id);

  const resetForm = () => setForm({ name: '', description: '', planned_start_date: '', planned_end_date: '' });

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

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setTaskFormOpen(true);
  };

  const handleDeleteTask = (task: any) => {
    if (confirm(`Supprimer la tâche "${task.title}" ?`)) {
      deleteTask.mutate({ id: task.id, projectId });
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    // Compute next order_index for new activities
    const siblings = activities.filter((a: any) =>
      parentId ? a.parent_id === parentId : !a.parent_id
    );
    const maxOrder = siblings.reduce((max: number, a: any) => Math.max(max, a.order_index ?? 0), -1);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
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
        { ...payload, project_id: projectId, parent_id: parentId ?? undefined, depth, order_index: maxOrder + 1 } as any,
        { onSuccess: () => { setDialogOpen(false); resetForm(); } }
      );
    }
  };

  // Drag & Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string, parentId: string | null) => {
    dragItemRef.current = { id, parentId };
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string, targetParentId: string | null) => {
    e.preventDefault();
    if (!dragItemRef.current) return;
    // Only allow reorder among siblings
    if (dragItemRef.current.parentId !== targetParentId) return;
    if (dragItemRef.current.id === targetId) return;
    setDragOverId(targetId);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragItemRef.current || !dragOverId) {
      setDragOverId(null);
      dragItemRef.current = null;
      return;
    }

    const { id: draggedId, parentId: dragParentId } = dragItemRef.current;
    const siblings = activities
      .filter((a: any) => dragParentId ? a.parent_id === dragParentId : !a.parent_id)
      .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const draggedIdx = siblings.findIndex((a: any) => a.id === draggedId);
    const targetIdx = siblings.findIndex((a: any) => a.id === dragOverId);

    if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) {
      setDragOverId(null);
      dragItemRef.current = null;
      return;
    }

    const reordered = [...siblings];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    const updates = reordered.map((a: any, i: number) => ({ id: a.id, order_index: i }));
    reorderActivities.mutate({ updates, projectId });

    setDragOverId(null);
    dragItemRef.current = null;
  }, [dragOverId, activities, projectId, reorderActivities]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  if (activities.length === 0) {
    return (
      <>
        <EmptyState
          icon={FolderTree}
          title="Aucune activité"
          description="Structurez votre projet en créant des activités et sous-activités (jusqu'à 3 niveaux). Les tâches seront rattachées aux activités."
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
        <div>
          <h3 className="text-lg font-semibold font-display">Structure du projet</h3>
          <p className="text-xs text-muted-foreground">Glissez-déposez pour réorganiser les activités</p>
        </div>
        <Button size="sm" onClick={() => handleAdd(null, 0)}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter une activité
        </Button>
      </div>

      <div className="border rounded-lg p-2">
        {rootActivities.map((a: any, idx: number) => (
          <ActivityNode
            key={a.id}
            activity={a}
            allActivities={activities}
            tasks={tasks}
            projectId={projectId}
            numbering={`${idx + 1}`}
            onAddChild={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            dragOverId={dragOverId}
          />
        ))}
      </div>

      {unlinkedTasks.length > 0 && (
        <div className="border rounded-lg p-3 border-dashed border-warning/50 bg-warning/5">
          <p className="text-xs font-medium text-warning mb-2 flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            Tâches non rattachées à une activité ({unlinkedTasks.length})
          </p>
          <div className="space-y-1">
            {unlinkedTasks.map((task: any) => (
              <TaskItem key={task.id} task={task} onEdit={handleEditTask} onDelete={handleDeleteTask} />
            ))}
          </div>
        </div>
      )}

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

      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={(open) => { setTaskFormOpen(open); if (!open) setEditingTask(null); }}
        projectId={projectId}
        members={members}
        activities={activities}
        tasks={tasks}
        editingTask={editingTask}
      />
    </div>
  );
}

function ActivityFormDialog({ open, onOpenChange, form, setForm, onSubmit, isPending, isEditing, depth }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  form: { name: string; description: string; planned_start_date: string; planned_end_date: string };
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
          <Input
            placeholder="Nom de l'activité"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          />
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
