import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useClientMissions } from '@/hooks/useCRM';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusLabels: Record<string, string> = { draft: 'Brouillon', planning: 'Planification', active: 'Active', paused: 'En pause', completed: 'Terminée', archived: 'Archivée' };
const statusColors: Record<string, string> = { draft: 'secondary', planning: 'outline', active: 'default', completed: 'default', paused: 'secondary', archived: 'secondary' };

export default function ClientMissionsTab({ clientId }: { clientId: string }) {
  const { data: missions, isLoading } = useClientMissions(clientId);
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader><CardTitle>Missions</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <div className="animate-pulse h-20 bg-muted rounded" /> : !missions?.length ? (
          <p className="text-muted-foreground text-sm">Aucune mission associée.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Chef de mission</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Progression</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missions.map((m: any) => (
                <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/missions/${m.id}`)}>
                  <TableCell className="font-mono text-xs">{m.code}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell><Badge variant={(statusColors[m.status] || 'secondary') as any}>{statusLabels[m.status] || m.status}</Badge></TableCell>
                  <TableCell>{(m.chief as any)?.full_name || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.start_date ? format(new Date(m.start_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                    {m.end_date ? ` → ${format(new Date(m.end_date), 'dd MMM yyyy', { locale: fr })}` : ''}
                  </TableCell>
                  <TableCell><div className="flex items-center gap-2"><Progress value={m.progress ?? 0} className="h-2 w-20" /><span className="text-xs">{m.progress ?? 0}%</span></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
