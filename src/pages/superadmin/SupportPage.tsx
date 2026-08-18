import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useSuperAdminTickets, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS, TICKET_CATEGORY_LABELS,
  TICKET_STATUS_ORDER, TICKET_PRIORITY_ORDER,
} from '@/hooks/useSupport';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const priorityBadge = (p?: string | null) =>
  p === 'urgente' ? 'bg-destructive text-destructive-foreground'
    : p === 'haute' ? 'bg-amber-500 text-white'
    : 'bg-muted text-muted-foreground';

export default function SuperAdminSupportPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('open');
  const [priority, setPriority] = useState('all');
  const { data = [], isLoading } = useSuperAdminTickets(status === 'open' || status === 'all' ? null : status);

  const rows = useMemo(() => {
    let list = data;
    if (status === 'open') list = list.filter((t) => t.status !== 'ferme');
    if (priority !== 'all') list = list.filter((t) => t.priority === priority);
    return list;
  }, [data, status, priority]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Support</h1>
        <p className="text-sm text-muted-foreground">Demandes des cabinets, triées par priorité puis par date</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Demandes non fermées</SelectItem>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {TICKET_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{TICKET_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les priorités</SelectItem>
            {TICKET_PRIORITY_ORDER.map((p) => (
              <SelectItem key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Sujet</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière activité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Aucune demande pour ce filtre.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((t) => (
                  <TableRow
                    key={t.id}
                    className={cn('h-11 cursor-pointer', t.priority === 'urgente' && 'border-l-2 border-l-destructive')}
                    onClick={() => navigate(`/super-admin/support/${t.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                    <TableCell className="text-sm">{t.organization_name ?? '—'}</TableCell>
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {TICKET_CATEGORY_LABELS[t.category ?? ''] ?? t.category ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityBadge(t.priority)}>
                        {TICKET_PRIORITY_LABELS[t.priority ?? ''] ?? t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{TICKET_STATUS_LABELS[t.status] ?? t.status}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {t.last_message_at || t.created_at
                        ? format(new Date(t.last_message_at ?? t.created_at!), 'dd/MM/yyyy HH:mm')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
