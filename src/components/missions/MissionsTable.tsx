import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MissionStatusBadge from './MissionStatusBadge';
import PriorityBadge from './PriorityBadge';

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

export default function MissionsTable({ missions }: { missions: any[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Priorité</TableHead>
            <TableHead>Équipe</TableHead>
            <TableHead>Progression</TableHead>
            <TableHead>Dates</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {missions.map((m) => (
            <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Link to={`/missions/${m.id}`} className="font-mono text-xs text-muted-foreground hover:text-primary">
                  {m.code}
                </Link>
              </TableCell>
              <TableCell>
                <Link to={`/missions/${m.id}`} className="font-medium hover:text-primary">
                  {m.name}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{m.client?.name ?? '—'}</TableCell>
              <TableCell><MissionStatusBadge status={m.status ?? 'draft'} /></TableCell>
              <TableCell><PriorityBadge priority={m.priority} /></TableCell>
              <TableCell>
                <div className="flex -space-x-1">
                  {m.director && (
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={m.director.avatar_url ?? ''} />
                      <AvatarFallback className="text-[9px]">{initials(m.director.full_name)}</AvatarFallback>
                    </Avatar>
                  )}
                  {m.chief && (
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarImage src={m.chief.avatar_url ?? ''} />
                      <AvatarFallback className="text-[9px]">{initials(m.chief.full_name)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Progress value={m.progress ?? 0} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{m.progress ?? 0}%</span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {m.start_date ? format(new Date(m.start_date), 'dd/MM/yy', { locale: fr }) : '—'}
                {' — '}
                {m.end_date ? format(new Date(m.end_date), 'dd/MM/yy', { locale: fr }) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
