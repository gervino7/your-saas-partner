import { Badge } from '@/components/ui/badge';
import { MISSION_STATUS_LABELS } from '@/types/database';
import type { MissionStatus } from '@/types/database';

const statusColors: Record<MissionStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  planning: 'bg-info/15 text-info border-info/30',
  active: 'bg-success/15 text-success border-success/30',
  on_hold: 'bg-warning/15 text-warning border-warning/30',
  completed: 'bg-primary/15 text-primary border-primary/30',
  archived: 'bg-muted text-muted-foreground',
};

export default function MissionStatusBadge({ status }: { status: string }) {
  const s = status as MissionStatus;
  return (
    <Badge variant="outline" className={statusColors[s] ?? ''}>
      {MISSION_STATUS_LABELS[s] ?? status}
    </Badge>
  );
}
