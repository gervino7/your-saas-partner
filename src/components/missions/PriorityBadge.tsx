import { Badge } from '@/components/ui/badge';

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Basse', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Moyenne', className: 'bg-info/15 text-info border-info/30' },
  high: { label: 'Haute', className: 'bg-warning/15 text-warning border-warning/30' },
  urgent: { label: 'Urgente', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export default function PriorityBadge({ priority }: { priority: string | null }) {
  const config = priorityConfig[priority ?? 'medium'] ?? priorityConfig.medium;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
