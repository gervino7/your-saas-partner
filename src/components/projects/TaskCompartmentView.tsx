import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/database';

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/15 text-info',
  high: 'bg-warning/15 text-warning',
  urgent: 'bg-destructive/15 text-destructive',
};

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

interface GroupedViewProps {
  tasks: any[];
  groupBy: 'compartment' | 'assignee';
}

export default function TaskGroupedView({ tasks, groupBy }: GroupedViewProps) {
  const groups: Record<string, any[]> = {};

  if (groupBy === 'compartment') {
    tasks.forEach((t) => {
      const key = t.compartment || 'Sans compartiment';
      (groups[key] ??= []).push(t);
    });
  } else {
    tasks.forEach((t) => {
      if (!t.assignments?.length) {
        (groups['Non assigné'] ??= []).push(t);
      } else {
        t.assignments.forEach((a: any) => {
          const key = a.user?.full_name || 'Inconnu';
          (groups[key] ??= []).push(t);
        });
      }
    });
  }

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([groupName, groupTasks]) => (
        <Collapsible key={groupName} defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [&[data-state=open]]:rotate-0 [&[data-state=closed]]:-rotate-90" />
            <span className="text-sm font-semibold">{groupName}</span>
            <Badge variant="secondary" className="text-xs ml-auto">{groupTasks.length}</Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-6 space-y-2 pt-2">
            {groupTasks.map((task) => (
              <Card key={task.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">{task.title}</p>
                    <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority] ?? ''}`}>
                      {TASK_PRIORITY_LABELS[task.priority as keyof typeof TASK_PRIORITY_LABELS] ?? task.priority}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] ?? task.status}
                  </Badge>
                </div>
                {groupBy === 'compartment' && task.assignments?.length > 0 && (
                  <div className="flex -space-x-1 mt-2">
                    {task.assignments.slice(0, 3).map((a: any) => (
                      <Avatar key={a.id} className="h-5 w-5 border-2 border-background">
                        <AvatarImage src={a.user?.avatar_url ?? ''} />
                        <AvatarFallback className="text-[8px]">{initials(a.user?.full_name ?? '')}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
