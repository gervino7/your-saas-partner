import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays } from 'lucide-react';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/database';
import { useUpdateTask } from '@/hooks/useProject';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import TaskDetailDialog from './TaskDetailDialog';

const COLUMNS = ['todo', 'in_progress', 'in_review', 'correction', 'validated', 'completed'] as const;

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/15 text-info',
  high: 'bg-warning/15 text-warning',
  urgent: 'bg-destructive/15 text-destructive',
};

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

export default function TaskKanbanView({ tasks, projectLeadId }: { tasks: any[]; projectLeadId?: string | null }) {
  const updateTask = useUpdateTask();
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleDrop = (taskId: string, newStatus: string) => {
    updateTask.mutate({ id: taskId, status: newStatus });
  };

  return (
    <>
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            className="min-w-[280px] flex-shrink-0 space-y-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData('taskId');
              if (taskId) handleDrop(taskId, status);
            }}
          >
            <div className="flex items-center justify-between px-1">
              <h4 className="text-sm font-semibold text-muted-foreground">
                {TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS]}
              </h4>
              <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[200px] bg-muted/30 rounded-lg p-2">
              {columnTasks.map((task) => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
                  onClick={() => setSelectedTask(task)}
                  className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2">
                    <p className="text-sm font-medium leading-tight">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority] ?? ''}`}>
                        {TASK_PRIORITY_LABELS[task.priority as keyof typeof TASK_PRIORITY_LABELS] ?? task.priority}
                      </Badge>
                      {task.compartment && (
                        <Badge variant="outline" className="text-[10px]">{task.compartment}</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-1">
                        {task.assignments?.slice(0, 3).map((a: any) => (
                          <Avatar key={a.id} className="h-5 w-5 border-2 border-background">
                            <AvatarImage src={a.user?.avatar_url ?? ''} />
                            <AvatarFallback className="text-[8px]">{initials(a.user?.full_name ?? '')}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(task.due_date), 'd MMM', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>

    <TaskDetailDialog
      task={selectedTask}
      open={!!selectedTask}
      onOpenChange={(open) => !open && setSelectedTask(null)}
      projectLeadId={projectLeadId}
    />
    </>
  );
}
