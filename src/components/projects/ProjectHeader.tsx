import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft } from 'lucide-react';

const statusLabels: Record<string, string> = {
  planning: 'Planification',
  active: 'Actif',
  on_hold: 'En pause',
  review: 'En revue',
  completed: 'Terminé',
  archived: 'Archivé',
};

const statusColors: Record<string, string> = {
  planning: 'bg-info/15 text-info border-info/30',
  active: 'bg-success/15 text-success border-success/30',
  on_hold: 'bg-warning/15 text-warning border-warning/30',
  review: 'bg-accent/15 text-accent border-accent/30',
  completed: 'bg-primary/15 text-primary border-primary/30',
  archived: 'bg-muted text-muted-foreground',
};

function initials(name: string) {
  return name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

interface ProjectHeaderProps {
  project: any;
}

export default function ProjectHeader({ project }: ProjectHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={`/missions/${project.mission?.id}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {project.mission?.name ?? 'Mission'}
        </Link>
        <span>/</span>
        <span className="font-mono text-xs">{project.code}</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display">{project.name}</h1>
            <Badge variant="outline" className={statusColors[project.status] ?? ''}>
              {statusLabels[project.status] ?? project.status}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
          )}
        </div>

        {project.lead && (
          <div className="flex items-center gap-2 shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={project.lead.avatar_url ?? ''} />
              <AvatarFallback className="text-xs">{initials(project.lead.full_name)}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium leading-none">{project.lead.full_name}</p>
              <p className="text-xs text-muted-foreground">Chef de projet</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 max-w-md">
        <Progress value={project.progress ?? 0} className="h-2 flex-1" />
        <span className="text-sm font-medium text-muted-foreground">{project.progress ?? 0}%</span>
      </div>
    </div>
  );
}
