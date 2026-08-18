import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTeamPlans, useReviewPlan, useWorkload, type PlanEntry } from '@/hooks/usePlanning';
import { formatHours } from '@/lib/timeUtils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABEL: Record<string, string> = {
  mission: 'Mission', rendez_vous: 'RDV', formation: 'Formation', admin: 'Admin', conge: 'Congé',
};

export default function TeamPlanReview({ weekStart }: { weekStart: Date }) {
  const { data: entries = [] } = useTeamPlans(weekStart);
  const { data: workload = [] } = useWorkload(weekStart);
  const review = useReviewPlan();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectDialog, setRejectDialog] = useState<{ ids: string[]; comment: string } | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; grade: string; items: PlanEntry[] }>();
    for (const e of entries) {
      const key = e.user_id;
      if (!map.has(key)) {
        map.set(key, { name: e.profile?.full_name ?? '-', grade: e.profile?.grade ?? '', items: [] });
      }
      map.get(key)!.items.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const approveAll = (ids: string[]) => review.mutate({ ids, status: 'approved' });
  const openReject = (ids: string[]) => setRejectDialog({ ids, comment: '' });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Charge de l'équipe</CardTitle>
        </CardHeader>
        <CardContent>
          {(workload as any[]).length === 0 ? (
            <p className="text-sm text-muted-foreground">Pas de données de charge pour cette semaine.</p>
          ) : (
            <div className="space-y-2">
              {(workload as any[]).map((w) => {
                const rate = Number(w.load_rate ?? 0);
                const color = rate < 85 ? 'bg-success' : rate <= 100 ? 'bg-warning' : 'bg-destructive';
                return (
                  <div key={w.user_id} className="flex items-center gap-3">
                    <div className="w-56 text-sm">
                      <span className="font-medium">{w.full_name}</span>
                      <Badge variant="outline" className="ml-2 text-[10px]">{w.grade}</Badge>
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${Math.min(rate, 150)}%` }} />
                      </div>
                    </div>
                    <div className="w-40 text-right text-sm tabular-nums text-muted-foreground">
                      {formatHours(Number(w.planned_hours))} / {formatHours(Number(w.capacity_hours))}
                    </div>
                    <div className="w-24 text-right text-sm font-medium">{rate}%</div>
                    {w.is_overloaded && <Badge variant="destructive" className="text-[10px]">Surcharge</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plannings à valider</CardTitle>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun planning en attente de validation.</p>
          ) : (
            <Accordion type="multiple">
              {grouped.map(([uid, group]) => {
                const total = group.items.reduce((sum, i) => sum + Number(i.planned_hours || 0), 0);
                const ids = group.items.map((i) => i.id);
                return (
                  <AccordionItem key={uid} value={uid}>
                    <AccordionTrigger>
                      <div className="flex flex-1 items-center justify-between pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group.name}</span>
                          <Badge variant="outline" className="text-[10px]">{group.grade}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {group.items.length} entrées · {formatHours(total)}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex gap-2 mb-3">
                        <Button size="sm" onClick={() => approveAll(ids)} className="bg-success hover:bg-success/90">
                          Tout valider
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openReject(ids)}>
                          Renvoyer
                        </Button>
                        {selected.size > 0 && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => approveAll(Array.from(selected))}>
                              Valider sélection ({selected.size})
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openReject(Array.from(selected))}>
                              Renvoyer sélection
                            </Button>
                          </>
                        )}
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Mission / Projet / Tâche</TableHead>
                            <TableHead>Heures</TableHead>
                            <TableHead>Intitulé</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((it) => (
                            <TableRow key={it.id}>
                              <TableCell>
                                <Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggle(it.id)} />
                              </TableCell>
                              <TableCell>{format(new Date(it.plan_date), 'EEE dd/MM', { locale: fr })}</TableCell>
                              <TableCell>{TYPE_LABEL[it.entry_type] ?? it.entry_type}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {[it.mission?.name, it.project?.name, it.task?.title].filter(Boolean).join(' / ') || '-'}
                              </TableCell>
                              <TableCell>{formatHours(Number(it.planned_hours))}</TableCell>
                              <TableCell>{it.title ?? '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectDialog} onOpenChange={(v) => !v && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renvoyer pour correction</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Précisez ce qui doit être corrigé :</p>
            <Textarea
              value={rejectDialog?.comment ?? ''}
              onChange={(e) => setRejectDialog((r) => r ? { ...r, comment: e.target.value } : r)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={!rejectDialog?.comment.trim() || review.isPending}
              onClick={async () => {
                if (!rejectDialog) return;
                await review.mutateAsync({ ids: rejectDialog.ids, status: 'rejected', review_comment: rejectDialog.comment.trim() });
                setRejectDialog(null);
                setSelected(new Set());
              }}
            >
              Renvoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
