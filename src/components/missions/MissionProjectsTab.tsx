import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, FolderKanban, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useMissionProjects, useDeleteProject } from '@/hooks/useMissions';
import { useAuthStore } from '@/stores/authStore';
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
  const deleteProject = useDeleteProject();
  const profile = useAuthStore((s) => s.profile);
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const canManage = profile?.grade_level != null && profile.grade_level <= 2;

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

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteProject.mutateAsync({ id: deleteConfirm.id, missionId });
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold ">Projets ({projects.length})</h3>
        {canCreate && (
          <Button size="sm" onClick={() => { setEditProject(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Créer un projet
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p: any) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow relative group">
            {canManage && (
              <div className="absolute top-3 right-3 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditProject(p); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4 mr-2" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(p)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <Link to={`/projects/${p.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between pr-8">
                  <div>
                    <p className="text-xs tabular-nums text-muted-foreground">{p.code}</p>
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
            </Link>
          </Card>
        ))}
      </div>

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditProject(null); }}
        missionId={missionId}
        project={editProject}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le projet</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le projet « {deleteConfirm?.name} » ? 
              Toutes les tâches, activités et données associées seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
