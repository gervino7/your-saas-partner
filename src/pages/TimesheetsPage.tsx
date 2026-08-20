import { useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, getDaysInMonth, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, ChevronLeft, ChevronRight, Plus, Save, Send, CalendarDays, LayoutGrid, CheckCircle2, XCircle, Timer, TrendingUp, FileCheck, BarChart3 } from 'lucide-react';
import ExportMenu from '@/components/common/ExportMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuthStore } from '@/stores/authStore';
import { useTimeEntries, useMonthTimeEntries, useUpsertTimeEntry, useAddTimesheetRow, useSubmitTimesheet, useTeamTimesheets, useApproveTimeEntries, usePendingTimesheetsCount } from '@/hooks/useTimesheets';
import { useMissions } from '@/hooks/useMissions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

type TimesheetRow = {
  key: string;
  mission_id: string;
  mission_name: string;
  project_id: string | null;
  project_name: string | null;
  task_id: string | null;
  task_name: string | null;
  is_billable: boolean;
  description: string;
  entries: Record<string, { id: string; hours: number; status: string }>;
};

function groupEntriesToRows(entries: any[]): TimesheetRow[] {
  const map = new Map<string, TimesheetRow>();
  for (const e of entries) {
    const key = `${e.mission_id}|${e.project_id || ''}|${e.task_id || ''}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        mission_id: e.mission_id,
        mission_name: e.mission?.name || e.mission?.code || 'Mission',
        project_id: e.project_id,
        project_name: e.project?.name || e.project?.code || null,
        task_id: e.task_id,
        task_name: e.task?.title || null,
        is_billable: e.is_billable ?? true,
        description: e.description || '',
        entries: {},
      });
    }
    const row = map.get(key)!;
    row.entries[e.date] = { id: e.id, hours: Number(e.hours), status: e.status };
  }
  return Array.from(map.values());
}

function WeeklyStatsCards({ rows, dateStrs, entries }: { rows: TimesheetRow[]; dateStrs: string[]; entries: any[] }) {
  const weekTotal = rows.reduce((sum, r) => sum + dateStrs.reduce((s, d) => s + (r.entries[d]?.hours || 0), 0), 0);
  const billableHours = rows.filter(r => r.is_billable).reduce((sum, r) => sum + dateStrs.reduce((s, d) => s + (r.entries[d]?.hours || 0), 0), 0);
  const utilization = weekTotal > 0 ? Math.round((billableHours / weekTotal) * 100) : 0;
  const allSubmitted = entries.length > 0 && entries.every((e: any) => e.status !== 'draft');

  const stats = [
    {
      label: 'Heures totales',
      value: `${weekTotal.toFixed(1)}h`,
      subtitle: 'cette semaine',
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Heures facturables',
      value: `${billableHours.toFixed(1)}h`,
      subtitle: `sur ${weekTotal.toFixed(1)}h`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Taux d\'utilisation',
      value: `${utilization}%`,
      subtitle: 'fact. / total',
      icon: BarChart3,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Statut',
      value: allSubmitted ? 'Soumis' : entries.length === 0 ? 'Vide' : 'Brouillon',
      subtitle: allSubmitted ? '✓ Validé' : 'En cours',
      icon: FileCheck,
      color: allSubmitted ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
      bgColor: allSubmitted ? 'bg-emerald-500/10' : 'bg-muted/50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className={cn("text-xl font-semibold ", stat.color)}>{stat.value}</p>
                <p className="text-[11px] text-muted-foreground/70">{stat.subtitle}</p>
              </div>
              <div className={cn("rounded-lg p-2", stat.bgColor)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WeekNavigator({ currentWeek, onPrev, onNext }: { currentWeek: Date; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="bg-muted/40 rounded-lg px-4 py-1.5 min-w-[240px] text-center">
        <span className="text-sm font-semibold">
          Semaine du {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
        </span>
      </div>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function WeeklyView() {
  const profile = useAuthStore((s) => s.profile);
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekStr = format(currentWeek, 'yyyy-MM-dd');
  const dates = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  const dateStrs = dates.map((d) => format(d, 'yyyy-MM-dd'));

  const { data: entries = [], isLoading } = useTimeEntries(currentWeek);
  const upsert = useUpsertTimeEntry();
  const addRow = useAddTimesheetRow();
  const submit = useSubmitTimesheet();
  const { data: missions = [] } = useMissions();

  const rows = useMemo(() => groupEntriesToRows(entries), [entries]);

  const [addOpen, setAddOpen] = useState(false);
  const [newMissionId, setNewMissionId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-mission', newMissionId],
    queryFn: async () => {
      if (!newMissionId) return [];
      const { data } = await supabase.from('projects').select('id, name, code').eq('mission_id', newMissionId);
      return data ?? [];
    },
    enabled: !!newMissionId,
  });

  const handleCellChange = useCallback((row: TimesheetRow, dateStr: string, value: string) => {
    const hours = parseFloat(value) || 0;
    const existing = row.entries[dateStr];
    upsert.mutate({
      id: existing?.id,
      mission_id: row.mission_id,
      project_id: row.project_id,
      task_id: row.task_id,
      date: dateStr,
      hours,
      is_billable: row.is_billable,
      description: row.description,
      week_start: weekStr,
    });
  }, [upsert, weekStr]);

  const handleAddRow = () => {
    if (!newMissionId) return;
    addRow.mutate({
      mission_id: newMissionId,
      project_id: newProjectId || null,
      is_billable: true,
      week_start: weekStr,
      dates: dateStrs,
    });
    setAddOpen(false);
    setNewMissionId('');
    setNewProjectId('');
  };

  const handleSubmit = () => {
    if (!profile) return;
    submit.mutate({ weekStart: weekStr, userId: profile.id });
  };

  const allSubmitted = entries.length > 0 && entries.every((e: any) => e.status !== 'draft');
  const dayTotals = dateStrs.map((d) => rows.reduce((s, r) => s + (r.entries[d]?.hours || 0), 0));
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-5">
      {/* Navigator + Actions bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <WeekNavigator
          currentWeek={currentWeek}
          onPrev={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          onNext={() => setCurrentWeek(addWeeks(currentWeek, 1))}
        />
        <div className="flex items-center gap-2">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> Ajouter une ligne
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une ligne de temps</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Mission</label>
                  <Select value={newMissionId} onValueChange={setNewMissionId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner une mission" /></SelectTrigger>
                    <SelectContent>
                      {missions.map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {projects.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Projet (optionnel)</label>
                    <Select value={newProjectId} onValueChange={setNewProjectId}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                      <SelectContent>
                        {projects.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={handleAddRow} className="w-full" disabled={!newMissionId}>
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <ExportMenu
            data={rows.map((row) => {
              const obj: Record<string, any> = {
                mission: row.mission_name,
                projet: row.project_name ?? '',
                facturable: row.is_billable ? 'Oui' : 'Non',
              };
              dateStrs.forEach((d, i) => { obj[DAYS[i]] = row.entries[d]?.hours || 0; });
              obj['Total'] = dateStrs.reduce((s, d) => s + (row.entries[d]?.hours || 0), 0).toFixed(1);
              return obj;
            })}
            filename={`timesheet-${weekStr}`}
            columns={[
              { key: 'mission', label: 'Mission' },
              { key: 'projet', label: 'Projet' },
              { key: 'facturable', label: 'Fact.' },
              ...DAYS.map((d) => ({ key: d, label: d })),
              { key: 'Total', label: 'Total' },
            ]}
            title={`Feuille de temps - Semaine du ${format(currentWeek, 'dd MMMM yyyy', { locale: fr })}`}
          />
        </div>
      </div>

      {/* Stats */}
      <WeeklyStatsCards rows={rows} dateStrs={dateStrs} entries={entries} />

      {/* Grid */}
      <Card className="border-border/30 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="min-w-[220px]">Mission / Projet</TableHead>
                  <TableHead className="w-12 text-center">Type</TableHead>
                  {dates.map((d, i) => {
                    const isToday = format(d, 'yyyy-MM-dd') === today;
                    const isWeekend = i >= 5;
                    return (
                      <TableHead key={i} className={cn(
                        "w-[76px] text-center",
                        isToday && "bg-primary/5",
                        isWeekend && "bg-muted/30"
                      )}>
                        <div className={cn("text-[11px] font-semibold", isToday && "text-primary")}>{DAYS[i]}</div>
                        <div className={cn("text-[10px] text-muted-foreground/60", isToday && "text-primary/70")}>{format(d, 'dd/MM')}</div>
                      </TableHead>
                    );
                  })}
                  <TableHead className="w-20 text-center">
                    <span className="font-semibold text-primary">Total</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <div className="rounded-full bg-muted/60 p-3">
                          <Clock className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">Aucune saisie cette semaine</p>
                        <p className="text-xs text-muted-foreground/60">Cliquez sur « Ajouter une ligne » pour commencer</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => {
                  const rowTotal = dateStrs.reduce((s, d) => s + (row.entries[d]?.hours || 0), 0);
                  const isLocked = Object.values(row.entries).some((e) => e.status === 'approved' || e.status === 'submitted');
                  return (
                    <TableRow key={row.key} className={cn(isLocked && "text-muted-foreground")}>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-8 rounded-full bg-primary/60 shrink-0" />
                          <div>
                            <div className="text-sm font-semibold leading-tight">{row.mission_name}</div>
                            {row.project_name && <div className="text-xs text-muted-foreground mt-0.5">{row.project_name}</div>}
                            {row.task_name && <div className="text-[11px] text-muted-foreground/60">{row.task_name}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.is_billable ? (
                          <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0 font-semibold">F</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">INT</Badge>
                        )}
                      </TableCell>
                      {dateStrs.map((dateStr, i) => {
                        const val = row.entries[dateStr]?.hours || 0;
                        const isToday = dateStr === today;
                        const isWeekend = i >= 5;
                        return (
                          <TableCell key={i} className={cn(
                            "p-1 text-center",
                            isToday && "bg-primary/[0.03]",
                            isWeekend && "bg-muted/20"
                          )}>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              className={cn(
                                "h-9 w-[64px] text-center text-sm mx-auto rounded-lg",
                                val > 0 && "font-semibold border-primary/20 bg-primary/[0.04]",
                                isLocked && "bg-muted/40"
                              )}
                              defaultValue={val || ''}
                              disabled={isLocked}
                              onBlur={(e) => handleCellChange(row, dateStr, e.target.value)}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <span className={cn(
                          "text-sm font-semibold",
                          rowTotal > 0 ? "text-foreground" : "text-muted-foreground/40"
                        )}>
                          {rowTotal > 0 ? `${rowTotal.toFixed(1)}h` : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              {rows.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-muted/30 border-t-2 border-border/40">
                    <TableCell colSpan={2} className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                      Total journalier
                    </TableCell>
                    {dayTotals.map((t, i) => (
                      <TableCell key={i} className={cn(
                        "text-center font-semibold text-sm",
                        i < 5 && t >= 7 && t <= 9 && "text-emerald-600 dark:text-emerald-400",
                        i < 5 && t > 9 && "text-destructive",
                        i < 5 && t > 0 && t < 4 && "text-amber-600 dark:text-amber-400",
                        t === 0 && "text-muted-foreground/30"
                      )}>
                        {t > 0 ? `${t.toFixed(1)}` : '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <span className="text-sm font-semibold text-primary">{weekTotal.toFixed(1)}h</span>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={allSubmitted} className="text-muted-foreground">
          <Save className="h-4 w-4 mr-1.5" /> Enregistré
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={allSubmitted || entries.length === 0} className="px-6">
          <Send className="h-4 w-4 mr-1.5" /> Soumettre la semaine
        </Button>
      </div>
    </div>
  );
}

function MonthlyView() {
  const [date, setDate] = useState(new Date());
  const year = date.getFullYear();
  const month = date.getMonth();
  const { data: entries = [] } = useMonthTimeEntries(year, month);

  const dayMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of entries) {
      m[e.date] = (m[e.date] || 0) + Number(e.hours);
    }
    return m;
  }, [entries]);

  const totalMonth = Object.values(dayMap).reduce((a, b) => a + b, 0);
  const daysWorked = Object.keys(dayMap).length;

  const daysInMonth = getDaysInMonth(date);
  const firstDay = (getDay(startOfMonth(date)) + 6) % 7;
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setDate(new Date(year, month - 1, 1));
  const nextMonth = () => setDate(new Date(year, month + 1, 1));

  const getColor = (hours: number | undefined) => {
    if (!hours) return 'bg-muted/20 text-muted-foreground/40';
    if (hours >= 7 && hours <= 9) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/50 dark:ring-emerald-700/30';
    if (hours >= 4 && hours < 7) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200/50 dark:ring-amber-700/30';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-1 ring-red-200/50 dark:ring-red-700/30';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="bg-muted/40 rounded-lg px-4 py-1.5 min-w-[200px] text-center">
            <span className="text-sm font-semibold capitalize">
              {format(date, 'MMMM yyyy', { locale: fr })}
            </span>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Timer className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary">{totalMonth.toFixed(1)}h</span>
            <span className="text-muted-foreground text-xs">total</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="text-muted-foreground text-xs">
            <span className="font-medium text-foreground">{daysWorked}</span> jours saisis
          </div>
        </div>
      </div>

      <Card className="border-border/30">
        <CardContent className="p-5">
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hours = dayMap[dateStr];
              const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "aspect-square rounded-lg flex flex-col items-center justify-center text-xs cursor-default transition-all",
                      getColor(hours),
                      isToday && "ring-2 ring-primary/50"
                    )}>
                      <span className={cn("font-semibold", isToday && "text-primary")}>{day}</span>
                      {hours !== undefined && <span className="text-[10px] font-semibold mt-0.5">{hours}h</span>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{hours ? `${hours}h saisies` : 'Non saisi'}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-800 ring-1 ring-emerald-300/50" /> 7-9h (optimal)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 dark:bg-amber-800 ring-1 ring-amber-300/50" /> 4-6h</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 dark:bg-red-800 ring-1 ring-red-300/50" /> &lt;4h ou &gt;10h</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-muted ring-1 ring-border/50" /> Non saisi</span>
      </div>
    </div>
  );
}

function TeamValidation() {
  const profile = useAuthStore((s) => s.profile);
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [allWeeks, setAllWeeks] = useState(false);
  const { data: teamEntries = [] } = useTeamTimesheets(currentWeek, allWeeks);
  const approve = useApproveTimeEntries();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectDialog, setRejectDialog] = useState<{ ids: string[]; comment: string } | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, { user: any; week: string; items: any[]; totalHours: number }>();
    for (const e of teamEntries) {
      const uid = (e as any).user?.id;
      if (!uid) continue;
      const key = allWeeks ? `${uid}|${e.week_start}` : uid;
      if (!map.has(key)) {
        map.set(key, {
          user: (e as any).user,
          week: e.week_start,
          items: [],
          totalHours: 0,
        });
      }
      const group = map.get(key)!;
      group.items.push(e);
      group.totalHours += Number(e.hours);
    }
    return Array.from(map.entries());
  }, [teamEntries, allWeeks]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const approveAll = (ids: string[]) => approve.mutate({ ids, action: 'approved' });
  const openReject = (ids: string[]) => setRejectDialog({ ids, comment: '' });

  if ((profile?.grade_level ?? 99) > 3) return null;

  return (
    <div className="space-y-5">
      <WeekNavigator
        currentWeek={currentWeek}
        onPrev={() => setCurrentWeek(subWeeks(currentWeek, 1))}
        onNext={() => setCurrentWeek(addWeeks(currentWeek, 1))}
      />

      <Card className="border-border/30">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Feuilles de temps à valider</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {allWeeks
                ? 'Toutes les semaines en attente'
                : `Semaine du ${format(currentWeek, 'dd/MM/yyyy')}`}
            </p>
          </div>
          <div className="rounded-md border border-border p-0.5 flex shrink-0">
            <button
              onClick={() => setAllWeeks(false)}
              className={`px-3 py-1 text-xs rounded ${!allWeeks ? 'bg-primary text-primary-foreground' : ''}`}
            >
              Semaine affichée
            </button>
            <button
              onClick={() => setAllWeeks(true)}
              className={`px-3 py-1 text-xs rounded ${allWeeks ? 'bg-primary text-primary-foreground' : ''}`}
            >
              Toutes les semaines
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {grouped.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <div className="rounded-full bg-emerald-500/10 p-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium">
                {allWeeks
                  ? 'Aucune feuille de temps soumise en attente de validation.'
                  : `Aucune feuille de temps soumise pour cette semaine (semaine du ${format(currentWeek, 'dd/MM/yyyy')}).`}
              </p>
              {!allWeeks && (
                <p className="text-xs text-muted-foreground">
                  Activez « Toutes les semaines » pour voir les feuilles de temps des autres semaines.
                </p>
              )}
            </div>
          ) : (
            <Accordion type="multiple">
              {grouped.map(([key, group]) => {
                const ids = group.items.map((i) => i.id);
                return (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger>
                      <div className="flex flex-1 items-center justify-between pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group.user.full_name}</span>
                          <Badge variant="outline" className="text-[10px]">{group.user.grade}</Badge>
                          {allWeeks && (
                            <Badge variant="secondary" className="text-[10px] tabular-nums">
                              Semaine du {format(new Date(group.week), 'dd/MM/yyyy')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {group.items.length} entrées · {group.totalHours.toFixed(1)}h
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex gap-2 mb-3">
                        <Button size="sm" onClick={() => approveAll(ids)} className="bg-success hover:bg-success/90">
                          Tout approuver
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openReject(ids)}>
                          Renvoyer
                        </Button>
                        {selected.size > 0 && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => approveAll(Array.from(selected))}>
                              Approuver sélection ({selected.size})
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
                            <TableHead>Mission / Projet / Tâche</TableHead>
                            <TableHead>Heures</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((it) => (
                            <TableRow key={it.id}>
                              <TableCell>
                                <Checkbox checked={selected.has(it.id)} onCheckedChange={() => toggle(it.id)} />
                              </TableCell>
                              <TableCell>{format(new Date(it.date), 'EEE dd/MM', { locale: fr })}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {[it.mission?.name, it.project?.name, it.task?.title].filter(Boolean).join(' / ') || '-'}
                              </TableCell>
                              <TableCell>{Number(it.hours).toFixed(1)}h</TableCell>
                              <TableCell>{it.description ?? '-'}</TableCell>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeter la feuille de temps</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Précisez ce qui doit être corrigé :</p>
            <Textarea
              value={rejectDialog?.comment ?? ''}
              onChange={(e) => setRejectDialog((r) => r ? { ...r, comment: e.target.value } : r)}
              rows={4}
            />
            {rejectDialog?.comment && rejectDialog.comment.trim().length > 0 && rejectDialog.comment.trim().length < 5 && (
              <p className="text-xs text-destructive">Précisez ce qui doit être corrigé (au moins 5 caractères).</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={(rejectDialog?.comment?.trim()?.length ?? 0) < 5 || approve.isPending}
              onClick={async () => {
                if (!rejectDialog) return;
                await approve.mutateAsync({ ids: rejectDialog.ids, action: 'rejected', comment: rejectDialog.comment.trim() });
                setRejectDialog(null);
                setSelected(new Set());
              }}
            >
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


const TimesheetsPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const isSuperior = (profile?.grade_level ?? 99) <= 3;
  const { data: pendingCount = 0 } = usePendingTimesheetsCount();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold ">Feuilles de temps</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Saisissez et soumettez vos heures de travail</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="weekly" className="space-y-5">
        <TabsList className="bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="weekly" className="rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
            <LayoutGrid className="h-3.5 w-3.5" /> Hebdomadaire
          </TabsTrigger>
          <TabsTrigger value="monthly" className="rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
            <CalendarDays className="h-3.5 w-3.5" /> Mensuelle
          </TabsTrigger>
          {isSuperior && (
            <TabsTrigger value="validation" className="rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <CheckCircle2 className="h-3.5 w-3.5" /> Validation
              {pendingCount > 0 && (
                <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground hover:bg-destructive">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="weekly"><WeeklyView /></TabsContent>
        <TabsContent value="monthly"><MonthlyView /></TabsContent>
        {isSuperior && <TabsContent value="validation"><TeamValidation /></TabsContent>}
      </Tabs>
    </div>
  );
};

export default TimesheetsPage;
