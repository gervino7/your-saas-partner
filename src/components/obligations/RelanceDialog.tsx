import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Copy, Send, ArrowLeft, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLogRelance, useSendClientReminder, useClientHasPortal, type EcheancierRow } from '@/hooks/useObligations';
import { usePeriodDocuments } from '@/hooks/useObligationDocs';
import { useClient } from '@/hooks/useCRM';
import { useAuthStore } from '@/stores/authStore';
import { buildReminderPreview } from '@/lib/emailPreview';
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
  const organization = useAuthStore((s) => s.organization);
  const { data: client } = useClient(row.client_id);
  const { data: hasPortal } = useClientHasPortal(row.client_id);
  const { data: docsData } = usePeriodDocuments(row.id);
  const log = useLogRelance();
  const send = useSendClientReminder();

  const cabinet = organization?.name ?? 'D&G CONSEIL';
  const dueDateFr = format(new Date(row.due_date), 'dd/MM/yyyy');

  const missingDocs = useMemo(
    () => (docsData?.documents ?? []).filter((d) => d.is_required && d.status !== 'recue' && d.status !== 'non_applicable'),
    [docsData],
  );

  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [canal, setCanal] = useState('email');
  const [toEmail, setToEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [cc, setCc] = useState('');
  const [includeMissing, setIncludeMissing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objet, setObjet] = useState(`Pièces comptables - ${row.obligation_label} ${row.period_label}`);
  const [message, setMessage] = useState(
`Bonjour,

Dans le cadre de l'établissement de votre ${row.obligation_label} pour la période ${row.period_label}, nous n'avons pas encore reçu l'ensemble des pièces justificatives.

L'échéance de dépôt est fixée au ${dueDateFr}. Afin de respecter ce délai, nous vous remercions de bien vouloir nous transmettre les documents manquants dans les meilleurs délais.

Cordialement,
${profile?.full_name ?? ''} - ${cabinet}`
  );

  const recipient = emailTouched ? toEmail : (toEmail || client?.contact_email || '');
  const ccList = cc.split(',').map((e) => e.trim()).filter(Boolean);

  const finalMessage = useMemo(() => {
    if (!includeMissing || missingDocs.length === 0) return message;
    const list = missingDocs.map((d) => `• ${d.label}`).join('\n');
    return `${message}\n\nPièces manquantes :\n${list}`;
  }, [message, includeMissing, missingDocs]);

  const previewHtml = useMemo(
    () => buildReminderPreview(objet, finalMessage, !!hasPortal),
    [objet, finalMessage, hasPortal],
  );

  const isEmail = canal === 'email';
  const canPreview = objet.trim() && finalMessage.trim() && (!isEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient));

  const copy = async () => {
    await navigator.clipboard.writeText(finalMessage);
    toast.success('Message copié');
  };

  const logOnly = () => {
    log.mutate({
      client_id: row.client_id,
      obligation_period_id: row.id,
      title: objet,
      description: finalMessage,
      canal,
    }, { onSuccess: () => onOpenChange(false) });
  };

  const doSend = () => {
    setError(null);
    send.mutate({
      obligation_period_id: row.id,
      to_email: recipient,
      cc_emails: ccList,
      subject: objet,
      message: finalMessage,
      canal,
    }, {
      onSuccess: () => {
        toast.success(`Relance envoyée à ${recipient}`);
        onOpenChange(false);
      },
      onError: (e: Error) => setError(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relancer {row.client_name} - {row.obligation_label} {row.period_label}</DialogTitle>
        </DialogHeader>

        {step === 'edit' ? (
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
                <Label>Destinataire</Label>
                <Input
                  type="email"
                  className="mt-1"
                  placeholder="adresse@client.com"
                  value={recipient}
                  onChange={(e) => { setEmailTouched(true); setToEmail(e.target.value); }}
                />
              </div>
            </div>

            {isEmail && (
              <div>
                <Label>En copie (optionnel)</Label>
                <Input
                  className="mt-1"
                  placeholder="compta@client.com, dg@client.com"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                />
              </div>
            )}

            <div>
              <Label>Objet</Label>
              <Input className="mt-1" value={objet} onChange={(e) => setObjet(e.target.value)} />
            </div>

            <div>
              <Label>Message</Label>
              <Textarea className="mt-1 font-mono text-sm" rows={12} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            {missingDocs.length > 0 && (
              <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={includeMissing} onCheckedChange={(v) => setIncludeMissing(!!v)} />
                  Inclure la liste des pièces manquantes dans le message
                </label>
                <ul className="text-xs text-muted-foreground list-disc pl-6 space-y-0.5">
                  {missingDocs.map((d) => <li key={d.id}>{d.label}</li>)}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={copy}><Copy className="h-4 w-4 mr-2" /> Copier le message</Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
              {isEmail ? (
                <Button onClick={() => setStep('preview')} disabled={!canPreview}>Aperçu</Button>
              ) : (
                <Button onClick={logOnly} disabled={log.isPending}>
                  <Send className="h-4 w-4 mr-2" /> Enregistrer la relance
                </Button>
              )}
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm space-y-1 bg-muted/30">
              <div><span className="text-muted-foreground">À :</span> <b>{recipient}</b></div>
              {ccList.length > 0 && <div><span className="text-muted-foreground">Copie :</span> {ccList.join(', ')}</div>}
              <div><span className="text-muted-foreground">Objet :</span> {objet}</div>
            </div>

            <iframe
              title="Aperçu de l'email"
              srcDoc={previewHtml}
              className="w-full h-[420px] rounded-lg border bg-white"
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('edit')} disabled={send.isPending}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Modifier
              </Button>
              <Button onClick={doSend} disabled={send.isPending}>
                <Send className="h-4 w-4 mr-2" /> {send.isPending ? 'Envoi en cours…' : 'Envoyer'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RelanceDialog;
