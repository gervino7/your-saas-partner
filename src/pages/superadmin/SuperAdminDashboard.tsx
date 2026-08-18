import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useSuperAdminKpis, useGrowth, useAllOrgs, usePlatformHealth } from '@/hooks/useSuperAdmin';
import { computeMrr, planBreakdown, fcfa, ALERT_META } from '@/lib/superAdmin';
import { usePlans } from '@/hooks/usePlans';
import { AlertTriangle } from 'lucide-react';

const COLORS = ['#16519C', '#E67433', '#2E9E6B', '#B5852E'];

const Kpi = ({ label, value, danger }: { label: string; value: React.ReactNode; danger?: boolean }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${danger ? 'text-destructive' : ''}`}>{value}</p>
    </CardContent>
  </Card>
);

export default function SuperAdminDashboard() {
  const { data: kpis, isLoading } = useSuperAdminKpis();
  const { data: growth = [] } = useGrowth(12);
  const { data: orgs = [] } = useAllOrgs();
  const { data: health = [] } = usePlatformHealth();

  const { data: plans = [] } = usePlans();
  const mrr = useMemo(() => computeMrr(plans, orgs as any), [plans, orgs]);
  const breakdown = useMemo(() => planBreakdown(plans, orgs as any), [plans, orgs]);
  const alerts = (health as any[]).filter((h) => h.alert_level !== 'ok');

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Tableau de bord plateforme</h1>
        <p className="text-sm text-muted-foreground">Vue consolidée de toutes les organisations</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Organisations totales" value={kpis?.total_orgs ?? 0} />
        <Kpi label="Actives" value={kpis?.active_orgs ?? 0} />
        <Kpi label="Suspendues" value={kpis?.suspended_orgs ?? 0} danger={Number(kpis?.suspended_orgs ?? 0) > 0} />
        <Kpi label="En essai" value={kpis?.trial_orgs ?? 0} />
        <Kpi label="Utilisateurs totaux" value={kpis?.total_users ?? 0} />
        <Kpi label="Actifs 30j" value={kpis?.active_users_30d ?? 0} />
        <Kpi label="Nouvelles orgs 30j" value={kpis?.new_orgs_30d ?? 0} />
        <Kpi label="Missions totales" value={kpis?.total_missions ?? 0} />
        <Kpi label="Clients totaux" value={kpis?.total_clients ?? 0} />
        <Kpi label="Stockage total" value={`${Number(kpis?.storage_total_gb ?? 0).toFixed(1)} Go`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MRR estimé</CardTitle>
          <p className="text-xs text-muted-foreground">
            Basé sur les plans attribués — ne reflète pas les paiements encaissés.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-3xl font-bold text-primary">{fcfa(mrr)}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {breakdown.map((b) => (
              <div key={b.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">
                  {b.count} × {b.price.toLocaleString('fr-FR')} FCFA
                </p>
                <p className="text-sm font-semibold">{fcfa(b.subtotal)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">Organisations à surveiller</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((a) => (
              <Link
                key={a.org_id}
                to={`/super-admin/organisations/${a.org_id}`}
                className="flex items-center justify-between rounded-md border p-2 text-sm hover:bg-muted"
              >
                <span className="font-medium">{a.org_name}</span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(a.users_pct)}% util. · {Math.round(a.storage_pct)}% stockage
                </span>
                <Badge className={ALERT_META[a.alert_level]?.className}>
                  {ALERT_META[a.alert_level]?.label ?? a.alert_level}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Organisations cumulées (12 mois)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth as any[]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="cumulative_orgs" name="Organisations" stroke="#16519C" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Nouvelles organisations & utilisateurs</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth as any[]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="new_orgs" name="Nouvelles orgs" fill="#16519C" />
                <Bar dataKey="new_users" name="Nouveaux utilisateurs" fill="#E67433" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Répartition par plan</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={breakdown.filter((b) => b.count > 0)} dataKey="count" nameKey="name" outerRadius={90} label>
                  {breakdown.filter((b) => b.count > 0).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
