import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditLog } from '@/hooks/useSuperAdmin';
import { auditLabel } from '@/lib/superAdmin';
import { exportToCSV } from '@/lib/exportUtils';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

const PAGE_SIZE = 50;

export default function JournalPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAuditLog(page, PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');

  const rows = (data?.rows ?? []) as any[];
  const total = data?.total ?? 0;
  const maxPage = Math.max(Math.ceil(total / PAGE_SIZE) - 1, 0);

  const actions = useMemo(() => Array.from(new Set(rows.map((l) => l.action))).sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((l) => {
      if (action !== 'all' && l.action !== action) return false;
      if (q && ![l.admin_email, l.target_label, l.target_type].some((v) => (v ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, search, action]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Journal d'audit</h1>
          <p className="text-sm text-muted-foreground">{total} action(s) enregistrée(s)</p>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            exportToCSV(
              filtered.map((l) => ({
                date: l.created_at ? format(new Date(l.created_at), 'dd/MM/yyyy HH:mm') : '',
                admin: l.admin_email ?? '',
                action: auditLabel(l.action),
                cible: l.target_label ?? '',
                type: l.target_type ?? '',
              })),
              'journal-audit',
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <Input placeholder="Admin, cible…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {actions.map((a) => <SelectItem key={a} value={a}>{auditLabel(a)}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Administrateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {l.created_at ? format(new Date(l.created_at), 'dd/MM/yyyy HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{l.admin_email ?? '-'}</TableCell>
                  <TableCell><Badge variant="outline">{auditLabel(l.action)}</Badge></TableCell>
                  <TableCell className="text-sm">
                    {l.target_label ?? '-'}
                    {l.target_type && <span className="ml-1 text-xs text-muted-foreground">({l.target_type})</span>}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                    {l.details ? JSON.stringify(l.details) : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {maxPage > 0 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédent</Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} / {maxPage + 1}</span>
          <Button variant="outline" size="sm" disabled={page >= maxPage} onClick={() => setPage(page + 1)}>Suivant</Button>
        </div>
      )}
    </div>
  );
}
