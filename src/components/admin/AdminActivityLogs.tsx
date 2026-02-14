import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useActivityLogs } from '@/hooks/useAdmin';
import { useOrganizationUsers } from '@/hooks/useMissions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ACTION_LABELS: Record<string, string> = {
  login: 'Connexion',
  logout: 'Déconnexion',
  task_complete: 'Tâche terminée',
  task_submit: 'Tâche soumise',
  task_validate: 'Tâche validée',
  document_view: 'Document consulté',
  document_upload: 'Document uploadé',
  message_sent: 'Message envoyé',
  meeting_join: 'Réunion rejointe',
};

const ENTITY_TYPES = ['mission', 'project', 'task', 'document', 'meeting'];
const ACTIONS = Object.keys(ACTION_LABELS);

export default function AdminActivityLogs() {
  const { data: users = [] } = useOrganizationUsers();
  const [filterUser, setFilterUser] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: logs = [], isLoading } = useActivityLogs({
    userId: filterUser !== 'all' ? filterUser : undefined,
    action: filterAction !== 'all' ? filterAction : undefined,
    entityType: filterEntity !== 'all' ? filterEntity : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Utilisateur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {ACTIONS.map((a) => <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Entité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {ENTITY_TYPES.map((e) => <SelectItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px] h-9" placeholder="Du" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px] h-9" placeholder="Au" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun journal trouvé</TableCell></TableRow>
              ) : (
                logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.created_at), 'dd/MM/yy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={log.user?.avatar_url} />
                          <AvatarFallback className="text-[10px]">{log.user?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{log.user?.full_name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{ACTION_LABELS[log.action] || log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.entity_type || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {log.metadata ? JSON.stringify(log.metadata).slice(0, 80) : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
