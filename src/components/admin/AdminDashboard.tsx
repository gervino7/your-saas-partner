import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminKPIs, useMissionsByMonth, useUtilizationByGrade, useTaskStatusDistribution } from '@/hooks/useAdmin';
import { useMissionBudgetSummary } from '@/hooks/useTimesheets';
import { Briefcase, Users, Clock, DollarSign, Star, Heart } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))',
  'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--accent))',
  'hsl(var(--muted-foreground))',
];

function KPICard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: kpis } = useAdminKPIs();
  const { data: missionsByMonth = [] } = useMissionsByMonth();
  const { data: utilByGrade = [] } = useUtilizationByGrade();
  const { data: taskDist = [] } = useTaskStatusDistribution();
  const { data: budgetSummaries = [] } = useMissionBudgetSummary();

  const scatterData = budgetSummaries
    .filter((m: any) => m.budget > 0)
    .map((m: any) => ({
      name: m.name,
      budget: m.budget,
      margin: m.budget - m.total_cost,
      marginPct: Math.round(((m.budget - m.total_cost) / m.budget) * 100),
    }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard icon={Briefcase} label="Missions actives" value={`${kpis?.activeMissions ?? 0} / ${kpis?.totalMissions ?? 0}`} />
        <KPICard icon={Users} label="Utilisateurs actifs" value={`${kpis?.activeToday ?? 0} / ${kpis?.totalUsers ?? 0}`} sub="aujourd'hui" />
        <KPICard icon={Clock} label="Taux d'utilisation" value={`${kpis?.utilization ?? 0}%`} sub={`${kpis?.billableHours?.toFixed(0) ?? 0}h fact.`} />
        <KPICard icon={DollarSign} label="Revenu mensuel" value={`${(kpis?.monthlyRevenue ?? 0).toLocaleString('fr-FR')} FCFA`} />
        <KPICard icon={Star} label="Score qualité" value={kpis?.avgQuality ? `${kpis.avgQuality.toFixed(1)}/4` : '—'} />
        <KPICard icon={Heart} label="Satisfaction client" value={kpis?.avgSatisfaction ? `${kpis.avgSatisfaction.toFixed(1)}/5` : '—'} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Missions by month */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Missions par mois</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={missionsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="active" stackId="a" fill="hsl(var(--success))" name="Active" />
                  <Bar dataKey="draft" stackId="a" fill="hsl(var(--muted-foreground))" name="Brouillon" />
                  <Bar dataKey="completed" stackId="a" fill="hsl(var(--info))" name="Terminée" />
                  <Bar dataKey="planning" stackId="a" fill="hsl(var(--warning))" name="Planification" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Utilization by grade */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Taux d'utilisation par grade</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilByGrade} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} className="text-xs" />
                  <YAxis type="category" dataKey="grade" className="text-xs" width={50} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="utilization" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Margin scatter */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Rentabilité par mission</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {scatterData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Aucune donnée budgétaire</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" dataKey="budget" name="Budget" className="text-xs" tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                    <YAxis type="number" dataKey="marginPct" name="Marge %" className="text-xs" />
                    <ZAxis range={[60, 400]} />
                    <Tooltip formatter={(v: number, name: string) => name === 'Budget' ? `${v.toLocaleString('fr-FR')} FCFA` : `${v}%`} />
                    <Scatter data={scatterData} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Task status distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Répartition des tâches par statut</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {taskDist.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Aucune tâche</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={taskDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                      {taskDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
