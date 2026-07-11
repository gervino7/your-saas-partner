import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format, subDays, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Info, Users, Activity, Clock, FileUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

import { useAuthStore } from '@/stores/authStore';
import {
  useSupervisionSummary, useActivityKpis, useActivityDetail,
} from '@/hooks/useSupervision';
import { formatDuration } from '@/lib/formatDuration';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import Loading from '@/components/common/Loading';

const NAVY = '#16519C';
const COPPER = '#E67433';

const ratioColor = (r: number) => {
  if (r >= 80) return 'bg-emerald-500';
  if (r >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

const toISO = (d: Date) => format(d, 'yyyy-MM-dd');

export default function SupervisionPage() {
  const navigate = useNavigate();
  const { profile, loading } = useAuthStore();
  const gradeLevel = profile?.grade_level ?? 8;

  const [startDate, setStartDate] = useState(toISO(subDays(new Date(), 7)));
  const [endDate, setEndDate] = useState(toISO(new Date()));
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  const setRange = (preset: '7d' | '30d' | 'month') => {
    const now = new Date();
    setEndDate(toISO(now));
    if (preset === '7d') setStartDate(toISO(subDays(now, 7)));
    else if (preset === '30d') setStartDate(toISO(subDays(now, 30)));
    else setStartDate(toISO(startOfMonth(now)));
  };

  const { data: kpis } = useActivityKpis(startDate, endDate);
  const { data: rows, isLoading } = useSupervisionSummary(startDate, endDate);

  if (loading) return <Loading fullScreen message="Chargement..." />;

  if (gradeLevel > 2) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-semibold">Accès réservé aux directeurs</h2>
        <p className="text-muted-foreground">Cette page est réservée aux DA et DM.</p>
        <Button onClick={() => navigate('/', { replace: true })}>Retour au tableau de bord</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display" style={{ color: NAVY }}>
          Supervision de l'activité
        </h1>
        <p className="text-sm text-muted-foreground">
          Suivi transparent de l'usage des ressources du cabinet
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border p-3 text-sm" style={{ borderColor: `${NAVY}33`, background: `${NAVY}0d` }}>
        <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: NAVY }} />
        <span>
          Ces données proviennent de l'agent desktop installé avec le consentement des collaborateurs.
          Chaque collaborateur a accès à ses propres données.
        </span>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setRange('7d')}>7 derniers jours</Button>
        <Button variant="outline" size="sm" onClick={() => setRange('30d')}>30 derniers jours</Button>
        <Button variant="outline" size="sm" onClick={() => setRange('month')}>Ce mois</Button>
        <div className="flex items-center gap-2 ml-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto" />
          <span className="text-muted-foreground">→</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Users className="h-4 w-4" />} label="Collaborateurs actifs"
          value={`${kpis?.active_collaborators ?? 0} / ${kpis?.total_collaborators ?? 0}`} />
        <KpiCard icon={<Activity className="h-4 w-4" />} label="Taux d'activité pro. moyen"
          value={`${kpis?.avg_professional_ratio ?? 0}%`} accent={COPPER} />
        <KpiCard icon={<Clock className="h-4 w-4" />} label="Heures actives totales"
          value={`${kpis?.total_active_hours ?? 0}h`} />
        <KpiCard icon={<FileUp className="h-4 w-4" />} label="Fichiers synchronisés"
          value={String(kpis?.total_files_synced ?? 0)} />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle style={{ color: NAVY }}>Collaborateurs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8"><Loading message="Chargement..." /></div>
          ) : !rows || rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucune donnée d'activité sur la période.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collaborateur</TableHead>
                  <TableHead>Jours actifs</TableHead>
                  <TableHead>Temps actif</TableHead>
                  <TableHead>Temps professionnel</TableHead>
                  <TableHead className="w-[200px]">Taux pro</TableHead>
                  <TableHead>Fichiers</TableHead>
                  <TableHead>Dernière activité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.user_id}
                    className="cursor-pointer"
                    onClick={() => setSelectedUser({ id: r.user_id, name: r.full_name })}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.full_name}</span>
                        {r.grade && <Badge variant="secondary">{r.grade}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{r.days_active}</TableCell>
                    <TableCell>{formatDuration(r.total_active_seconds)}</TableCell>
                    <TableCell>{formatDuration(r.total_professional_seconds)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
                          <div className={`h-full ${ratioColor(Number(r.avg_professional_ratio))}`} style={{ width: `${Number(r.avg_professional_ratio)}%` }} />
                        </div>
                        <span className="text-xs w-10 text-right">{r.avg_professional_ratio}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{r.total_files_synced}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.last_activity
                        ? formatDistanceToNow(new Date(r.last_activity), { addSuffix: true, locale: fr })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DetailDialog
        user={selectedUser}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}<span>{label}</span>
        </div>
        <div className="mt-2 text-2xl font-bold font-display" style={{ color: accent ?? NAVY }}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function DetailDialog({
  user, startDate, endDate, onClose,
}: {
  user: { id: string; name: string } | null;
  startDate: string;
  endDate: string;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useActivityDetail(user?.id ?? null, startDate, endDate);

  const chartData = useMemo(() => {
    return [...(detail ?? [])]
      .sort((a, b) => a.report_date.localeCompare(b.report_date))
      .map((d) => ({
        date: format(new Date(d.report_date), 'dd/MM'),
        actif: Math.round(d.active_seconds / 60),
        pro: Math.round(d.professional_seconds / 60),
      }));
  }, [detail]);

  const latest = useMemo(() => {
    if (!detail || detail.length === 0) return null;
    return [...detail].sort((a, b) => b.report_date.localeCompare(a.report_date))[0];
  }, [detail]);

  const categoryEntries = useMemo(() => {
    const cb = (latest?.category_breakdown ?? {}) as Record<string, number>;
    const total = Object.values(cb).reduce((s, v) => s + (Number(v) || 0), 0) || 1;
    const order = ['professional', 'office', 'communication', 'browser', 'development', 'nonProfessional'];
    const labels: Record<string, string> = {
      professional: 'Professionnel',
      office: 'Bureautique',
      communication: 'Communication',
      browser: 'Navigateur',
      development: 'Développement',
      nonProfessional: 'Non professionnel',
    };
    return order
      .filter((k) => cb[k] != null)
      .map((k) => ({ key: k, label: labels[k] ?? k, value: Number(cb[k]) || 0, pct: Math.round(((Number(cb[k]) || 0) / total) * 100) }));
  }, [latest]);

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ color: NAVY }}>{user?.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <Loading message="Chargement..." />
        ) : !detail || detail.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Aucune donnée pour cette période.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Chart */}
            <Card>
              <CardHeader><CardTitle className="text-base">Activité quotidienne (minutes)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <RTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="actif" name="Temps actif" stroke={NAVY} strokeWidth={2} />
                      <Line type="monotone" dataKey="pro" name="Temps professionnel" stroke={COPPER} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Daily table */}
            <Card>
              <CardHeader><CardTitle className="text-base">Détail journalier</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Temps actif</TableHead>
                      <TableHead>Temps pro</TableHead>
                      <TableHead>Taux</TableHead>
                      <TableHead>Fichiers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.map((d) => (
                      <TableRow key={d.report_date}>
                        <TableCell>{format(new Date(d.report_date), 'dd MMM yyyy', { locale: fr })}</TableCell>
                        <TableCell>{formatDuration(d.active_seconds)}</TableCell>
                        <TableCell>{formatDuration(d.professional_seconds)}</TableCell>
                        <TableCell>
                          <Badge className={ratioColor(Number(d.professional_ratio)) + ' text-white'}>
                            {d.professional_ratio}%
                          </Badge>
                        </TableCell>
                        <TableCell>{d.files_synced}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Latest day breakdown */}
            {latest && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Répartition par catégorie — {format(new Date(latest.report_date), 'dd MMM', { locale: fr })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {categoryEntries.length === 0 && (
                      <p className="text-sm text-muted-foreground">Pas de catégories.</p>
                    )}
                    {categoryEntries.map((c) => (
                      <div key={c.key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{c.label}</span>
                          <span className="text-muted-foreground">{formatDuration(c.value)} • {c.pct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${c.pct}%`,
                              background: c.key === 'nonProfessional' ? '#ef4444' : c.key === 'professional' ? NAVY : COPPER,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Applications les plus utilisées</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!latest.top_apps || latest.top_apps.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucune donnée.</p>
                    ) : (
                      <ul className="space-y-2">
                        {latest.top_apps.slice(0, 8).map((a, i) => (
                          <li key={i} className="flex justify-between text-sm">
                            <span className="truncate">{a.name}</span>
                            <span className="text-muted-foreground">{formatDuration(a.seconds)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
