import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  useTicket, useReplyTicket, useUpdateTicket, useSuperAdminTickets,
  TICKET_STATUS_LABELS, TICKET_STATUS_ORDER, TICKET_PRIORITY_LABELS, TICKET_PRIORITY_ORDER,
  TICKET_CATEGORY_LABELS,
} from '@/hooks/useSupport';
import { usePlatformAdmins } from '@/hooks/useSuperAdmin';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Stethoscope, Send, CheckCircle2 } from 'lucide-react';

export default function SuperAdminSupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useTicket(id);
  const { data: tickets = [] } = useSuperAdminTickets(null);
  const { data: admins = [] } = usePlatformAdmins();
  const reply = useReplyTicket();
  const update = useUpdateTicket();

  const [message, setMessage] = useState('');
  const [internal, setInternal] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState('');

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  const { ticket, messages } = data;
  const row = tickets.find((t) => t.id === ticket.id);

  const send = () => {
    if (message.trim().length < 2) return;
    reply.mutate(
      { ticketId: ticket.id, message, isPlatformSide: true, isInternalNote: internal },
      { onSuccess: () => { setMessage(''); setInternal(false); } },
    );
  };

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin/support')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Support
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="tabular-nums text-xs">{ticket.reference}</span>
            {row?.organization_name && (
              <>
                {' · '}
                <Link className="hover:underline" to={`/super-admin/organisations/${ticket.organization_id}`}>
                  {row.organization_name}
                </Link>
              </>
            )}
            {row?.created_by_name && ` · ${row.created_by_name}`}
          </p>
        </div>
        <Badge variant="outline">{TICKET_CATEGORY_LABELS[ticket.category ?? ''] ?? ticket.category}</Badge>
        <Badge
          className={cn(
            ticket.priority === 'urgente' ? 'bg-destructive text-destructive-foreground'
              : ticket.priority === 'haute' ? 'bg-amber-500 text-white'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {TICKET_PRIORITY_LABELS[ticket.priority ?? ''] ?? ticket.priority}
        </Badge>
        {ticket.organization_id && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() =>
              window.open(`/super-admin/organisations/${ticket.organization_id}?tab=diagnostic`, '_blank')
            }
          >
            <Stethoscope className="mr-1.5 h-4 w-4" /> Diagnostic
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Demande initiale</CardTitle></CardHeader>
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
              {messages.length === 0 && <p className="text-sm text-muted-foreground">Aucun échange pour le moment.</p>}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'rounded-md border p-3',
                    m.is_internal_note ? 'border-amber-500/40 bg-amber-500/10' : m.is_platform_side ? 'bg-muted/50' : '',
                  )}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{m.author_name}</span>
                    <span>{m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy HH:mm') : ''}</span>
                    {m.is_internal_note && (
                      <span className="font-medium text-amber-700">Note interne - non visible par le cabinet</span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{m.message}</p>
                </div>
              ))}

              <div className="space-y-2 border-t pt-3">
                <Textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Votre réponse au cabinet"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={internal} onCheckedChange={(v) => setInternal(!!v)} />
                    Note interne
                  </label>
                  <Button className="ml-auto" onClick={send} disabled={reply.isPending || message.trim().length < 2}>
                    <Send className="mr-1.5 h-4 w-4" /> Envoyer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Traitement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={ticket.status} onValueChange={(v) => update.mutate({ ticketId: ticket.id, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{TICKET_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priorité</Label>
              <Select
                value={ticket.priority ?? 'normale'}
                onValueChange={(v) => update.mutate({ ticketId: ticket.id, priority: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITY_ORDER.map((p) => (
                    <SelectItem key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Affectation</Label>
              <Select
                value={ticket.assigned_to ?? 'none'}
                onValueChange={(v) => update.mutate({ ticketId: ticket.id, assigned_to: v === 'none' ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Non affectée" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non affectée</SelectItem>
                  {(admins as any[]).filter((a) => a.is_active).map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>{a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {ticket.resolved_at ? (
              <div className="rounded-md border border-emerald-600/40 bg-emerald-600/10 p-3 text-sm">
                <p className="font-medium">Résolue le {format(new Date(ticket.resolved_at), 'dd/MM/yyyy')}</p>
                {ticket.resolution && <p className="text-muted-foreground">{ticket.resolution}</p>}
              </div>
            ) : (
              <Button className="w-full" onClick={() => setResolveOpen(true)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Résoudre
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Résoudre la demande</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Synthèse de résolution</Label>
            <Textarea rows={4} value={resolution} onChange={(e) => setResolution(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Annuler</Button>
            <Button
              disabled={resolution.trim().length < 5}
              onClick={() =>
                update.mutate(
                  { ticketId: ticket.id, resolve: true, resolution: resolution.trim() },
                  { onSuccess: () => { setResolveOpen(false); setResolution(''); } },
                )
              }
            >
              Marquer comme résolue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
