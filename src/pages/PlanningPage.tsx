import { useMemo, useState } from 'react';
import { addDays, addMonths, endOfMonth, endOfWeek, format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Send, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/authStore';
import { getWeekStart, formatHours } from '@/lib/timeUtils';
import { usePlanEntries, useSubmitWeek, useDeletePlanEntry, type PlanEntry } from '@/hooks/usePlanning';
import PlanEntryDialog from '@/components/planning/PlanEntryDialog';
import TeamPlanReview from '@/components/planning/TeamPlanReview';

type ViewMode = 'week' | 'month';

const TYPE_COLOR: Record<string, string> = {
  mission: 'border-l-primary',
  rendez_vous: 'border-l-[hsl(var(--warning))]',
  formation: 'border-l-info',
  admin: 'border-l-muted-foreground',
  conge: 'border-l-success',
};

const STATUS_BADGE: Record<string, { label: string; variant: 'secondary' | 'outline' | 'default' | 'destructive'; className?: string }> = {
  draft: { label: 'Brouillon', variant: 'outline' },
  submitted: { label: 'Soumis', variant: 'secondary', className: 'bg-warning/20 text-warning-foreground' },
  approved: { label: 'Validé', variant: 'default', className: 'bg-success text-success-foreground' },
  rejected: { label: 'Rejeté', variant: 'destructive' },
};

function EntryCard({ e, onEdit, onDelete }: { e: PlanEntry; onEdit: () => void; onDelete: () => void }) {
  const readOnly = e.status === 'approved' || e.status === 'submitted';
  const badge = STATUS_BADGE[e.status];
  const card = (
    <div className={`rounded-md border border-border border-l-4 bg-card px-2 py-1.5 text-xs ${TYPE_COLOR[e.entry_type] ?? ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium tabular-nums">{formatHours(Number(e.planned_hours))}</span>
        <Badge variant={badge.variant} className={`text-[9px] px-1 py-0 ${badge.className ?? ''}`}>{badge.label}</Badge>
      </div>
      <div className="mt-0.5 truncate">{e.title ?? e.task?.title ?? e.mission?.name ?? '—'}</div>
      {e.mission && (
        <div className="text-[10px] text-muted-foreground truncate">{e.mission.name}</div>
      )}
      {!readOnly && (
        <div className="flex gap-1 mt-1">
          <button onClick={onEdit} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
        </div>
      )}
    </div>
  );
  if (e.status === 'rejected' && e.review_comment) {
    return (
      <Tooltip>
        <TooltipTrigger asChild><div>{card}</div></TooltipTrigger>
        <TooltipContent>{e.review_comment}</TooltipContent>
      </Tooltip>
    );
  }
  return card;
}

function WeekView({ weekStart, entries, onAdd, onEdit, onDelete }: {
  weekStart: Date;
  entries: PlanEntry[];
  onAdd: (d: Date) => void;
  onEdit: (e: PlanEntry) => void;
  onDelete: (id: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const byDay = useMemo(() => {
    const map = new Map<string, PlanEntry[]>();
    for (const e of entries) {
      const k = e.plan_date;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [entries]);

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const items = byDay.get(key) ?? [];
        const total = items.reduce((s, i) => s + Number(i.planned_hours || 0), 0);
        const overload = total > 10;
        return (
          <div key={key} className="rounded-md border border-border bg-background/50 min-h-[180px] flex flex-col">
            <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
              <span className="text-xs font-medium">{format(d, 'EEE dd', { locale: fr })}</span>
              <button onClick={() => onAdd(d)} className="text-muted-foreground hover:text-primary"><Plus className="h-3 w-3" /></button>
            </div>
            <div className="flex-1 p-1.5 space-y-1.5">
              {items.map((e) => (
                <EntryCard key={e.id} e={e} onEdit={() => onEdit(e)} onDelete={() => onDelete(e.id)} />
              ))}
            </div>
            <div className={`px-2 py-1 text-xs text-center border-t border-border ${overload ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
              {formatHours(total)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ month, entries, onDayClick }: { month: Date; entries: PlanEntry[]; onDayClick: (d: Date) => void }) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const gridStart = getWeekStart(start);
  const gridEnd = endOfWeek(end, { weekStartsOn: 1 });
  const days: Date[] = [];
  let cur = gridStart;
  while (cur <= gridEnd) { days.push(cur); cur = addDays(cur, 1); }

  const byDay = useMemo(() => {
    const map = new Map<string, PlanEntry[]>();
    for (const e of entries) {
      if (!map.has(e.plan_date)) map.set(e.plan_date, []);
      map.get(e.plan_date)!.push(e);
    }
    return map;
  }, [entries]);

  return (
    <div className="grid grid-cols-7 gap-1">
      {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d) => (
        <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
      ))}
      {days.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const items = byDay.get(key) ?? [];
        const total = items.reduce((s, i) => s + Number(i.planned_hours || 0), 0);
        const inMonth = d.getMonth() === month.getMonth();
        return (
          <button
            key={key}
            onClick={() => onDayClick(d)}
            className={`text-left min-h-[80px] rounded border border-border p-1 hover:border-primary transition-colors ${inMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'}`}
          >
            <div className="flex justify-between items-center text-xs">
              <span>{d.getDate()}</span>
              {total > 0 && <span className="tabular-nums font-medium">{formatHours(total)}</span>}
            </div>
            <div className="mt-1 space-y-0.5">
              {items.slice(0, 2).map((e) => (
                <div key={e.id} className={`text-[10px] truncate border-l-2 pl-1 ${TYPE_COLOR[e.entry_type]}`}>
                  {e.title ?? e.mission?.name ?? '—'}
                </div>
              ))}
              {items.length > 2 && <div className="text-[10px] text-muted-foreground">+{items.length - 2}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function PlanningPage() {
  const profile = useAuthStore((s) => s.profile);
  const isLead = (profile?.grade_level ?? 8) <= 3;

  const [view, setView] = useState<ViewMode>('week');
  const [cursor, setCursor] = useState<Date>(getWeekStart(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState<Date | undefined>();
  const [editEntry, setEditEntry] = useState<PlanEntry | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const range = useMemo(() => {
    if (view === 'week') {
      const start = getWeekStart(cursor);
      return { start, end: addDays(start, 6) };
    }
    const start = startOfMonth(cursor);
    return { start, end: endOfMonth(cursor) };
  }, [view, cursor]);

  const { data: entries = [] } = usePlanEntries(range.start, range.end);
  const submitWeek = useSubmitWeek();
  const del = useDeletePlanEntry();

  const weekTotal = entries.reduce((s, i) => s + Number(i.planned_hours || 0), 0);
  const hasDraft = entries.some((e) => e.status === 'draft');
  const anyStatus = entries[0]?.status;

  const label = view === 'week'
    ? `Semaine du ${format(range.start, 'dd MMMM yyyy', { locale: fr })}`
    : format(cursor, 'MMMM yyyy', { locale: fr });

  const navigate = (dir: -1 | 1) => {
    setCursor((c) => view === 'week' ? addDays(c, dir * 7) : addMonths(c, dir));
  };

  const openAdd = (d?: Date) => { setEditEntry(null); setDialogDate(d ?? new Date()); setDialogOpen(true); };
  const openEdit = (e: PlanEntry) => { setEditEntry(e); setDialogDate(new Date(e.plan_date)); setDialogOpen(true); };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold font-display">Planning</h1>
        <p className="text-sm text-muted-foreground">Planifiez votre semaine par mission, projet et tâche.</p>
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">Mon planning</TabsTrigger>
          {isLead && <TabsTrigger value="team">Mon équipe</TabsTrigger>}
        </TabsList>

        <TabsContent value="mine" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <div className="min-w-[220px] text-center font-medium capitalize">{label}</div>
                  <Button variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-md border border-border p-0.5 flex">
                    <button onClick={() => setView('week')} className={`px-3 py-1 text-xs rounded ${view === 'week' ? 'bg-primary text-primary-foreground' : ''}`}>Semaine</button>
                    <button onClick={() => setView('month')} className={`px-3 py-1 text-xs rounded ${view === 'month' ? 'bg-primary text-primary-foreground' : ''}`}>Mois</button>
                  </div>
                  <Button size="sm" onClick={() => openAdd()}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {view === 'week' ? (
            <WeekView
              weekStart={range.start}
              entries={entries}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={(id) => del.mutate(id)}
            />
          ) : (
            <MonthView
              month={cursor}
              entries={entries}
              onDayClick={(d) => { setView('week'); setCursor(getWeekStart(d)); }}
            />
          )}

          {view === 'week' && (
            <Card>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  Total semaine : <span className="font-semibold">{formatHours(weekTotal)}</span>
                  {anyStatus && (
                    <>
                      {' — Statut : '}
                      <Badge variant={STATUS_BADGE[anyStatus].variant} className={STATUS_BADGE[anyStatus].className}>
                        {STATUS_BADGE[anyStatus].label}
                      </Badge>
                    </>
                  )}
                </div>
                <Button onClick={() => setConfirmSubmit(true)} disabled={!hasDraft || submitWeek.isPending}>
                  <Send className="h-4 w-4 mr-2" /> Soumettre la semaine
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {isLead && (
          <TabsContent value="team">
            <TeamPlanReview weekStart={getWeekStart(cursor)} />
          </TabsContent>
        )}
      </Tabs>

      <PlanEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={dialogDate}
        entry={editEntry}
      />

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Soumettre le planning ?</AlertDialogTitle>
            <AlertDialogDescription>
              Une fois soumis, votre planning ne pourra plus être modifié tant qu'il n'a pas été validé ou renvoyé par votre responsable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitWeek.mutate(getWeekStart(cursor))}>
              Soumettre
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
