import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, LogOut, CornerDownLeft, Flag } from 'lucide-react';
import type { AttendanceEvent } from '@/hooks/useAttendance';
import { formatTime } from '@/lib/timeUtils';

const CONFIG = {
  arrivee: { icon: CheckCircle2, label: 'Arrivée', color: 'text-success' },
  sortie_pro: { icon: LogOut, label: 'Sortie', color: 'text-warning' },
  retour: { icon: CornerDownLeft, label: 'Retour', color: 'text-info' },
  depart: { icon: Flag, label: 'Départ', color: 'text-primary' },
} as const;

export default function AttendanceTimeline({ events }: { events: AttendanceEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Journée en cours</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement enregistré aujourd'hui.</p>
        ) : (
          <ol className="relative border-l border-border pl-5 space-y-4">
            {events.map((e) => {
              const cfg = CONFIG[e.event_type];
              const Icon = cfg.icon;
              return (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[27px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border">
                    <Icon className={`h-3 w-3 ${cfg.color}`} />
                  </span>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium">
                        {cfg.label}
                        {e.event_type === 'sortie_pro' && e.reason && (
                          <span className="font-normal text-muted-foreground"> — {e.reason}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1 text-xs text-muted-foreground">
                        {e.destination && <span>📍 {e.destination}</span>}
                        {e.mission && <Badge variant="outline" className="text-[10px]">{e.mission.name}</Badge>}
                        {e.authorizer && <span>· autorisée par {e.authorizer.full_name}</span>}
                      </div>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">{formatTime(e.event_at)}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
