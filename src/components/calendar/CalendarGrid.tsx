import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, isToday, addMonths, subMonths,
  addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay,
  startOfISOWeek, endOfISOWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Video, Shield, Flag, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/hooks/useCalendar';

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

interface CalendarGridProps {
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onCreateClick: () => void;
}

const eventIcons: Record<string, any> = {
  meeting: Video,
  copil: Shield,
  deadline: Flag,
  milestone: Star,
};

export default function CalendarGrid({ events, onDateClick, onEventClick, onCreateClick }: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');

  const navigate = (dir: 'prev' | 'next') => {
    const fn = dir === 'prev'
      ? view === 'month' ? subMonths : view === 'week' ? subWeeks : subDays
      : view === 'month' ? addMonths : view === 'week' ? addWeeks : addDays;
    setCurrentDate(fn(currentDate, 1));
  };

  const title = useMemo(() => {
    if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: fr });
    if (view === 'week') {
      const s = startOfISOWeek(currentDate);
      const e = endOfISOWeek(currentDate);
      return `${format(s, 'd', { locale: fr })} — ${format(e, 'd MMM yyyy', { locale: fr })}`;
    }
    return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
  }, [currentDate, view]);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(e.start, day));

  // Month view
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  // Week view
  const weekDays = useMemo(() => {
    const s = startOfISOWeek(currentDate);
    const e = endOfISOWeek(currentDate);
    return eachDayOfInterval({ start: s, end: e });
  }, [currentDate]);

  // Agenda view: next 14 days with events
  const agendaEntries = useMemo(() => {
    const days = eachDayOfInterval({ start: currentDate, end: addDays(currentDate, 13) });
    return days
      .map((d) => ({ date: d, events: getEventsForDay(d) }))
      .filter((d) => d.events.length > 0);
  }, [currentDate, events]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold font-display capitalize min-w-[200px] text-center">
            {title}
          </h2>
          <Button variant="outline" size="icon" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Aujourd'hui
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  view === v
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : v === 'day' ? 'Jour' : 'Agenda'}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-1" /> Réunion
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        {[
          { type: 'meeting', label: 'Réunion', color: 'hsl(217, 91%, 60%)' },
          { type: 'copil', label: 'COPIL/CODIR', color: 'hsl(38, 92%, 50%)' },
          { type: 'deadline', label: 'Échéance', color: 'hsl(0, 84%, 60%)' },
        ].map((l) => (
          <div key={l.type} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-b">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              return (
                <div
                  key={i}
                  onClick={() => dayEvents.length === 0 ? onDateClick(day) : undefined}
                  className={cn(
                    'min-h-[100px] border-b border-r p-1.5 cursor-pointer hover:bg-muted/30 transition-colors',
                    !inMonth && 'opacity-40',
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium mb-1 h-6 w-6 flex items-center justify-center rounded-full',
                    isToday(day) && 'bg-primary text-primary-foreground',
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const Icon = eventIcons[evt.type] || Video;
                      return (
                        <button
                          key={evt.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                          className="w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `${evt.color}20`, color: evt.color }}
                        >
                          <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate">{format(evt.start, 'HH:mm')} {evt.title}</span>
                        </button>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} autres</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === 'week' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className={cn('p-2 text-center border-b', isToday(day) && 'bg-primary/10')}>
                <div className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: fr })}</div>
                <div className={cn(
                  'text-sm font-semibold mt-0.5 h-7 w-7 mx-auto flex items-center justify-center rounded-full',
                  isToday(day) && 'bg-primary text-primary-foreground'
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className="border-r p-1.5 space-y-1 cursor-pointer hover:bg-muted/30"
                  onClick={() => dayEvents.length === 0 ? onDateClick(day) : undefined}
                >
                  {dayEvents.map((evt) => {
                    const Icon = eventIcons[evt.type] || Video;
                    return (
                      <button
                        key={evt.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                        className="w-full text-left rounded p-1.5 text-xs hover:opacity-80"
                        style={{ backgroundColor: `${evt.color}15`, borderLeft: `3px solid ${evt.color}` }}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <Icon className="h-3 w-3" style={{ color: evt.color }} />
                          <span className="font-medium text-[10px]">{format(evt.start, 'HH:mm')}</span>
                        </div>
                        <span className="truncate block text-[11px]">{evt.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === 'day' && (
        <div className="border rounded-lg">
          <div className={cn('p-3 border-b text-center', isToday(currentDate) && 'bg-primary/5')}>
            <div className="text-sm font-semibold capitalize">
              {format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </div>
          </div>
          <div className="p-3 space-y-2 min-h-[400px]">
            {getEventsForDay(currentDate).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                <p>Aucun événement</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => onDateClick(currentDate)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Créer
                </Button>
              </div>
            ) : (
              getEventsForDay(currentDate).map((evt) => {
                const Icon = eventIcons[evt.type] || Video;
                return (
                  <button
                    key={evt.id}
                    onClick={() => onEventClick(evt)}
                    className="w-full text-left rounded-lg p-3 hover:opacity-80 transition-opacity flex items-start gap-3"
                    style={{ backgroundColor: `${evt.color}10`, borderLeft: `4px solid ${evt.color}` }}
                  >
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${evt.color}20` }}>
                      <Icon className="h-4 w-4" style={{ color: evt.color }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{evt.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(evt.start, 'HH:mm')} — {format(evt.end, 'HH:mm')}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Agenda View */}
      {view === 'agenda' && (
        <div className="border rounded-lg divide-y">
          {agendaEntries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Aucun événement dans les 14 prochains jours.
            </div>
          ) : (
            agendaEntries.map(({ date, events: dayEvents }) => (
              <div key={date.toISOString()} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
                    isToday(date) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    {format(date, 'd')}
                  </div>
                  <span className="text-sm font-medium capitalize">{format(date, 'EEEE d MMM', { locale: fr })}</span>
                </div>
                <div className="space-y-1.5 ml-10">
                  {dayEvents.map((evt) => {
                    const Icon = eventIcons[evt.type] || Video;
                    return (
                      <button
                        key={evt.id}
                        onClick={() => onEventClick(evt)}
                        className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: evt.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{evt.title}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(evt.start, 'HH:mm')} — {format(evt.end, 'HH:mm')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
