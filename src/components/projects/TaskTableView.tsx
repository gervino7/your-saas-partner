import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/15 text-info',
  high: 'bg-warning/15 text-warning',
  urgent: 'bg-destructive/15 text-destructive',
};

const statusColors: Record<string, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-info/15 text-info',
  in_review: 'bg-warning/15 text-warning',
  correction: 'bg-destructive/15 text-destructive',
  validated: 'bg-success/15 text-success',
  completed: 'bg-primary/15 text-primary',
};

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

export default function TaskTableView({ tasks }: { tasks: any[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Assigné à</TableHead>
            <TableHead>Date limite</TableHead>
            <TableHead>Heures est.</TableHead>
            <TableHead>Compartiment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Aucune tâche
              </TableCell>
            </TableRow>
          ) : (
            tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${statusColors[task.status] ?? ''}`}>
                    {TASK_STATUS_LABELS[task.status as keyof typeof TASK_STATUS_LABELS] ?? task.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${priorityColors[task.priority] ?? ''}`}>
                    {TASK_PRIORITY_LABELS[task.priority as keyof typeof TASK_PRIORITY_LABELS] ?? task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex -space-x-1">
                    {task.assignments?.slice(0, 3).map((a: any) => (
                      <Avatar key={a.id} className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={a.user?.avatar_url ?? ''} />
                        <AvatarFallback className="text-[9px]">{initials(a.user?.full_name ?? '')}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {task.due_date ? format(new Date(task.due_date), 'd MMM yyyy', { locale: fr }) : '—'}
                </TableCell>
                <TableCell className="text-sm">{task.estimated_hours ?? '—'}</TableCell>
                <TableCell className="text-sm">{task.compartment ?? '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
