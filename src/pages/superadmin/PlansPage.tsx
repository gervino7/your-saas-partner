import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllPlans, useUpsertPlan } from '@/hooks/usePlans';
import { useAllOrgs, useIsPlatformAdmin } from '@/hooks/useSuperAdmin';
import PlanFormDialog from '@/components/superadmin/PlanFormDialog';
import { formatFcfa, formatQuota, type Plan } from '@/lib/plans';
import { Plus, Pencil, Power } from 'lucide-react';

export default function PlansPage() {
  const { data: plans = [], isLoading } = useAllPlans();
  const { data: orgs = [] } = useAllOrgs();
  const { canManage } = useIsPlatformAdmin();
  const upsert = useUpsertPlan();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  const usage = useMemo(() => {
    const map: Record<string, number> = {};
    (orgs as any[]).forEach((o) => {
      const code = o.subscription_plan ?? 'free';
      map[code] = (map[code] ?? 0) + 1;
    });
    return map;
  }, [orgs]);

  const toggle = (p: Plan) =>
    upsert.mutate({
      _code: p.code,
      _name: p.name,
      _price_monthly: p.price_monthly,
      _max_users: p.max_users,
      _max_missions: p.max_missions,
      _max_storage_gb: p.max_storage_gb,
      _features: p.features,
      _description: p.description,
      _is_active: !p.is_active,
      _is_public: p.is_public,
    });

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Plans</h1>
          <p className="text-sm text-muted-foreground">
            Offres commerciales lues en base - un changement de tarif ne demande aucune mise en production.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Créer un plan
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead className="text-right">Prix mensuel</TableHead>
                <TableHead className="text-right">Utilisateurs</TableHead>
                <TableHead className="text-right">Missions</TableHead>
                <TableHead className="text-right">Stockage</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead>Public</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p.id} className="h-11">
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell className="font-medium">
                    {p.name}
                    {usage[p.code] ? (
                      <span className="ml-2 text-xs text-muted-foreground">{usage[p.code]} organisation(s)</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">{formatFcfa(p.price_monthly)}</TableCell>
                  <TableCell className="text-right">{formatQuota(p.max_users)}</TableCell>
                  <TableCell className="text-right">{formatQuota(p.max_missions)}</TableCell>
                  <TableCell className="text-right">{p.max_storage_gb} Go</TableCell>
                  <TableCell>
                    {p.is_active
                      ? <Badge className="bg-emerald-600 text-white">Actif</Badge>
                      : <Badge variant="outline">Inactif</Badge>}
                  </TableCell>
                  <TableCell>
                    {p.is_public
                      ? <Badge variant="outline">Public</Badge>
                      : <Badge variant="secondary">Privé</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setOpen(true); }}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Modifier
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggle(p)} disabled={upsert.isPending}>
                          <Power className="mr-1 h-3.5 w-3.5" />
                          {p.is_active ? 'Désactiver' : 'Activer'}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PlanFormDialog
        open={open}
        onOpenChange={setOpen}
        plan={editing}
        orgsUsingPlan={editing ? usage[editing.code] ?? 0 : 0}
      />
    </div>
  );
}
