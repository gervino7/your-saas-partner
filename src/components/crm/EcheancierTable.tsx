import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, ArrowRight, FileClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEcheancier, useUpdateObligation, type EcheancierRow } from '@/hooks/useObligations';
import { statusBadgeClasses, statusLabel, nextStatus } from '@/lib/obligations';
import ObligationDetailDialog from '@/components/obligations/ObligationDetailDialog';
import RelanceDialog from '@/components/obligations/RelanceDialog';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

interface Props {
  clientId: string;
}

const EcheancierTable = ({ clientId }: Props) => {
  const from = format(addDays(new Date(), -30), 'yyyy-MM-dd');
  const to = format(addDays(new Date(), 120), 'yyyy-MM-dd');
  const { data: rows = [], isLoading } = useEcheancier({ from, to, clientId });
  const update = useUpdateObligation();
  const [detail, setDetail] = useState<EcheancierRow | null>(null);
  const [relance, setRelance] = useState<EcheancierRow | null>(null);

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Chargement…</div>;
  if (rows.length === 0) return <EmptyState icon={FileClock} title="Aucune échéance" description="Aucune obligation active pour ce client sur la période." />;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Obligation</TableHead>
            <TableHead>Période</TableHead>
            <TableHead>Échéance</TableHead>
            <TableHead>J‑X</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const jx = r.is_late
              ? <Badge variant="destructive">Retard {Math.abs(r.days_left)}j</Badge>
              : r.days_left <= 7
                ? <Badge className="bg-amber-500 hover:bg-amber-500 text-white">J‑{r.days_left}</Badge>
                : <Badge variant="secondary">J‑{r.days_left}</Badge>;
            const nxt = nextStatus(r.status);
            return (
              <TableRow
                key={r.id}
                className={cn('cursor-pointer hover:bg-muted/50', r.is_late && 'border-l-4 border-l-destructive')}
                onClick={() => setDetail(r)}
              >
                <TableCell>
                  <div className="text-sm font-medium">{r.obligation_label}</div>
                  <div className="text-[11px] text-muted-foreground">{r.obligation_code}</div>
                </TableCell>
                <TableCell className="text-sm">{r.period_label}</TableCell>
                <TableCell className="text-sm">{format(new Date(r.due_date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                <TableCell>{jx}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusBadgeClasses(r.status)}>{statusLabel(r.status)}</Badge>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    {r.status === 'pieces_attendues' && (
                      <Button size="sm" variant="outline" onClick={() => setRelance(r)}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Relancer
                      </Button>
                    )}
                    {nxt && (
                      <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: r.id, status: nxt })}>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {detail && (
        <ObligationDetailDialog row={detail} open={!!detail} onOpenChange={(o) => !o && setDetail(null)} onRelance={(r) => setRelance(r)} />
      )}
      {relance && (
        <RelanceDialog row={relance} open={!!relance} onOpenChange={(o) => !o && setRelance(null)} />
      )}
    </>
  );
};

export default EcheancierTable;
