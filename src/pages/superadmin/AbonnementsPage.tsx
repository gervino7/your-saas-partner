import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllOrgs, usePlanChanges } from '@/hooks/useSuperAdmin';
import { computeMrr, planBreakdown, fcfa, planOf, daysUntil } from '@/lib/superAdmin';
import { PLANS } from '@/lib/plans';
import { format } from 'date-fns';

export default function AbonnementsPage() {
  const { data: orgs = [], isLoading } = useAllOrgs();
  const { data: changes = [] } = usePlanChanges(50);

  const mrr = useMemo(() => computeMrr(orgs as any), [orgs]);
  const breakdown = useMemo(() => planBreakdown(orgs as any), [orgs]);
  const trials = useMemo(
    () => (orgs as any[]).filter((o) => o.trial_ends_at && (daysUntil(o.trial_ends_at) ?? 99) <= 14),
    [orgs],
  );

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Abonnements</h1>
        <p className="text-sm text-muted-foreground">Revenus estimés à partir des plans attribués</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">MRR / ARR estimés</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-3xl font-bold text-primary">{fcfa(mrr)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ARR</p>
              <p className="text-3xl font-bold">{fcfa(mrr * 12)}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {breakdown.map((b) => (
              <div key={b.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.count} organisation(s)</p>
                <p className="text-sm font-semibold">{fcfa(b.subtotal)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Essais arrivant à échéance (≤ 14 jours)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {trials.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Aucun essai à échéance proche.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Fin d'essai</TableHead>
                  <TableHead>Jours restants</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trials.map((o: any) => {
                  const left = daysUntil(o.trial_ends_at) ?? 0;
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link className="font-medium hover:underline" to={`/super-admin/organisations/${o.id}`}>{o.name}</Link>
                      </TableCell>
                      <TableCell><Badge variant="outline">{PLANS[planOf(o.subscription_plan)].name}</Badge></TableCell>
                      <TableCell>{format(new Date(o.trial_ends_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={left <= 3 ? 'destructive' : 'outline'}>J-{Math.max(left, 0)}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Changements de plan récents</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Changement</TableHead>
                <TableHead>Par</TableHead>
                <TableHead>Motif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(changes as any[]).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{c.created_at ? format(new Date(c.created_at), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                  <TableCell className="text-sm">
                    <Link className="hover:underline" to={`/super-admin/organisations/${c.organization_id}`}>
                      {c.organizations?.name ?? c.organization_id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{c.old_plan ?? '—'} → <strong>{c.new_plan}</strong></TableCell>
                  <TableCell className="text-sm">{c.changed_by_email ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.reason ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
