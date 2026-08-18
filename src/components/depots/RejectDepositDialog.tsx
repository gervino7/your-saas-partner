import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useReviewDeposits } from '@/hooks/useDepositsInbox';

const QUICK_REASONS = [
  'Document illisible',
  'Période incorrecte',
  'Document incomplet',
  'Mauvais document',
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentIds: string[];
  singleLabel?: string | null;
  onDone?: () => void;
}

const RejectDepositDialog = ({ open, onOpenChange, documentIds, singleLabel, onDone }: Props) => {
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [sending, setSending] = useState(false);
  const review = useReviewDeposits();

  useEffect(() => {
    if (open) { setReason(''); setNotify(true); }
  }, [open]);

  const count = documentIds.length;
  const tooShort = reason.trim().length < 5;

  const handleConfirm = async () => {
    if (tooShort) return;
    setSending(true);
    try {
      await review.mutateAsync({ documentIds, action: 'reject', reason: reason.trim() });

      let informed = false;
      if (notify) {
        const { data, error } = await supabase.functions.invoke('send-document-rejection', {
          body: { document_ids: documentIds, reason: reason.trim() },
        });
        if (error || (data && data.ok === false)) {
          toast.warning(
            `${count} pièce(s) rejetée(s). L'email n'a pas pu être envoyé : prévenez le client autrement.`,
          );
        } else {
          informed = true;
        }
      }

      if (!notify || informed) {
        toast.success(
          notify
            ? `${count} pièce(s) rejetée(s). Le client a été informé.`
            : `${count} pièce(s) rejetée(s).`,
        );
      }
      onOpenChange(false);
      onDone?.();
    } catch {
      /* le hook affiche déjà l'erreur */
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {count === 1 && singleLabel ? `Rejeter « ${singleLabel} »` : `Rejeter ${count} pièce(s)`}
          </DialogTitle>
          <DialogDescription>
            Ce motif sera communiqué au client pour qu'il sache quoi corriger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <Button
                key={r}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setReason((prev) => (prev.trim() ? `${prev.trim()} — ${r}` : r))}
              >
                {r}
              </Button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reject-reason" className="text-sm">Motif</Label>
            <Textarea
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indiquez précisément ce que le client doit corriger."
            />
            {tooShort && (
              <p className="text-xs text-muted-foreground">Motif obligatoire, 5 caractères minimum.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="notify-client" checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
            <Label htmlFor="notify-client" className="text-sm font-normal">
              Prévenir le client par email
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>Annuler</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={tooShort || sending}>
            {sending ? 'Envoi en cours…' : `Rejeter ${count} pièce(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RejectDepositDialog;
