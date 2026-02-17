import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, UserPlus, Shield, Pencil } from 'lucide-react';
import ExportMenu from '@/components/common/ExportMenu';
import { useOrganizationUsers } from '@/hooks/useMissions';
import { useUpdateUserGrade } from '@/hooks/useAdmin';
import { GRADE_LABELS, GRADE_LEVELS } from '@/types/database';
import type { Grade } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const GRADES = Object.keys(GRADE_LABELS) as Grade[];

export default function AdminUsers() {
  const { data: users = [], isLoading } = useOrganizationUsers();
  const updateGrade = useUpdateUserGrade();
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingUser, setEditingUser] = useState<{ id: string; grade: Grade } | null>(null);

  const filtered = users.filter((u: any) => {
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGrade !== 'all' && u.grade !== filterGrade) return false;
    if (filterStatus === 'online' && !u.is_online) return false;
    if (filterStatus === 'offline' && u.is_online) return false;
    return true;
  });

  const handleSaveGrade = () => {
    if (!editingUser) return;
    updateGrade.mutate({
      userId: editingUser.id,
      grade: editingUser.grade,
      grade_level: GRADE_LEVELS[editingUser.grade],
    });
    setEditingUser(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un utilisateur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les grades</SelectItem>
            {GRADES.map((g) => <SelectItem key={g} value={g}>{g} — {GRADE_LABELS[g]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="online">En ligne</SelectItem>
            <SelectItem value="offline">Hors ligne</SelectItem>
          </SelectContent>
        </Select>
        <ExportMenu
          data={filtered.map((u: any) => ({
            nom: u.full_name ?? '',
            email: u.email ?? '',
            grade: u.grade ?? '',
            statut: u.is_online ? 'En ligne' : 'Hors ligne',
          }))}
          filename="utilisateurs"
          columns={[
            { key: 'nom', label: 'Nom' },
            { key: 'email', label: 'Email' },
            { key: 'grade', label: 'Grade' },
            { key: 'statut', label: 'Statut' },
          ]}
          title="Liste des utilisateurs"
        />
        <Button size="sm" variant="default"><UserPlus className="h-4 w-4 mr-1" /> Inviter</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun utilisateur trouvé</TableCell></TableRow>
              ) : (
                filtered.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback className="text-xs">{u.full_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {u.is_online && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{u.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{u.grade || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_online ? 'default' : 'secondary'} className="text-[10px]">
                        {u.is_online ? 'En ligne' : 'Hors ligne'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingUser({ id: u.id, grade: (u.grade as Grade) || 'AUD' })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Modifier le grade de {u.full_name}</DialogTitle></DialogHeader>
                          <div className="space-y-4">
                            <Select value={editingUser?.grade || u.grade || 'AUD'} onValueChange={(v) => setEditingUser((prev) => prev ? { ...prev, grade: v as Grade } : null)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {GRADES.map((g) => <SelectItem key={g} value={g}>{g} — {GRADE_LABELS[g]}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button className="w-full" onClick={handleSaveGrade} disabled={updateGrade.isPending}>Enregistrer</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
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
