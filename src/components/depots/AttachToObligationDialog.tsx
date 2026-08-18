import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAttachFreeUpload, useClientOpenObligationDocs, type FreeUpload } from '@/hooks/useDepositsInbox';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  upload: FreeUpload | null;
}

const AttachToObligationDialog = ({ open, onOpenChange, upload }: Props) => {
  const [selected, setSelected] = useState<string>('');
  const { data: docs = [], isLoading } = useClientOpenObligationDocs(open ? upload?.client_id ?? null : null);
  const attach = useAttachFreeUpload();

  useEffect(() => { if (open) setSelected(''); }, [open, upload?.document_id]);

  const handleAttach = async () => {
    if (!upload || !selected) return;
    await attach.mutateAsync({ portalDocumentId: upload.document_id, obligationDocumentId: selected });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Rattacher à une déclaration</DialogTitle>
          <DialogDescription>
            {upload ? `${upload.title || upload.file_name} — ${upload.client_name}` : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Chargement des pièces attendues…</p>
        ) : docs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune pièce attendue pour ce client. Créez la période concernée depuis l'échéancier.
          </p>
        ) : (
          <ScrollArea className="max-h-80 pr-2">
            <RadioGroup value={selected} onValueChange={setSelected} className="gap-0">
              {docs.map((d) => (
                <Label
                  key={d.id}
                  htmlFor={d.id}
                  className="flex cursor-pointer items-center gap-3 border-b py-2.5 text-sm font-normal last:border-b-0"
                >
                  <RadioGroupItem value={d.id} id={d.id} />
                  <span className="flex-1">
                    <span className="block">{d.label}</span>
                    <span className="block text-[13px] text-muted-foreground">
                      {d.obligation_label} — {d.period_label}
                      {d.due_date ? ` — échéance ${format(new Date(d.due_date), 'dd/MM/yyyy')}` : ''}
                    </span>
                  </span>
                  <Badge variant="outline" className="font-mono text-[11px]">{d.obligation_code}</Badge>
                </Label>
              ))}
            </RadioGroup>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleAttach} disabled={!selected || attach.isPending}>Rattacher</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttachToObligationDialog;
