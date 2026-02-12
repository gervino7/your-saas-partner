import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, FolderKanban } from 'lucide-react';
import { useMissionProjects } from '@/hooks/useMissions';
import EmptyState from '@/components/common/EmptyState';
import ProjectFormDialog from './ProjectFormDialog';

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

const statusLabels: Record<string, string> = {
  planning: 'Planification',
  active: 'Actif',
  on_hold: 'En pause',
  review: 'En revue',
  completed: 'Terminé',
  archived: 'Archivé',
};

export default function MissionProjectsTab({ missionId, canCreate }: { missionId: string; canCreate: boolean }) {
  const { data: projects = [], isLoading } = useMissionProjects(missionId);
  const [formOpen, setFormOpen] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  if (projects.length === 0) {
    return (
      <>
        <EmptyState
          icon={FolderKanban}
          title="Aucun projet"
          description="Créez un projet pour structurer les activités de cette mission."
          actionLabel={canCreate ? 'Créer un projet' : undefined}
          onAction={canCreate ? () => setFormOpen(true) : undefined}
        />
        <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} missionId={missionId} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-display">Projets ({projects.length})</h3>
        {canCreate && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Créer un projet
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p: any) => (
          <Link key={p.id} to={`/projects/${p.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">{p.code}</p>
                    <h4 className="font-semibold text-sm mt-1">{p.name}</h4>
                  </div>
                  <Badge variant="outline">{statusLabels[p.status] ?? p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.lead && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={p.lead.avatar_url ?? ''} />
                      <AvatarFallback className="text-[10px]">{initials(p.lead.full_name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{p.lead.full_name}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progression</span>
                    <span>{p.progress ?? 0}%</span>
                  </div>
                  <Progress value={p.progress ?? 0} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} missionId={missionId} />
    </div>
  );
}
