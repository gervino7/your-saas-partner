import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUpdateMission, useDeleteMission } from '@/hooks/useMissions';
import MissionFormDialog from './MissionFormDialog';
import { Archive, Trash2, Edit } from 'lucide-react';

export default function MissionSettingsTab({ mission }: { mission: any }) {
  const navigate = useNavigate();
  const updateMission = useUpdateMission();
  const deleteMission = useDeleteMission();
  const [editOpen, setEditOpen] = useState(false);

  const handleArchive = async () => {
    await updateMission.mutateAsync({ id: mission.id, status: 'archived' });
  };

  const handleDelete = async () => {
    await deleteMission.mutateAsync(mission.id);
    navigate('/missions');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Modifier la mission</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Modifiez les informations de la mission comme le nom, la description, les dates, le budget, etc.
          </p>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" /> Modifier
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Archiver la mission</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Archiver la mission la rendra inactive et la masquera des listes par défaut.
          </p>
          <Button variant="outline" onClick={handleArchive} disabled={mission.status === 'archived'}>
            <Archive className="h-4 w-4 mr-2" />
            {mission.status === 'archived' ? 'Déjà archivée' : 'Archiver'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader><CardTitle className="text-base text-destructive">Zone de danger</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            La suppression est irréversible. Toutes les données associées seront perdues.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Supprimer la mission
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer la mission "{mission.name}" ? Cette action est irréversible.
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
        </CardContent>
      </Card>

      <MissionFormDialog open={editOpen} onOpenChange={setEditOpen} mission={mission} />
    </div>
  );
}
