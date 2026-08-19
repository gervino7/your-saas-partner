import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlatformHealth } from '@/hooks/useSuperAdmin';
import { ALERT_META, barClass } from '@/lib/superAdmin';
import { cn } from '@/lib/utils';

const Bar = ({ pct }: { pct: number }) => (
  <div className="flex items-center gap-2">
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full', barClass(pct))} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
    <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
  </div>
);

export default function SantePage() {
  const { data: rows = [], isLoading } = usePlatformHealth();

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const critical = (rows as any[]).filter((r) => r.alert_level === 'depassement');
  const warning = (rows as any[]).filter((r) => r.alert_level === 'attention');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Santé de la plateforme</h1>
        <p className="text-sm text-muted-foreground">
          {critical.length} dépassement(s) · {warning.length} organisation(s) à surveiller
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Consommation des quotas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Utilisateurs</TableHead>
                <TableHead>Stockage</TableHead>
                <TableHead>Alerte</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows as any[]).map((r) => (
                <TableRow key={r.org_id} className={r.alert_level === 'depassement' ? 'bg-destructive/5' : undefined}>
                  <TableCell>
                    <Link className="font-medium hover:underline" to={`/super-admin/organisations/${r.org_id}`}>
                      {r.org_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{r.users} / {r.max_users}</span>
                    <Bar pct={Number(r.users_pct ?? 0)} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{Number(r.storage_gb ?? 0).toFixed(2)} / {r.max_storage_gb} Go</span>
                    <Bar pct={Number(r.storage_pct ?? 0)} />
                  </TableCell>
                  <TableCell>
                    <Badge className={ALERT_META[r.alert_level]?.className}>
                      {ALERT_META[r.alert_level]?.label ?? r.alert_level}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
