import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, endOfMonth, format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuthStore } from '@/stores/authStore';
import { useExecution } from '@/hooks/useExecution';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatHours, getWeekStart } from '@/lib/timeUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

const ALL = '__all__';

function preset(kind: 'week' | 'month'): { start: Date; end: Date } {
  const now = new Date();
  if (kind === 'week') {
    const start = getWeekStart(now);
    return { start, end: addDays(start, 6) };
  }
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export default function SuiviExecutionPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;

  const [rangeKind, setRangeKind] = useState<'week' | 'month' | 'custom'>('week');
  const [custom, setCustom] = useState<{ start: Date; end: Date }>(preset('week'));
  const [userId, setUserId] = useState<string>(ALL);

  if (gradeLevel > 3) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-3">
        <h1 className="text-xl font-semibold">Accès réservé aux responsables</h1>
        <p className="text-sm text-muted-foreground">Ce module est accessible aux grades DA, DM et CM uniquement.</p>
        <Button onClick={() => navigate('/')}>Retour au tableau de bord</Button>
      </div>
    );
  }

  const range = useMemo(() => {
    if (rangeKind === 'custom') return custom;
    return preset(rangeKind);
  }, [rangeKind, custom]);

  const { data: rows = [] } = useExecution(range.start, range.end, userId === ALL ? null : userId);

  const { data: collaborators = [] } = useQuery({
    queryKey: ['org-collaborators', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('organization_id', profile.organization_id)
        .order('full_name');
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });

  const kpis = useMemo(() => {
    const planned = rows.reduce((s, r) => s + Number(r.planned_hours || 0), 0);
    const actual = rows.reduce((s, r) => s + Number(r.actual_hours || 0), 0);
    const rate = planned > 0 ? Math.round((actual / planned) * 100) : 0;
    return { planned, actual, rate, gap: actual - planned };
  }, [rows]);

  const chartData = useMemo(() => {
    const map = new Map<string, { name: string; prévu: number; réalisé: number }>();
    for (const r of rows) {
      const key = r.mission_name ?? '-';
      if (!map.has(key)) map.set(key, { name: key, prévu: 0, réalisé: 0 });
      const item = map.get(key)!;
      item.prévu += Number(r.planned_hours || 0);
      item.réalisé += Number(r.actual_hours || 0);
    }
    return Array.from(map.values());
  }, [rows]);

  const rateColor = (rate: number | null) => {
    if (rate === null) return 'bg-warning';
    if (rate >= 90 && rate <= 110) return 'bg-success';
    if ((rate >= 70 && rate < 90) || (rate > 110 && rate <= 130)) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold ">Suivi d'exécution</h1>
        <p className="text-sm text-muted-foreground">Compare le prévu (planning validé) au réalisé (feuilles de temps approuvées).</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="rounded-md border border-border p-0.5 flex">
            {(['week', 'month', 'custom'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setRangeKind(k)}
                className={`px-3 py-1 text-xs rounded ${rangeKind === k ? 'bg-primary text-primary-foreground' : ''}`}
              >
                {k === 'week' ? 'Cette semaine' : k === 'month' ? 'Ce mois' : 'Personnalisé'}
              </button>
            ))}
          </div>
          {rangeKind === 'custom' && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm"><CalendarIcon className="h-4 w-4 mr-1" /> {format(custom.start, 'dd/MM/yyyy')}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={custom.start} onSelect={(d) => d && setCustom((c) => ({ ...c, start: d }))} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">→</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm"><CalendarIcon className="h-4 w-4 mr-1" /> {format(custom.end, 'dd/MM/yyyy')}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={custom.end} onSelect={(d) => d && setCustom((c) => ({ ...c, end: d }))} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className="ml-auto min-w-[220px]">
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les collaborateurs</SelectItem>
                {(collaborators as any[]).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total prévu', value: formatHours(kpis.planned) },
          { label: 'Total réalisé', value: formatHours(kpis.actual) },
          { label: "Taux d'exécution", value: `${kpis.rate}%` },
          { label: 'Écart global', value: `${kpis.gap >= 0 ? '+' : ''}${formatHours(Math.abs(kpis.gap))}`, negative: kpis.gap < 0 },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className={`text-2xl font-semibold ${(k as any).negative ? 'text-destructive' : ''}`}>{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Détail par collaborateur × mission</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune donnée sur la période. Les chiffres apparaissent une fois les plannings validés et les feuilles de temps approuvées.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collaborateur</TableHead>
                  <TableHead>Mission</TableHead>
                  <TableHead>Prévu</TableHead>
                  <TableHead>Réalisé</TableHead>
                  <TableHead className="w-[200px]">Taux</TableHead>
                  <TableHead>Écart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const rate = r.execution_rate == null ? null : Number(r.execution_rate);
                  const color = rateColor(rate);
                  return (
                    <TableRow key={`${r.user_id}-${r.mission_id}-${i}`}>
                      <TableCell>{r.full_name}</TableCell>
                      <TableCell>{r.mission_name ?? '-'}</TableCell>
                      <TableCell>{formatHours(Number(r.planned_hours))}</TableCell>
                      <TableCell>{formatHours(Number(r.actual_hours))}</TableCell>
                      <TableCell>
                        {rate === null ? (
                          <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">Hors planning</Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full ${color}`} style={{ width: `${Math.min(rate, 150)}%` }} />
                            </div>
                            <span className="text-xs tabular-nums w-10 text-right">{rate}%</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={Number(r.gap_hours) < 0 ? 'text-destructive' : 'text-success'}>
                        {Number(r.gap_hours) >= 0 ? '+' : '−'}{formatHours(Math.abs(Number(r.gap_hours)))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Prévu vs réalisé par mission</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="prévu" fill="hsl(var(--primary))" />
                <Bar dataKey="réalisé" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
