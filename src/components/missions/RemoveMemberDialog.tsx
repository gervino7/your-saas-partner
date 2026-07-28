import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useRemoveMissionMember } from '@/hooks/useMissions';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  missionId: string;
  member: { user_id: string; name: string } | null;
}

export default function RemoveMemberDialog({ open, onOpenChange, missionId, member }: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const removeMember = useRemoveMissionMember();

  useEffect(() => { if (open) { setReason(''); setError(null); } }, [open]);

  const { data: impact, isLoading } = useQuery({
    queryKey: ['member-removal-impact', missionId, member?.user_id],
    enabled: open && !!member,
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('get_member_removal_impact' as any, {
        _mission_id: missionId,
        _user_id: member!.user_id,
      });
      if (err) throw err;
      return data as any;
    },
  });

  const submit = async () => {
    if (!member || reason.trim().length < 5) return;
    setError(null);
    try {
      await removeMember.mutateAsync({ missionId, userId: member.user_id, reason: reason.trim() });
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message ?? 'Une erreur est survenue');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Retirer {member?.name} de la mission</DialogTitle>
          <DialogDescription>Cette action est tracée dans le journal d'activité.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="mb-2 flex items-center gap-1.5 font-medium text-destructive">
                <X className="h-4 w-4" /> Sera retiré
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>Accès à la mission</li>
                <li>{impact?.projects ?? 0} projet(s) de la mission</li>
                <li>{impact?.tasks ?? 0} tâche(s) en cours assignée(s)</li>
                <li>{impact?.staffing ?? 0} affectation(s) de staffing</li>
              </ul>
            </div>
            <div className="rounded-md border bg-muted/50 p-3 text-sm">
              <p className="mb-2 flex items-center gap-1.5 font-medium text-success">
                <Check className="h-4 w-4" /> Sera conservé
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>{impact?.documents ?? 0} document(s) déposé(s)</li>
                <li>{Number(impact?.hours ?? 0)} h saisies (feuilles de temps)</li>
                <li>Historique des tâches et évaluations</li>
              </ul>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="remove-reason">Motif (obligatoire, 5 caractères minimum)</Label>
          <Textarea id="remove-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        {error && (
          <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            variant="destructive"
            onClick={submit}
            disabled={reason.trim().length < 5 || removeMember.isPending}
          >
            {removeMember.isPending ? 'Retrait...' : 'Retirer de la mission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
