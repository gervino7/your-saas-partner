import { useState } from 'react';
import { format } from 'date-fns';
import { Copy, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLogRelance, type EcheancierRow } from '@/hooks/useObligations';
import { useClient } from '@/hooks/useCRM';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface Props {
  row: EcheancierRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CANAUX = [
  { value: 'email', label: 'Email' },
  { value: 'telephone', label: 'Téléphone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'visite', label: 'Visite' },
];

const RelanceDialog = ({ row, open, onOpenChange }: Props) => {
  const profile = useAuthStore((s) => s.profile);
  const { data: client } = useClient(row.client_id);
  const log = useLogRelance();

  const [canal, setCanal] = useState('email');
  const [objet, setObjet] = useState(`Pièces comptables — ${row.obligation_label} ${row.period_label}`);
  const dueDateFr = format(new Date(row.due_date), 'dd/MM/yyyy');
  const [message, setMessage] = useState(
`Bonjour,

Dans le cadre de l'établissement de votre ${row.obligation_label} pour la période ${row.period_label}, nous n'avons pas encore reçu l'ensemble des pièces justificatives.

L'échéance de dépôt est fixée au ${dueDateFr}. Afin de respecter ce délai, nous vous remercions de bien vouloir nous transmettre les documents manquants dans les meilleurs délais.

Cordialement,
${profile?.full_name ?? ''} — D&G CONSEIL`
  );

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    toast.success('Message copié');
  };

  const submit = () => {
    log.mutate({
      client_id: row.client_id,
      obligation_period_id: row.id,
      title: objet,
      description: message,
      canal,
    }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Relancer {row.client_name} — {row.obligation_label} {row.period_label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Canal</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CANAUX.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contact client</Label>
              <div className="mt-1 text-sm p-2 rounded border bg-muted/30">
                {client?.contact_email || client?.contact_phone || 'Aucun contact renseigné'}
              </div>
            </div>
          </div>

          <div>
            <Label>Objet</Label>
            <Input className="mt-1" value={objet} onChange={(e) => setObjet(e.target.value)} />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea className="mt-1 font-mono text-sm" rows={12} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-2" /> Copier le message</Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={log.isPending}>
            <Send className="h-4 w-4 mr-2" /> Enregistrer la relance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RelanceDialog;
