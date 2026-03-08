import { useMemo, useState } from 'react';
import {
  addDays,
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  format,
  isWeekend,
  startOfMonth,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/common/EmptyState';
import { BarChart3, CheckSquare, ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

type ZoomLevel = 'day' | 'week' | 'month';

interface ProjectGanttViewProps {
  tasks: any[];
  activities: any[];
}

interface GanttRow {
  id: string;
  label: string;
  type: 'activity' | 'task';
  depth: number;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  status: string;
  parentId?: string;
  code?: string;
}

const COL_WIDTHS: Record<ZoomLevel, number> = { day: 34, week: 22, month: 52 };

const STATUS_BAR_CLASS: Record<string, string> = {
  todo: 'bg-muted-foreground/60',
  in_progress: 'bg-primary',
  in_review: 'bg-warning',
  correction: 'bg-destructive',
  validated: 'bg-success',
  completed: 'bg-success',
  pending: 'bg-muted-foreground/50',
};

function buildRows(activities: any[], tasks: any[], collapsed: Set<string>): GanttRow[] {
  const rows: GanttRow[] = [];
  const rootActivities = activities.filter((a) => !a.parent_id);

  const addActivity = (activity: any, depth: number) => {
    rows.push({
      id: activity.id,
      label: activity.name,
      code: activity.code,
      type: 'activity',
      depth,
      startDate: activity.actual_start_date ? new Date(activity.actual_start_date) : activity.planned_start_date ? new Date(activity.planned_start_date) : null,
      endDate: activity.actual_end_date ? new Date(activity.actual_end_date) : activity.planned_end_date ? new Date(activity.planned_end_date) : null,
      progress: activity.progress ?? 0,
      status: activity.status ?? 'pending',
      parentId: activity.parent_id ?? undefined,
    });

    if (collapsed.has(activity.id)) return;

    const childActivities = activities.filter((a) => a.parent_id === activity.id);
    childActivities.forEach((child) => addActivity(child, depth + 1));

    const activityTasks = tasks.filter((task) => task.activity_id === activity.id);
    activityTasks.forEach((task) => {
      rows.push({
        id: task.id,
        label: task.title,
        type: 'task',
        depth: depth + 1,
        startDate: task.start_date ? new Date(task.start_date) : null,
        endDate: task.due_date ? new Date(task.due_date) : null,
        progress: task.status === 'validated' || task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0,
        status: task.status ?? 'todo',
      });
    });
  };

  rootActivities.forEach((activity) => addActivity(activity, 0));

  const orphanTasks = tasks.filter((task) => !task.activity_id);
  orphanTasks.forEach((task) => {
    rows.push({
      id: task.id,
      label: task.title,
      type: 'task',
      depth: 0,
      startDate: task.start_date ? new Date(task.start_date) : null,
      endDate: task.due_date ? new Date(task.due_date) : null,
      progress: task.status === 'validated' || task.status === 'completed' ? 100 : task.status === 'in_progress' ? 50 : 0,
      status: task.status ?? 'todo',
    });
  });

  return rows;
}

export default function ProjectGanttView({ tasks, activities }: ProjectGanttViewProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const rows = useMemo(() => buildRows(activities, tasks, collapsed), [activities, tasks, collapsed]);

  const { timelineStart, timelineEnd, days, months } = useMemo(() => {
    const allDates: Date[] = [];
    rows.forEach((row) => {
      if (row.startDate) allDates.push(row.startDate);
      if (row.endDate) allDates.push(row.endDate);
    });

    if (allDates.length === 0) {
      const now = new Date();
      allDates.push(addDays(now, -14), addDays(now, 35));
    }

    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    const start = addDays(startOfMonth(minDate), -7);
    const end = addDays(endOfMonth(maxDate), 14);

    return {
      timelineStart: start,
      timelineEnd: end,
      days: eachDayOfInterval({ start, end }),
      months: eachMonthOfInterval({ start, end }),
    };
  }, [rows]);

  const toggleCollapse = (id: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Aucune donnée pour le Gantt"
        description="Ajoutez des tâches avec des dates pour afficher la planification."
      />
    );
  }

  const colWidth = COL_WIDTHS[zoom];
  const totalWidth = days.length * colWidth;
  const ROW_HEIGHT = 36;
  const LABEL_WIDTH = 300;
  const todayOffset = differenceInDays(new Date(), timelineStart) * colWidth;

  const getBarStyle = (row: GanttRow) => {
    if (!row.startDate || !row.endDate) return null;
    const startOffset = differenceInDays(row.startDate, timelineStart);
    const duration = Math.max(differenceInDays(row.endDate, row.startDate), 1);
    return { left: startOffset * colWidth, width: duration * colWidth };
  };

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zoom :</span>
          <Button size="sm" variant={zoom === 'day' ? 'default' : 'outline'} onClick={() => setZoom('day')}>Jour</Button>
          <Button size="sm" variant={zoom === 'week' ? 'default' : 'outline'} onClick={() => setZoom('week')}>Semaine</Button>
          <Button size="sm" variant={zoom === 'month' ? 'default' : 'outline'} onClick={() => setZoom('month')}>Mois</Button>
        </div>

        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="flex">
            <div className="border-r bg-muted/30 flex-shrink-0" style={{ width: LABEL_WIDTH }}>
              <div className="h-14 border-b px-3 flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Activités & tâches
              </div>
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={cn('border-b px-2 flex items-center gap-2 hover:bg-muted/40', row.type === 'activity' && 'bg-muted/20')}
                  style={{ height: ROW_HEIGHT, paddingLeft: 8 + row.depth * 16 }}
                >
                  {row.type === 'activity' ? (
                    <button type="button" onClick={() => toggleCollapse(row.id)} className="p-0.5 rounded hover:bg-muted">
                      {collapsed.has(row.id) ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  ) : (
                    <span className="w-4" />
                  )}

                  {row.type === 'activity' ? (
                    <Folder className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  )}

                  <span className="text-xs truncate">{row.label}</span>
                  {row.code && <Badge variant="outline" className="text-[10px] font-mono ml-auto">{row.code}</Badge>}
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-x-auto">
              <div style={{ width: totalWidth, minWidth: '100%' }}>
                <div className="h-14 border-b">
                  <div className="h-7 flex border-b relative">
                    {months.map((month, index) => {
                      const monthStart = Math.max(0, differenceInDays(month, timelineStart));
                      const nextMonth = index < months.length - 1 ? months[index + 1] : timelineEnd;
                      const monthDays = differenceInDays(nextMonth, month);
                      return (
                        <div
                          key={month.toISOString()}
                          className="absolute h-7 border-r text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-center"
                          style={{ left: monthStart * colWidth, width: monthDays * colWidth }}
                        >
                          {format(month, 'MMM yyyy', { locale: fr })}
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-7 flex">
                    {days.map((day, index) => (
                      <div
                        key={`${day.toISOString()}-${index}`}
                        className={cn('border-r text-[9px] flex items-center justify-center', isWeekend(day) ? 'bg-muted/40 text-muted-foreground/60' : 'text-muted-foreground')}
                        style={{ width: colWidth }}
                      >
                        {zoom === 'day' ? format(day, 'd', { locale: fr }) : zoom === 'week' && day.getDay() === 1 ? format(day, 'd MMM', { locale: fr }) : zoom === 'month' && day.getDate() === 1 ? format(day, 'd', { locale: fr }) : ''}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  {todayOffset >= 0 && todayOffset <= totalWidth && (
                    <div className="absolute top-0 w-0.5 bg-destructive/60 z-20" style={{ left: todayOffset, height: rows.length * ROW_HEIGHT }} />
                  )}

                  {rows.map((row, rowIndex) => {
                    const bar = getBarStyle(row);
                    return (
                      <div key={row.id} className="border-b relative" style={{ height: ROW_HEIGHT }}>
                        {bar && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn('absolute rounded-sm top-1.5', row.type === 'activity' ? 'h-4' : 'h-3', STATUS_BAR_CLASS[row.status] ?? 'bg-primary')}
                                style={{ left: bar.left, width: Math.max(bar.width, 4), top: row.type === 'activity' ? 8 : 10 }}
                              >
                                {row.progress > 0 && row.progress < 100 && (
                                  <div className="absolute inset-y-0 left-0 rounded-l-sm bg-background/30" style={{ width: `${row.progress}%` }} />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-medium">{row.label}</p>
                              <p className="text-muted-foreground">
                                {row.startDate ? format(row.startDate, 'dd MMM yyyy', { locale: fr }) : 'Sans début'}
                                {' → '}
                                {row.endDate ? format(row.endDate, 'dd MMM yyyy', { locale: fr }) : 'Sans fin'}
                              </p>
                              <p>Progression : {row.progress}%</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {!bar && row.startDate && (
                          <div
                            className="absolute w-2.5 h-2.5 rounded-full bg-primary"
                            style={{ left: differenceInDays(row.startDate, timelineStart) * colWidth - 4, top: ROW_HEIGHT / 2 - 4 }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
