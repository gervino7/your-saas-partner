import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTodayAttendance, useCreateAttendanceEvent } from '@/hooks/useAttendance';
import { formatTime } from '@/lib/timeUtils';
import SortieDialog from './SortieDialog';
import { Clock, LogIn, LogOut, CornerDownLeft, Flag } from 'lucide-react';

export default function PointageCard({ compact = false }: { compact?: boolean }) {
  const { events, currentState, isLoading } = useTodayAttendance();
  const create = useCreateAttendanceEvent();
  const [sortieOpen, setSortieOpen] = useState(false);
  const [confirmDepart, setConfirmDepart] = useState(false);

  const lastEvent = events[events.length - 1];
  const arrivalTime = events.find((e) => e.event_type === 'arrivee')?.event_at;
  const departTime = events.find((e) => e.event_type === 'depart')?.event_at;

  let bannerClass = 'bg-muted text-muted-foreground';
  let bannerText = "Vous n'avez pas encore pointé";

  if (currentState === 'present') {
    bannerClass = 'bg-success/15 text-success border border-success/30';
    bannerText = `Présent depuis ${formatTime(arrivalTime)}`;
  } else if (currentState === 'out') {
    bannerClass = 'bg-warning/15 text-warning-foreground border border-warning/30';
    const since = lastEvent?.event_at ? formatTime(lastEvent.event_at) : '';
    bannerText = `En sortie : ${lastEvent?.reason ?? ''} depuis ${since}`;
  } else if (currentState === 'left') {
    bannerClass = 'bg-primary/10 text-primary border border-primary/20';
    const amplitude = arrivalTime && departTime
      ? `${formatTime(arrivalTime)} → ${formatTime(departTime)}`
      : '';
    bannerText = `Journée terminée - ${amplitude}`;
  }

  return (
    <Card>
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
          <Clock className="h-4 w-4" /> Pointage du jour
        </div>
        <div className={`rounded-md px-4 py-3 mb-4 text-sm font-medium ${bannerClass}`}>
          {isLoading ? 'Chargement…' : bannerText}
        </div>
        <div className="flex flex-wrap gap-2">
          {currentState === 'not_arrived' && (
            <Button onClick={() => create.mutate({ event_type: 'arrivee' })} disabled={create.isPending}>
              <LogIn className="h-4 w-4 mr-2" /> J'arrive
            </Button>
          )}
          {currentState === 'present' && (
            <>
              <Button variant="outline" onClick={() => setSortieOpen(true)}>
                <LogOut className="h-4 w-4 mr-2" /> Sortie
              </Button>
              <Button variant="outline" onClick={() => setConfirmDepart(true)}>
                <Flag className="h-4 w-4 mr-2" /> Je pars
              </Button>
            </>
          )}
          {currentState === 'out' && (
            <Button onClick={() => create.mutate({ event_type: 'retour' })} disabled={create.isPending}>
              <CornerDownLeft className="h-4 w-4 mr-2" /> Retour
            </Button>
          )}
        </div>
      </CardContent>

      <SortieDialog open={sortieOpen} onOpenChange={setSortieOpen} />

      <AlertDialog open={confirmDepart} onOpenChange={setConfirmDepart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la fin de journée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous ne pourrez plus enregistrer d'événement après le départ. Confirmez-vous ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => create.mutate({ event_type: 'depart' })}>
              Confirmer le départ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
