import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToCSV, exportToXLSX, exportToPDF, type ExportColumn } from '@/lib/exportUtils';

interface ExportMenuProps {
  data: Record<string, any>[];
  filename: string;
  columns?: ExportColumn[];
  title?: string;
}

export default function ExportMenu({ data, filename, columns, title }: ExportMenuProps) {
  if (!data || data.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Exporter les données">
          <Download className="h-4 w-4 mr-1" /> Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportToCSV(data, filename, columns)}>
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToXLSX(data, filename, columns)}>
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPDF(data, filename, columns, title)}>
          PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
