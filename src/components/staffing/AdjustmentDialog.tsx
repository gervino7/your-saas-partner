import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRespondToAssignment } from '@/hooks/useStaffing';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignmentId: string | null;
}

export default function AdjustmentDialog({ open, onOpenChange, assignmentId }: Props) {
  const [note, setNote] = useState('');
  const respond = useRespondToAssignment();

  useEffect(() => {
    if (open) setNote('');
  }, [open]);

  const submit = async () => {
    if (!assignmentId || !note.trim()) return;
    await respond.mutateAsync({ id: assignmentId, status: 'adjustment_requested', collaborator_note: note });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander un ajustement</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Expliquez ce qui doit être ajusté <span className="text-destructive">*</span></Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Expliquez ce qui doit être ajusté : volume, période, disponibilité…"
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!note.trim() || respond.isPending}>
            {respond.isPending ? 'Envoi…' : 'Envoyer la demande'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
