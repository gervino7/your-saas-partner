import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, eachMonthOfInterval, isWeekend, isSameMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronRight, ChevronDown, Folder, FolderOpen, CheckSquare, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import Loading from '@/components/common/Loading';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

interface MissionGanttTabProps {
  missionId: string;
}

interface GanttRow {
  id: string;
  label: string;
  type: 'project' | 'activity' | 'task';
  depth: number;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  status: string;
  priority?: string;
  parentId?: string;
  projectId?: string;
  code?: string;
}

type ZoomLevel = 'day' | 'week' | 'month';

const STATUS_COLORS: Record<string, string> = {
  todo: 'hsl(var(--muted-foreground))',
  in_progress: 'hsl(var(--primary))',
  in_review: 'hsl(35 85% 48%)',
  validated: 'hsl(142 71% 45%)',
  completed: 'hsl(142 71% 45%)',
  correction: 'hsl(0 84% 60%)',
  planning: 'hsl(var(--primary) / 0.6)',
  active: 'hsl(var(--primary))',
  pending: 'hsl(var(--muted-foreground) / 0.5)',
  draft: 'hsl(var(--muted-foreground) / 0.4)',
};

const COL_WIDTHS: Record<ZoomLevel, number> = { day: 36, week: 24, month: 60 };

function useGanttData(missionId: string) {
  return useQuery({
    queryKey: ['gantt-data', missionId],
    queryFn: async () => {
      // First fetch projects
      const projectsRes = await supabase
        .from('projects')
        .select('id, name, code, status, start_date, end_date, progress, mission_id')
        .eq('mission_id', missionId)
        .order('created_at');

      const projectIds = projectsRes.data?.map(p => p.id) ?? [];

      if (projectIds.length === 0) {
        return { projects: projectsRes.data ?? [], activities: [], tasks: [] };
      }

      // Then fetch activities and tasks in parallel
      const [activitiesRes, tasksRes] = await Promise.all([
        supabase
          .from('activities')
          .select('id, name, code, status, planned_start_date, planned_end_date, actual_start_date, actual_end_date, progress, project_id, parent_id, depth')
          .in('project_id', projectIds)
          .order('order_index'),
        supabase
          .from('tasks')
          .select('id, title, status, priority, start_date, due_date, project_id, activity_id')
          .in('project_id', projectIds)
          .order('order_index'),
      ]);

      return {
        projects: projectsRes.data ?? [],
        activities: activitiesRes.data ?? [],
        tasks: tasksRes.data ?? [],
      };
    },
    enabled: !!missionId,
  });
}

function buildRows(
  projects: any[],
  activities: any[],
  tasks: any[],
  collapsed: Set<string>
): GanttRow[] {
  const rows: GanttRow[] = [];

  for (const p of projects) {
    rows.push({
      id: p.id,
      label: p.name,
      code: p.code,
      type: 'project',
      depth: 0,
      startDate: p.start_date ? new Date(p.start_date) : null,
      endDate: p.end_date ? new Date(p.end_date) : null,
      progress: p.progress ?? 0,
      status: p.status ?? 'planning',
    });

    if (collapsed.has(p.id)) continue;

    // Root activities for this project
    const rootActivities = activities.filter(a => a.project_id === p.id && !a.parent_id);

    const addActivity = (act: any, depth: number) => {
      rows.push({
        id: act.id,
        label: act.name,
        code: act.code,
        type: 'activity',
        depth,
        startDate: act.actual_start_date ? new Date(act.actual_start_date) : act.planned_start_date ? new Date(act.planned_start_date) : null,
        endDate: act.actual_end_date ? new Date(act.actual_end_date) : act.planned_end_date ? new Date(act.planned_end_date) : null,
        progress: act.progress ?? 0,
        status: act.status ?? 'pending',
        parentId: act.parent_id ?? p.id,
        projectId: p.id,
      });

      if (collapsed.has(act.id)) return;

      // Child activities
      const children = activities.filter(a => a.parent_id === act.id);
      children.forEach(c => addActivity(c, depth + 1));

      // Tasks attached to this activity
      const actTasks = tasks.filter(t => t.activity_id === act.id);
      actTasks.forEach(t => {
        rows.push({
          id: t.id,
          label: t.title,
          type: 'task',
          depth: depth + 1,
          startDate: t.start_date ? new Date(t.start_date) : null,
          endDate: t.due_date ? new Date(t.due_date) : null,
          progress: t.status === 'validated' || t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0,
          status: t.status ?? 'todo',
          priority: t.priority,
          projectId: p.id,
        });
      });
    };

    rootActivities.forEach(a => addActivity(a, 1));

    // Tasks not attached to any activity
    const orphanTasks = tasks.filter(t => t.project_id === p.id && !t.activity_id);
    orphanTasks.forEach(t => {
      rows.push({
        id: t.id,
        label: t.title,
        type: 'task',
        depth: 1,
        startDate: t.start_date ? new Date(t.start_date) : null,
        endDate: t.due_date ? new Date(t.due_date) : null,
        progress: t.status === 'validated' || t.status === 'completed' ? 100 : t.status === 'in_progress' ? 50 : 0,
        status: t.status ?? 'todo',
        priority: t.priority,
        projectId: p.id,
      });
    });
  }

  return rows;
}

export default function MissionGanttTab({ missionId }: MissionGanttTabProps) {
  const { data, isLoading } = useGanttData(missionId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rows = useMemo(() => {
    if (!data) return [];
    return buildRows(data.projects, data.activities, data.tasks, collapsed);
  }, [data, collapsed]);

  // Compute timeline range
  const { timelineStart, timelineEnd, days, months } = useMemo(() => {
    const allDates: Date[] = [];
    rows.forEach(r => {
      if (r.startDate) allDates.push(r.startDate);
      if (r.endDate) allDates.push(r.endDate);
    });

    if (allDates.length === 0) {
      const now = new Date();
      allDates.push(addDays(now, -15), addDays(now, 45));
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    const tStart = addDays(startOfMonth(minDate), -7);
    const tEnd = addDays(endOfMonth(maxDate), 14);

    return {
      timelineStart: tStart,
      timelineEnd: tEnd,
      days: eachDayOfInterval({ start: tStart, end: tEnd }),
      months: eachMonthOfInterval({ start: tStart, end: tEnd }),
    };
  }, [rows]);

  const colWidth = COL_WIDTHS[zoom];
  const totalWidth = days.length * colWidth;
  const ROW_HEIGHT = 36;
  const LABEL_WIDTH = 280;

  const getBarStyle = (row: GanttRow) => {
    if (!row.startDate || !row.endDate) return null;
    const startOffset = differenceInDays(row.startDate, timelineStart);
    const duration = Math.max(differenceInDays(row.endDate, row.startDate), 1);
    return {
      left: startOffset * colWidth,
      width: duration * colWidth,
    };
  };

  if (isLoading) return <Loading />;

  if (!data || (data.projects.length === 0)) {
    return (
      <EmptyState
        icon={Layers}
        title="Aucune donnée Gantt"
        description="Créez des projets avec des dates pour visualiser le diagramme de Gantt."
      />
    );
  }

  const today = new Date();
  const todayOffset = differenceInDays(today, timelineStart) * colWidth;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Zoom :</span>
          <Button
            variant={zoom === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoom('day')}
          >
            Jour
          </Button>
          <Button
            variant={zoom === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoom('week')}
          >
            Semaine
          </Button>
          <Button
            variant={zoom === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoom('month')}
          >
            Mois
          </Button>
        </div>

        {/* Gantt chart */}
        <div className="border rounded-lg overflow-hidden bg-card">
          <div className="flex">
            {/* Left panel - labels */}
            <div
              className="flex-shrink-0 border-r bg-muted/30"
              style={{ width: LABEL_WIDTH }}
            >
              {/* Header */}
              <div className="h-14 border-b flex items-center px-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Éléments
                </span>
              </div>
              {/* Row labels */}
              {rows.map(row => (
                <div
                  key={row.id}
                  className={cn(
                    'flex items-center gap-1.5 border-b px-2 cursor-default hover:bg-muted/40 transition-colors',
                    row.type === 'project' && 'bg-muted/20 font-semibold'
                  )}
                  style={{ height: ROW_HEIGHT, paddingLeft: 8 + row.depth * 16 }}
                >
                  {(row.type === 'project' || row.type === 'activity') && (
                    <button
                      onClick={() => toggleCollapse(row.id)}
                      className="p-0.5 rounded hover:bg-muted transition-colors"
                    >
                      {collapsed.has(row.id) ? (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  )}
                  {row.type === 'project' && (
                    <FolderOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  )}
                  {row.type === 'activity' && (
                    <Folder className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  )}
                  {row.type === 'task' && (
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xs truncate flex-1">{row.label}</span>
                  {row.code && (
                    <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                      {row.code}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Right panel - timeline */}
            <div className="flex-1 overflow-x-auto" ref={scrollRef}>
              <div style={{ width: totalWidth, minWidth: '100%' }}>
                {/* Timeline header */}
                <div className="h-14 border-b relative">
                  {/* Month row */}
                  <div className="h-7 flex border-b">
                    {months.map((m, i) => {
                      const monthStart = Math.max(0, differenceInDays(m, timelineStart));
                      const nextMonth = i < months.length - 1 ? months[i + 1] : timelineEnd;
                      const monthDays = differenceInDays(nextMonth, m);
                      return (
                        <div
                          key={m.toISOString()}
                          className="flex-shrink-0 flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase border-r"
                          style={{ width: monthDays * colWidth, position: 'absolute', left: monthStart * colWidth }}
                        >
                          {format(m, 'MMMM yyyy', { locale: fr })}
                        </div>
                      );
                    })}
                  </div>
                  {/* Day/week row */}
                  <div className="h-7 flex">
                    {days.map((d, i) => {
                      const isWE = isWeekend(d);
                      const showLabel = zoom === 'day' || (zoom === 'week' && d.getDay() === 1) || (zoom === 'month' && d.getDate() === 1);
                      return (
                        <div
                          key={i}
                          className={cn(
                            'flex-shrink-0 flex items-center justify-center text-[9px] border-r',
                            isWE ? 'bg-muted/40 text-muted-foreground/50' : 'text-muted-foreground'
                          )}
                          style={{ width: colWidth }}
                        >
                          {showLabel && (
                            zoom === 'day' ? format(d, 'd') :
                            zoom === 'week' ? format(d, 'd MMM', { locale: fr }) :
                            format(d, 'd', { locale: fr })
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rows */}
                <div className="relative">
                  {/* Weekend backgrounds */}
                  {days.map((d, i) => isWeekend(d) && (
                    <div
                      key={`we-${i}`}
                      className="absolute top-0 bg-muted/20"
                      style={{
                        left: i * colWidth,
                        width: colWidth,
                        height: rows.length * ROW_HEIGHT,
                      }}
                    />
                  ))}

                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset <= totalWidth && (
                    <div
                      className="absolute top-0 w-0.5 bg-destructive/60 z-20"
                      style={{
                        left: todayOffset,
                        height: rows.length * ROW_HEIGHT,
                      }}
                    />
                  )}

                  {rows.map((row, rowIdx) => {
                    const bar = getBarStyle(row);
                    const barColor = STATUS_COLORS[row.status] ?? 'hsl(var(--primary))';

                    return (
                      <div
                        key={row.id}
                        className="border-b relative"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {bar && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'absolute top-1.5 rounded-sm cursor-pointer transition-opacity hover:opacity-90',
                                  row.type === 'project' ? 'h-5' : row.type === 'activity' ? 'h-4' : 'h-3.5'
                                )}
                                style={{
                                  left: bar.left,
                                  width: Math.max(bar.width, 4),
                                  top: row.type === 'project' ? 6 : row.type === 'activity' ? 8 : 10,
                                  backgroundColor: barColor,
                                  opacity: 0.85,
                                  borderRadius: row.type === 'project' ? 4 : 3,
                                }}
                              >
                                {/* Progress fill */}
                                {row.progress > 0 && row.progress < 100 && (
                                  <div
                                    className="absolute inset-y-0 left-0 rounded-l-sm"
                                    style={{
                                      width: `${row.progress}%`,
                                      backgroundColor: 'hsla(0,0%,100%,0.3)',
                                      borderRadius: 'inherit',
                                    }}
                                  />
                                )}
                                {/* Label on bar if wide enough */}
                                {bar.width > 60 && (
                                  <span className="absolute inset-0 flex items-center px-1.5 text-[9px] font-medium text-white truncate">
                                    {row.label}
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-xs">
                              <p className="font-semibold">{row.label}</p>
                              <p className="text-muted-foreground">
                                {row.startDate && format(row.startDate, 'dd MMM yyyy', { locale: fr })}
                                {' → '}
                                {row.endDate && format(row.endDate, 'dd MMM yyyy', { locale: fr })}
                              </p>
                              <p>Progression : {row.progress}%</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Show a dot for items without date range */}
                        {!bar && row.startDate && (
                          <div
                            className="absolute w-2.5 h-2.5 rounded-full"
                            style={{
                              left: differenceInDays(row.startDate, timelineStart) * colWidth - 5,
                              top: ROW_HEIGHT / 2 - 5,
                              backgroundColor: barColor,
                            }}
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

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS.in_progress }} />
            <span>En cours</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS.validated }} />
            <span>Validé</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS.in_review }} />
            <span>En revue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS.todo }} />
            <span>À faire</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: STATUS_COLORS.correction }} />
            <span>Correction</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-destructive/60" />
            <span>Aujourd'hui</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
