import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, Search, Kanban, Table2, LayoutGrid, Users, BarChart3 } from 'lucide-react';
import { useProjectTasks, useProjectActivities } from '@/hooks/useProject';
import { useProjectMembers } from '@/hooks/useProject';
import TaskKanbanView from './TaskKanbanView';
import TaskTableView from './TaskTableView';
import TaskGroupedView from './TaskCompartmentView';
import TaskFormDialog from './TaskFormDialog';
import EmptyState from '@/components/common/EmptyState';

type ViewMode = 'kanban' | 'table' | 'compartment' | 'assignee' | 'gantt';

export default function TasksTab({ projectId }: { projectId: string }) {
  const { data: tasks = [], isLoading } = useProjectTasks(projectId);
  const { data: activities = [] } = useProjectActivities(projectId);
  const { data: members = [] } = useProjectMembers(projectId);
  const [view, setView] = useState<ViewMode>('kanban');
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((t: any) => t.title.toLowerCase().includes(s));
    }
    if (filterStatus !== 'all') {
      result = result.filter((t: any) => t.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      result = result.filter((t: any) => t.priority === filterPriority);
    }
    return result;
  }, [tasks, search, filterStatus, filterPriority]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nouvelle tâche
          </Button>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="todo">À faire</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="in_review">En revue</SelectItem>
              <SelectItem value="correction">Correction</SelectItem>
              <SelectItem value="validated">Validé</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Priorité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="low">Basse</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="high">Haute</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewMode)} size="sm">
          <ToggleGroupItem value="kanban" aria-label="Kanban"><Kanban className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Tableau"><Table2 className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="compartment" aria-label="Compartiments"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="assignee" aria-label="Attributions"><Users className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="gantt" aria-label="Gantt"><BarChart3 className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      {filteredTasks.length === 0 && !isLoading ? (
        <EmptyState
          icon={Kanban}
          title="Aucune tâche"
          description="Créez votre première tâche pour démarrer le suivi du projet."
          actionLabel="Nouvelle tâche"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <>
          {view === 'kanban' && <TaskKanbanView tasks={filteredTasks} />}
          {view === 'table' && <TaskTableView tasks={filteredTasks} />}
          {view === 'compartment' && <TaskGroupedView tasks={filteredTasks} groupBy="compartment" />}
          {view === 'assignee' && <TaskGroupedView tasks={filteredTasks} groupBy="assignee" />}
          {view === 'gantt' && <GanttPlaceholder />}
        </>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        projectId={projectId}
        members={members}
        activities={activities}
        tasks={tasks}
      />
    </div>
  );
}

function GanttPlaceholder() {
  return (
    <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/20">
      <div className="text-center text-muted-foreground">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">Vue Gantt</p>
        <p className="text-xs">Bientôt disponible</p>
      </div>
    </div>
  );
}
