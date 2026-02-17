import { useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, getDaysInMonth, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, ChevronLeft, ChevronRight, Plus, Save, Send, CalendarDays, LayoutGrid, CheckCircle2, XCircle } from 'lucide-react';
import ExportMenu from '@/components/common/ExportMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/authStore';
import { useTimeEntries, useMonthTimeEntries, useUpsertTimeEntry, useAddTimesheetRow, useSubmitTimesheet, useTeamTimesheets, useApproveTimeEntries } from '@/hooks/useTimesheets';
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

  return (
    <div className="space-y-4">
      {/* Week navigator */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm min-w-[220px] text-center">
          Semaine du {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
        </span>
        <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Mission / Projet</TableHead>
                  <TableHead className="w-10 text-center">Fact.</TableHead>
                  {dates.map((d, i) => (
                    <TableHead key={i} className="w-20 text-center">
                      <div className="text-xs">{DAYS[i]}</div>
                      <div className="text-xs text-muted-foreground">{format(d, 'dd/MM')}</div>
                    </TableHead>
                  ))}
                  <TableHead className="w-20 text-center font-bold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Aucune saisie. Ajoutez une ligne pour commencer.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => {
                  const rowTotal = dateStrs.reduce((s, d) => s + (row.entries[d]?.hours || 0), 0);
                  const isLocked = Object.values(row.entries).some((e) => e.status === 'approved' || e.status === 'submitted');
                  return (
                    <TableRow key={row.key}>
                      <TableCell>
                        <div className="text-sm font-medium">{row.mission_name}</div>
                        {row.project_name && <div className="text-xs text-muted-foreground">{row.project_name}</div>}
                        {row.task_name && <div className="text-xs text-muted-foreground/70">{row.task_name}</div>}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.is_billable ? (
                          <Badge variant="default" className="text-[10px] px-1">F</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1">—</Badge>
                        )}
                      </TableCell>
                      {dateStrs.map((dateStr, i) => {
                        const val = row.entries[dateStr]?.hours || 0;
                        return (
                          <TableCell key={i} className="p-1 text-center">
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max="24"
                              className="h-8 w-16 text-center text-sm mx-auto"
                              defaultValue={val || ''}
                              disabled={isLocked}
                              onBlur={(e) => handleCellChange(row, dateStr, e.target.value)}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-semibold">{rowTotal.toFixed(1)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="font-bold">Total journalier</TableCell>
                  {dayTotals.map((t, i) => (
                    <TableCell key={i} className={cn(
                      "text-center font-semibold",
                      i < 5 && t > 10 && "text-destructive",
                      i < 5 && t > 0 && t < 4 && "text-yellow-600"
                    )}>
                      {t > 0 ? t.toFixed(1) : '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold text-primary">{weekTotal.toFixed(1)}h</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter une ligne</Button>
          </DialogTrigger>
          {/* ... keep existing code */}
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
          title={`Feuille de temps — Semaine du ${format(currentWeek, 'dd MMMM yyyy', { locale: fr })}`}
        />

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={allSubmitted}>
            <Save className="h-4 w-4 mr-1" /> Brouillon enregistré
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={allSubmitted || entries.length === 0}>
            <Send className="h-4 w-4 mr-1" /> Soumettre
          </Button>
        </div>
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

  const daysInMonth = getDaysInMonth(date);
  const firstDay = (getDay(startOfMonth(date)) + 6) % 7; // Monday=0
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => setDate(new Date(year, month - 1, 1));
  const nextMonth = () => setDate(new Date(year, month + 1, 1));

  const getColor = (hours: number | undefined) => {
    if (!hours) return 'bg-muted/30';
    if (hours >= 7 && hours <= 9) return 'bg-green-100 dark:bg-green-900/30 text-green-700';
    if (hours >= 4 && hours < 7) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="font-medium text-sm min-w-[180px] text-center capitalize">
          {format(date, 'MMMM yyyy', { locale: fr })}
        </span>
        <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const hours = dayMap[dateStr];
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center text-xs cursor-default transition-colors",
                      getColor(hours)
                    )}>
                      <span className="font-medium">{day}</span>
                      {hours !== undefined && <span className="text-[10px] font-bold">{hours}h</span>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{hours ? `${hours}h saisies` : 'Non saisi'}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200" /> 7-9h</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200" /> 4-6h</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200" /> &lt;4h ou &gt;10h</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted" /> Non saisi</span>
      </div>
    </div>
  );
}

function TeamValidation() {
  const profile = useAuthStore((s) => s.profile);
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { data: teamEntries = [] } = useTeamTimesheets(currentWeek);
  const approve = useApproveTimeEntries();

  const byUser = useMemo(() => {
    const map = new Map<string, { user: any; entries: any[]; totalHours: number }>();
    for (const e of teamEntries) {
      const uid = (e as any).user?.id;
      if (!uid) continue;
      if (!map.has(uid)) map.set(uid, { user: (e as any).user, entries: [], totalHours: 0 });
      const u = map.get(uid)!;
      u.entries.push(e);
      u.totalHours += Number(e.hours);
    }
    return Array.from(map.values());
  }, [teamEntries]);

  if ((profile?.grade_level ?? 99) > 4) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium text-sm min-w-[220px] text-center">
          Semaine du {format(currentWeek, 'dd MMMM yyyy', { locale: fr })}
        </span>
        <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {byUser.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Aucune feuille en attente de validation.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {byUser.map(({ user, entries: userEntries, totalHours }) => (
            <Card key={user.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{user.full_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{user.grade} · {totalHours.toFixed(1)}h total</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => approve.mutate({ ids: userEntries.map((e: any) => e.id), action: 'rejected' })}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Rejeter
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approve.mutate({ ids: userEntries.map((e: any) => e.id), action: 'approved' })}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Approuver
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const TimesheetsPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const isSuperior = (profile?.grade_level ?? 99) <= 4;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold font-display">Feuilles de temps</h1>
      </div>

      <Tabs defaultValue="weekly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="weekly"><LayoutGrid className="h-4 w-4 mr-1" /> Hebdomadaire</TabsTrigger>
          <TabsTrigger value="monthly"><CalendarDays className="h-4 w-4 mr-1" /> Mensuelle</TabsTrigger>
          {isSuperior && <TabsTrigger value="validation"><CheckCircle2 className="h-4 w-4 mr-1" /> Validation</TabsTrigger>}
        </TabsList>
        <TabsContent value="weekly"><WeeklyView /></TabsContent>
        <TabsContent value="monthly"><MonthlyView /></TabsContent>
        {isSuperior && <TabsContent value="validation"><TeamValidation /></TabsContent>}
      </Tabs>
    </div>
  );
};

export default TimesheetsPage;
