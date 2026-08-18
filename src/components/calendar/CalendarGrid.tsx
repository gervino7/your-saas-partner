import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, isToday, addMonths, subMonths,
  addWeeks, subWeeks, addDays, subDays,
  startOfISOWeek, endOfISOWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Video, Shield, Flag, Star, CalendarDays } from 'lucide-react';
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

const eventStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  meeting: { bg: 'bg-info/10', text: 'text-info', border: 'border-info', dot: 'bg-info' },
  copil: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning', dot: 'bg-warning' },
  deadline: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive', dot: 'bg-destructive' },
  milestone: { bg: 'bg-success/10', text: 'text-success', border: 'border-success', dot: 'bg-success' },
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
      return `${format(s, 'd', { locale: fr })} - ${format(e, 'd MMM yyyy', { locale: fr })}`;
    }
    return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
  }, [currentDate, view]);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(e.start, day));

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const s = startOfISOWeek(currentDate);
    const e = endOfISOWeek(currentDate);
    return eachDayOfInterval({ start: s, end: e });
  }, [currentDate]);

  const agendaEntries = useMemo(() => {
    const days = eachDayOfInterval({ start: currentDate, end: addDays(currentDate, 13) });
    return days
      .map((d) => ({ date: d, events: getEventsForDay(d) }))
      .filter((d) => d.events.length > 0);
  }, [currentDate, events]);

  const getEventStyle = (type: string) => eventStyles[type] || eventStyles.meeting;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/50" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold font-display capitalize min-w-[200px] text-center text-foreground">
            {title}
          </h2>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/50" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary" onClick={() => setCurrentDate(new Date())}>
            Aujourd'hui
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-muted/40 p-1">
            {(['month', 'week', 'day', 'agenda'] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                  view === v
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : v === 'day' ? 'Jour' : 'Agenda'}
              </button>
            ))}
          </div>
          <Button size="sm" className="rounded-xl shadow-md" onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-1" /> Réunion
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 text-xs px-1">
        {[
          { type: 'meeting', label: 'Réunion' },
          { type: 'copil', label: 'COPIL/CODIR' },
          { type: 'deadline', label: 'Échéance' },
        ].map((l) => {
          const style = getEventStyle(l.type);
          return (
            <div key={l.type} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', style.dot)} />
              <span className="text-muted-foreground">{l.label}</span>
            </div>
          );
        })}
      </div>

      {/* Month View */}
      {view === 'month' && (
        <div className="border border-border/50 rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-muted border-b border-border/40">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <div key={d} className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {monthDays.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              return (
                <div
                  key={i}
                  onClick={() => dayEvents.length === 0 ? onDateClick(day) : undefined}
                  className={cn(
                    'min-h-[100px] border-b border-r border-border/30 p-1.5 cursor-pointer transition-colors',
                    inMonth ? 'bg-card hover:bg-card/80' : 'bg-secondary',
                    !inMonth && 'text-muted-foreground',
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium mb-1 h-6 w-6 flex items-center justify-center rounded-full transition-colors',
                    today && 'bg-primary text-primary-foreground shadow-sm',
                    !today && inMonth && 'text-foreground',
                    !today && !inMonth && 'text-muted-foreground',
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt) => {
                      const Icon = eventIcons[evt.type] || Video;
                      const style = getEventStyle(evt.type);
                      return (
                        <button
                          key={evt.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                          className={cn(
                            'w-full text-left rounded-md px-1.5 py-0.5 text-[10px] font-medium truncate flex items-center gap-1 transition-opacity hover:opacity-75',
                            style.bg, style.text
                          )}
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
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-7 border-b border-border/40">
            {weekDays.map((day) => {
              const today = isToday(day);
              return (
                <div key={day.toISOString()} className={cn('py-3 text-center', today && 'bg-primary/5')}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={cn(
                    'text-sm font-bold mt-1 h-8 w-8 mx-auto flex items-center justify-center rounded-full',
                    today ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground'
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[400px]">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'border-r border-border/30 p-1.5 space-y-1 cursor-pointer transition-colors hover:bg-muted/20',
                    today && 'bg-primary/[0.02]',
                  )}
                  onClick={() => dayEvents.length === 0 ? onDateClick(day) : undefined}
                >
                  {dayEvents.map((evt) => {
                    const Icon = eventIcons[evt.type] || Video;
                    const style = getEventStyle(evt.type);
                    return (
                      <button
                        key={evt.id}
                        onClick={(e) => { e.stopPropagation(); onEventClick(evt); }}
                        className={cn(
                          'w-full text-left rounded-lg p-1.5 text-xs transition-opacity hover:opacity-75 border-l-[3px]',
                          style.bg, style.border
                        )}
                      >
                        <div className={cn('flex items-center gap-1 mb-0.5', style.text)}>
                          <Icon className="h-3 w-3" />
                          <span className="font-semibold text-[10px]">{format(evt.start, 'HH:mm')}</span>
                        </div>
                        <span className="truncate block text-[11px] text-foreground">{evt.title}</span>
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
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
          <div className={cn('px-5 py-4 border-b border-border/40', isToday(currentDate) && 'bg-primary/5')}>
            <div className="text-base font-semibold capitalize text-foreground">
              {format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </div>
          </div>
          <div className="p-4 space-y-2.5 min-h-[400px]">
            {getEventsForDay(currentDate).length === 0 ? (
              <div className="text-center py-16">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <CalendarDays className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Aucun événement ce jour</p>
                <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => onDateClick(currentDate)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Créer une réunion
                </Button>
              </div>
            ) : (
              getEventsForDay(currentDate).map((evt) => {
                const Icon = eventIcons[evt.type] || Video;
                const style = getEventStyle(evt.type);
                return (
                  <button
                    key={evt.id}
                    onClick={() => onEventClick(evt)}
                    className={cn(
                      'w-full text-left rounded-xl p-4 transition-all hover:shadow-sm flex items-start gap-3 border-l-[3px]',
                      style.bg, style.border
                    )}
                  >
                    <div className={cn('p-2 rounded-lg', style.bg)}>
                      <Icon className={cn('h-4 w-4', style.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{evt.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(evt.start, 'HH:mm')} - {format(evt.end, 'HH:mm')}
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
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-[var(--shadow-card)]">
          {agendaEntries.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <CalendarDays className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">Aucun événement dans les 14 prochains jours</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {agendaEntries.map(({ date, events: dayEvents }) => (
                <div key={date.toISOString()} className="p-4">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold',
                      isToday(date) ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-muted-foreground',
                    )}>
                      {format(date, 'd')}
                    </div>
                    <span className="text-sm font-semibold capitalize text-foreground">
                      {format(date, 'EEEE d MMM', { locale: fr })}
                    </span>
                    {isToday(date) && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Aujourd'hui
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 ml-[46px]">
                    {dayEvents.map((evt) => {
                      const Icon = eventIcons[evt.type] || Video;
                      const style = getEventStyle(evt.type);
                      return (
                        <button
                          key={evt.id}
                          onClick={() => onEventClick(evt)}
                          className="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors group"
                        >
                          <div className={cn('p-1.5 rounded-lg transition-colors', style.bg)}>
                            <Icon className={cn('h-3.5 w-3.5', style.text)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                              {evt.title}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                            {format(evt.start, 'HH:mm')} - {format(evt.end, 'HH:mm')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
