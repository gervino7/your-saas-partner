import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useMyTickets, useTicket, useCreateTicket, useReplyTicket,
  TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, TICKET_PRIORITY_ORDER, TICKET_CATEGORY_LABELS,
} from '@/hooks/useSupport';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Plus, ArrowLeft, Send, LifeBuoy } from 'lucide-react';

const CATEGORIES = ['bug', 'question', 'demande', 'facturation', 'autre'];

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { data, isLoading } = useTicket(ticketId);
  const reply = useReplyTicket();
  const [message, setMessage] = useState('');

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;
  const { ticket, messages } = data;
  const closed = ticket.status === 'ferme';

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Mes demandes
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{ticket.subject}</h1>
          <p className="font-mono text-xs text-muted-foreground">{ticket.reference}</p>
        </div>
        <Badge variant="outline">{TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}</Badge>
        <Badge variant="outline">{TICKET_CATEGORY_LABELS[ticket.category ?? ''] ?? ticket.category}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Votre demande</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
          <p className="text-xs text-muted-foreground">
            {ticket.created_at ? format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm') : ''}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Échanges</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Aucune réponse pour le moment.</p>}
          {messages.map((m) => (
            <div key={m.id} className={cn('rounded-md border p-3', m.is_platform_side && 'bg-muted/50')}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{m.author_name}</span>
                <span>{m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy HH:mm') : ''}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{m.message}</p>
            </div>
          ))}

          {closed ? (
            <p className="border-t pt-3 text-sm text-muted-foreground">
              Cette demande est fermée. Créez une nouvelle demande si nécessaire.
            </p>
          ) : (
            <div className="space-y-2 border-t pt-3">
              <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Votre réponse" />
              <Button
                className="ml-auto flex"
                disabled={reply.isPending || message.trim().length < 2}
                onClick={() => reply.mutate({ ticketId, message }, { onSuccess: () => setMessage('') })}
              >
                <Send className="mr-1.5 h-4 w-4" /> Envoyer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SupportPage() {
  const { data: tickets = [], isLoading } = useMyTickets();
  const create = useCreateTicket();
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('question');
  const [priority, setPriority] = useState('normale');
  const [description, setDescription] = useState('');

  if (selected) return <TicketDetail ticketId={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Support</h1>
          <p className="text-sm text-muted-foreground">Vos demandes auprès de l'équipe Mission-DGC</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle demande
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <LifeBuoy className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aucune demande enregistrée.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créée le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id} className="h-11 cursor-pointer" onClick={() => setSelected(t.id)}>
                    <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {TICKET_CATEGORY_LABELS[t.category ?? ''] ?? t.category}
                    </TableCell>
                    <TableCell className="text-sm">{TICKET_PRIORITY_LABELS[t.priority ?? ''] ?? t.priority}</TableCell>
                    <TableCell><Badge variant="outline">{TICKET_STATUS_LABELS[t.status] ?? t.status}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {t.created_at ? format(new Date(t.created_at), 'dd/MM/yyyy') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Nouvelle demande</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Sujet</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{TICKET_CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITY_ORDER.map((p) => (
                      <SelectItem key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              disabled={subject.trim().length < 3 || description.trim().length < 10 || create.isPending}
              onClick={() =>
                create.mutate(
                  { subject, description, category, priority },
                  {
                    onSuccess: () => {
                      setOpen(false); setSubject(''); setDescription('');
                      setCategory('question'); setPriority('normale');
                    },
                  },
                )
              }
            >
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
