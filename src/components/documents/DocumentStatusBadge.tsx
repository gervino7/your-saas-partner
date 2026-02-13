import { cn } from '@/lib/utils';
import { DOC_STATUS_MAP } from '@/lib/fileUtils';

export default function DocumentStatusBadge({ status }: { status: string | null }) {
  const s = DOC_STATUS_MAP[status || 'draft'] || DOC_STATUS_MAP.draft;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', s.color)}>
      {s.label}
    </span>
  );
}
