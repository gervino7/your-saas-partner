import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, Clock, Eye, CheckCircle, AlertCircle, History } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  useCommitteeMembers, useMailingGroup, useEnsureMailingGroup,
  useCreateGroupEmail, useSendGroupEmail, useGroupEmails,
} from '@/hooks/useCommittees';

const STATUS_ICONS: Record<string, any> = {
  draft: Clock, sent: Send, delivered: CheckCircle, opened: Eye, error: AlertCircle,
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sending: 'Envoi...', sent: 'Envoyé', delivered: 'Délivré', opened: 'Ouvert', error: 'Erreur',
};

interface Props {
  committeeId: string;
  committeeName: string;
  missionName?: string;
  canManage: boolean;
}

const GroupMailComposer = ({ committeeId, committeeName, missionName, canManage }: Props) => {
  const { data: members } = useCommitteeMembers(committeeId);
  const { data: mailingGroup } = useMailingGroup(committeeId);
  const ensureGroup = useEnsureMailingGroup();
  const createEmail = useCreateGroupEmail();
  const sendEmail = useSendGroupEmail();
  const { data: emailHistory } = useGroupEmails(mailingGroup?.id);

  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', cc: '' });
  const [tab, setTab] = useState('compose');

  useEffect(() => {
    if (committeeId && !mailingGroup) {
      ensureGroup.mutate({ committeeId, name: committeeName });
    }
  }, [committeeId, mailingGroup]);

  const recipients = members?.map((m: any) => ({
    name: m.is_external ? m.external_name : m.profiles?.full_name,
    email: m.is_external ? m.external_email : m.profiles?.email,
  })) ?? [];

  const defaultSubject = `Rapport COPIL - ${missionName ?? committeeName} - ${format(new Date(), 'dd/MM/yyyy')}`;

  const handleSend = async () => {
    if (!mailingGroup) return;
    const email = await createEmail.mutateAsync({
      group_id: mailingGroup.id,
      subject: form.subject || defaultSubject,
      body: form.body,
    });
    await sendEmail.mutateAsync(email.id);
    setComposeOpen(false);
    setForm({ subject: '', body: '', cc: '' });
  };

  if (!canManage) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5" /> Mailing groupé</CardTitle>
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Send className="h-4 w-4 mr-2" /> Envoyer un rapport</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Envoyer au {committeeName}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Destinataires ({recipients.length})</Label>
                <div className="flex flex-wrap gap-1 mt-1 p-2 border rounded-md bg-muted/50 max-h-24 overflow-y-auto">
                  {recipients.map((r, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{r.name} &lt;{r.email}&gt;</Badge>
                  ))}
                </div>
              </div>
              <div><Label>Cc (optionnel)</Label><Input value={form.cc} onChange={(e) => setForm((p) => ({ ...p, cc: e.target.value }))} placeholder="email1@example.com, email2@example.com" /></div>
              <div><Label>Objet</Label><Input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder={defaultSubject} /></div>
              <div><Label>Message</Label><Textarea value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} rows={10} placeholder="Rédigez votre message..." /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setComposeOpen(false)}>Annuler</Button>
                <Button onClick={handleSend} disabled={!form.body || sendEmail.isPending || createEmail.isPending}>
                  <Send className="h-4 w-4 mr-2" />{sendEmail.isPending ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><History className="h-4 w-4" /> Historique des envois</p>
          {emailHistory && emailHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Expéditeur</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailHistory.map((e: any) => {
                  const Icon = STATUS_ICONS[e.status ?? 'draft'] ?? Clock;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{format(new Date(e.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                      <TableCell className="font-medium">{e.subject}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.profiles?.full_name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Icon className="h-3 w-3" />{STATUS_LABELS[e.status ?? 'draft']}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-6 text-sm">Aucun envoi</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupMailComposer;
