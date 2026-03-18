import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, UserPlus, Pencil, Trash2 } from 'lucide-react';
import ExportMenu from '@/components/common/ExportMenu';
import { useOrganizationUsers } from '@/hooks/useMissions';
import { useUpdateUserProfile, useDeleteUser, useInviteUser } from '@/hooks/useAdmin';
import { GRADE_LABELS, GRADE_LEVELS } from '@/types/database';
import type { Grade } from '@/types/database';
import { useAuthStore } from '@/stores/authStore';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';

const GRADES = Object.keys(GRADE_LABELS) as Grade[];

interface EditingUser {
  id: string;
  full_name: string;
  phone: string;
  grade: Grade;
}

export default function AdminUsers() {
  const { data: users = [], isLoading } = useOrganizationUsers();
  const updateUser = useUpdateUserProfile();
  const deleteUser = useDeleteUser();
  const inviteUser = useInviteUser();
  const currentUserId = useAuthStore((s) => s.profile?.id);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteGrade, setInviteGrade] = useState<Grade>('AUD');

  const filtered = users.filter((u: any) => {
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGrade !== 'all' && u.grade !== filterGrade) return false;
    if (filterStatus === 'online' && !u.is_online) return false;
    if (filterStatus === 'offline' && u.is_online) return false;
    return true;
  });

  const { sorted: sortedUsers, sort, handleSort } = useTableSort(filtered);

  const handleOpenEdit = (u: any) => {
    setEditingUser({
      id: u.id,
      full_name: u.full_name || '',
      phone: u.phone || '',
      grade: (u.grade as Grade) || 'AUD',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingUser) return;
    updateUser.mutate(
      { userId: editingUser.id, full_name: editingUser.full_name, phone: editingUser.phone, grade: editingUser.grade, grade_level: GRADE_LEVELS[editingUser.grade] },
      { onSuccess: () => setEditOpen(false) }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteUser.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteUser.mutate({ email: inviteEmail.trim(), grade: inviteGrade }, { onSuccess: () => { setInviteOpen(false); setInviteEmail(''); setInviteGrade('AUD'); } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un utilisateur..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={filterGrade} onValueChange={setFilterGrade}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les grades</SelectItem>
            {GRADES.map((g) => <SelectItem key={g} value={g}>{g} — {GRADE_LABELS[g]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="online">En ligne</SelectItem>
            <SelectItem value="offline">Hors ligne</SelectItem>
          </SelectContent>
        </Select>
        <ExportMenu data={filtered.map((u: any) => ({ nom: u.full_name ?? '', email: u.email ?? '', grade: u.grade ?? '', statut: u.is_online ? 'En ligne' : 'Hors ligne' }))} filename="utilisateurs" columns={[{ key: 'nom', label: 'Nom' }, { key: 'email', label: 'Email' }, { key: 'grade', label: 'Grade' }, { key: 'statut', label: 'Statut' }]} title="Liste des utilisateurs" />
        <Button size="sm" variant="default" onClick={() => setInviteOpen(true)}><UserPlus className="h-4 w-4 mr-1" /> Inviter</Button>
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
                <TableHead className="w-24">Actions</TableHead>
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
                          <Avatar className="h-7 w-7"><AvatarImage src={u.avatar_url} /><AvatarFallback className="text-xs">{u.full_name?.charAt(0)?.toUpperCase()}</AvatarFallback></Avatar>
                          {u.is_online && (<span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />)}
                        </div>
                        <span className="text-sm font-medium">{u.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{u.grade || '—'}</Badge></TableCell>
                    <TableCell><Badge variant={u.is_online ? 'default' : 'secondary'} className="text-[10px]">{u.is_online ? 'En ligne' : 'Hors ligne'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenEdit(u)} title="Modifier">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {u.id !== currentUserId && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: u.id, name: u.full_name })} title="Supprimer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Modifier l'utilisateur</DialogTitle></DialogHeader>
          <div className="px-5 py-4 space-y-3 dialog-form-bg">
            <div>
              <Label>Nom complet</Label>
              <Input value={editingUser?.full_name ?? ''} onChange={(e) => setEditingUser((prev) => prev ? { ...prev, full_name: e.target.value } : null)} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={editingUser?.phone ?? ''} onChange={(e) => setEditingUser((prev) => prev ? { ...prev, phone: e.target.value } : null)} placeholder="+225 XX XX XX XX" />
            </div>
            <div>
              <Label>Grade</Label>
              <Select value={editingUser?.grade || 'AUD'} onValueChange={(v) => setEditingUser((prev) => prev ? { ...prev, grade: v as Grade } : null)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g} — {GRADE_LABELS[g]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-amber-300/40 dialog-footer-bg flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button size="sm" className="h-9 px-5" onClick={handleSaveEdit} disabled={updateUser.isPending || !editingUser?.full_name?.trim()}>
              {updateUser.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deleteTarget?.name}</strong> ? Cette action est irréversible et supprimera toutes les données associées à cet utilisateur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteUser.isPending}>
              {deleteUser.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Inviter un collaborateur</DialogTitle></DialogHeader>
          <div className="px-5 py-4 space-y-3 overflow-y-auto max-h-[65vh] dialog-form-bg">
            <div><Label>Email</Label><Input type="email" placeholder="nom@cabinet.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
            <div><Label>Grade</Label>
              <Select value={inviteGrade} onValueChange={(v) => setInviteGrade(v as Grade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GRADES.map((g) => (<SelectItem key={g} value={g}>{g} — {GRADE_LABELS[g]}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-amber-300/40 dialog-footer-bg flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4" onClick={() => setInviteOpen(false)}>Annuler</Button>
            <Button size="sm" className="h-9 px-5" onClick={handleInvite} disabled={inviteUser.isPending || !inviteEmail.trim()}>
              {inviteUser.isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
