import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Send, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useSendClientReminder, type EcheancierRow } from '@/hooks/useObligations';
import { useAuthStore } from '@/stores/authStore';
import { buildReminderPreview } from '@/lib/emailPreview';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Props {
  rows: EcheancierRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function substitute(tpl: string, r: EcheancierRow) {
  return tpl
    .replaceAll('{client}', r.client_name)
    .replaceAll('{obligation}', r.obligation_label)
    .replaceAll('{periode}', r.period_label)
    .replaceAll('{echeance}', format(new Date(r.due_date), 'dd/MM/yyyy'));
}

const BulkRelanceDialog = ({ rows, open, onOpenChange }: Props) => {
  const profile = useAuthStore((s) => s.profile);
  const organization = useAuthStore((s) => s.organization);
  const cabinet = organization?.name ?? 'D&G CONSEIL';
  const send = useSendClientReminder();

  const clientIds = useMemo(() => [...new Set(rows.map((r) => r.client_id))], [rows]);
  const { data: emails = {} } = useQuery({
    queryKey: ['bulk-relance-emails', clientIds],
    enabled: open && clientIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, contact_email').in('id', clientIds);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      for (const c of data ?? []) map[c.id] = c.contact_email;
      return map;
    },
  });

  const [step, setStep] = useState<'edit' | 'preview'>('edit');
  const [objet, setObjet] = useState('Pièces comptables — {obligation} {periode}');
  const [message, setMessage] = useState(
`Bonjour,

Dans le cadre de l'établissement de votre {obligation} pour la période {periode}, nous n'avons pas encore reçu l'ensemble des pièces justificatives.

L'échéance de dépôt est fixée au {echeance}. Afin de respecter ce délai, nous vous remercions de bien vouloir nous transmettre les documents manquants dans les meilleurs délais.

Cordialement,
${profile?.full_name ?? ''} — ${cabinet}`
  );
  const [progress, setProgress] = useState<number | null>(null);

  const targets = rows.map((r) => ({ row: r, email: (emails[r.client_id] ?? '').trim() }));
  const sendable = targets.filter((t) => EMAIL_RE.test(t.email));
  const skipped = targets.filter((t) => !EMAIL_RE.test(t.email));

  const previewHtml = useMemo(() => {
    const first = sendable[0]?.row ?? rows[0];
    if (!first) return '';
    return buildReminderPreview(substitute(objet, first), substitute(message, first), false);
  }, [objet, message, sendable, rows]);

  const run = async () => {
    let ok = 0;
    let fail = 0;
    setProgress(0);
    for (let i = 0; i < sendable.length; i++) {
      const { row, email } = sendable[i];
      try {
        await send.mutateAsync({
          obligation_period_id: row.id,
          to_email: email,
          subject: substitute(objet, row),
          message: substitute(message, row),
          canal: 'email',
        });
        ok++;
      } catch {
        fail++;
      }
      setProgress(Math.round(((i + 1) / sendable.length) * 100));
    }
    setProgress(null);
    const skippedNote = skipped.length ? ` — ${skipped.length} ignorée(s) (sans email)` : '';
    toast[fail ? 'warning' : 'success'](`${ok} relance(s) envoyée(s), ${fail} échec(s)${skippedNote}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (progress === null) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relancer la sélection ({rows.length})</DialogTitle>
        </DialogHeader>

        {step === 'edit' ? (
          <div className="space-y-4">
            <div className="rounded-lg border divide-y max-h-56 overflow-y-auto">
              {targets.map(({ row, email }) => (
                <div key={row.id} className="flex items-center justify-between gap-3 p-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{row.client_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{row.obligation_label} · {row.period_label}</div>
                  </div>
                  {EMAIL_RE.test(email) ? (
                    <span className="text-xs text-muted-foreground truncate">{email}</span>
                  ) : (
                    <span className="text-xs text-destructive inline-flex items-center gap-1 shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5" /> Aucun email
                    </span>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Variables disponibles : {'{client}'}, {'{obligation}'}, {'{periode}'}, {'{echeance}'}
            </p>

            <div>
              <Label>Objet</Label>
              <Input className="mt-1" value={objet} onChange={(e) => setObjet(e.target.value)} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea className="mt-1 font-mono text-sm" rows={11} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button onClick={() => setStep('preview')} disabled={sendable.length === 0 || !objet.trim() || !message.trim()}>
                Aperçu
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Aperçu du premier message — les autres suivront le même modèle.
              {skipped.length > 0 && ` ${skipped.length} destinataire(s) sans email seront ignorés.`}
            </p>
            <iframe title="Aperçu" srcDoc={previewHtml} className="w-full h-[400px] rounded-lg border bg-white" />
            {progress !== null && <Progress value={progress} />}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('edit')} disabled={progress !== null}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Modifier
              </Button>
              <Button onClick={run} disabled={progress !== null}>
                <Send className="h-4 w-4 mr-2" />
                {progress !== null ? 'Envoi en cours…' : `Envoyer (${sendable.length})`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkRelanceDialog;
