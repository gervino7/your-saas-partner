import * as React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortDirection } from '@/hooks/useTableSort';

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string;
  currentSort: { key: string; direction: SortDirection };
  onSort: (key: string) => void;
  children: React.ReactNode;
}

export function SortableTableHead({ sortKey, currentSort, onSort, children, className, ...props }: SortableTableHeadProps) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:text-foreground transition-colors', className)}
      onClick={() => onSort(sortKey)}
      {...props}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        {direction === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
        ) : direction === 'desc' ? (
          <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        )}
      </div>
    </TableHead>
  );
}
