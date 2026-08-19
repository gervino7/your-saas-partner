import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllOrgs, useToggleOrg, useIsPlatformAdmin } from '@/hooks/useSuperAdmin';
import PlanChangeDialog from '@/components/superadmin/PlanChangeDialog';
import SuspendDialog from '@/components/superadmin/SuspendDialog';
import { usePlans } from '@/hooks/usePlans';
import { planOf, planNameOf, daysUntil, daysSince, barClass } from '@/lib/superAdmin';
import { exportToCSV } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { Download, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type Org = any;

export default function OrganisationsListPage() {
  const navigate = useNavigate();
  const { data: orgs = [], isLoading } = useAllOrgs();
  const { canManage } = useIsPlatformAdmin();
  const toggleOrg = useToggleOrg();
  const { data: plans = [] } = usePlans();


  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [country, setCountry] = useState('all');
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [planOrg, setPlanOrg] = useState<Org | null>(null);
  const [suspendOrg, setSuspendOrg] = useState<Org | null>(null);

  const countries = useMemo(
    () => Array.from(new Set((orgs as Org[]).map((o) => o.country).filter(Boolean))) as string[],
    [orgs],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = (orgs as Org[]).filter((o) => {
      if (q && ![o.name, o.slug, o.billing_email].some((v) => (v ?? '').toLowerCase().includes(q))) return false;
      if (plan !== 'all' && planOf(plans, o.subscription_plan) !== plan) return false;
      if (country !== 'all' && o.country !== country) return false;
      if (status === 'active' && o.is_active === false) return false;
      if (status === 'suspended' && o.is_active !== false) return false;
      if (status === 'trial' && !o.trial_ends_at) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'fr');
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [orgs, plans, search, plan, status, country, sortKey, sortAsc]);

  const sort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const Th = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => sort(k)}>
      {children}{sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : ''}
    </TableHead>
  );

  const usageBar = (used: number, max: number) => {
    const pct = max > 0 ? (used / max) * 100 : 0;
    return (
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full', barClass(pct))} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    );
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Organisations</h1>
          <p className="text-sm text-muted-foreground">{rows.length} organisation(s)</p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            exportToCSV(
              rows.map((o) => ({
                nom: o.name, slug: o.slug, plan: planNameOf(plans, o.subscription_plan),
                utilisateurs: `${o.user_count}/${o.max_users}`, missions: o.mission_count,
                clients: o.client_count, stockage_mo: o.storage_used_mb,
                statut: o.is_active === false ? 'Suspendue' : 'Active',
              })),
              'organisations',
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Nom, slug, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={plan} onValueChange={setPlan}>
            <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les plans</SelectItem>
              {plans.map((p) => <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="active">Actives</SelectItem>
              <SelectItem value="suspended">Suspendues</SelectItem>
              <SelectItem value="trial">En essai</SelectItem>
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue placeholder="Pays" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les pays</SelectItem>
              {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <Th k="name">Organisation</Th>
                <Th k="subscription_plan">Plan</Th>
                <Th k="user_count">Utilisateurs</Th>
                <Th k="mission_count">Missions</Th>
                <Th k="client_count">Clients</Th>
                <Th k="storage_used_mb">Stockage</Th>
                <Th k="last_activity">Dernière activité</Th>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => {
                const inactiveDays = daysSince(o.last_activity);
                const trialLeft = daysUntil(o.trial_ends_at);
                return (
                  <TableRow key={o.id} className={o.is_active === false ? 'bg-destructive/5' : undefined}>
                    <TableCell>
                      <p className="font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.slug}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline">{planNameOf(plans, o.subscription_plan)}</Badge></TableCell>
                    <TableCell>
                      <span className="text-sm">{o.user_count} / {o.max_users}</span>
                      {usageBar(Number(o.user_count ?? 0), Number(o.max_users ?? 0))}
                    </TableCell>
                    <TableCell>{o.mission_count}</TableCell>
                    <TableCell>{o.client_count}</TableCell>
                    <TableCell>
                      <span className="text-sm">{Number(o.storage_used_mb ?? 0).toFixed(0)} Mo / {o.max_storage_gb} Go</span>
                      {usageBar(Number(o.storage_used_mb ?? 0) / 1024, Number(o.max_storage_gb ?? 0))}
                    </TableCell>
                    <TableCell>
                      {!o.last_activity ? (
                        <span className="text-xs text-muted-foreground">Jamais</span>
                      ) : inactiveDays !== null && inactiveDays > 30 ? (
                        <Badge variant="destructive">Inactif &gt; 30j</Badge>
                      ) : (
                        <span className="text-xs">
                          {formatDistanceToNow(new Date(o.last_activity), { addSuffix: true, locale: fr })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {o.is_active === false ? (
                        <Badge variant="destructive">Suspendue</Badge>
                      ) : trialLeft !== null ? (
                        <Badge className="bg-blue-600 text-white">Essai (J-{Math.max(trialLeft, 0)})</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/super-admin/organisations/${o.id}`)}>Voir</Button>
                        {canManage && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => setPlanOrg(o)}>Changer le plan</Button>
                            {o.is_active === false ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleOrg.mutate({ _org_id: o.id, _activate: true })}
                              >
                                Réactiver
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setSuspendOrg(o)}>
                                Suspendre
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PlanChangeDialog open={!!planOrg} onOpenChange={(v) => !v && setPlanOrg(null)} org={planOrg} />
      <SuspendDialog open={!!suspendOrg} onOpenChange={(v) => !v && setSuspendOrg(null)} org={suspendOrg} />
    </div>
  );
}
