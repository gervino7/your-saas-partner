import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToggleOrg } from '@/hooks/useSuperAdmin';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  org: { id: string; name: string } | null;
}

export default function SuspendDialog({ open, onOpenChange, org }: Props) {
  const [reason, setReason] = useState('');
  const toggleOrg = useToggleOrg();

  useEffect(() => { if (open) setReason(''); }, [open]);

  const submit = () => {
    if (!org || reason.trim().length < 5) return;
    toggleOrg.mutate(
      { _org_id: org.id, _activate: false, _reason: reason.trim() },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspendre {org?.name}</DialogTitle>
          <DialogDescription>Le motif est conservé dans le journal d'audit.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Les membres ne pourront plus créer de missions et seront notifiés.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="suspend-reason">Motif (obligatoire, 5 caractères minimum)</Label>
          <Textarea id="suspend-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button variant="destructive" onClick={submit} disabled={reason.trim().length < 5 || toggleOrg.isPending}>
            Suspendre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
