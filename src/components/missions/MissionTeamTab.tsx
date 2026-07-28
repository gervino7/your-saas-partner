import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserPlus, MoreVertical, UserMinus } from 'lucide-react';
import { useMissionMembers, useOrganizationUsers, useAddMissionMember, useMission } from '@/hooks/useMissions';
import { useAuthStore } from '@/stores/authStore';
import { GRADE_LABELS, GRADE_LEVELS } from '@/types/database';
import type { Grade } from '@/types/database';
import RemoveMemberDialog from './RemoveMemberDialog';

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

const roleLabels: Record<string, string> = {
  director: 'Directeur de Mission', chief: 'Chef de Mission', supervisor: 'Superviseur', project_lead: 'Chef de Projet', member: 'Membre',
};

export default function MissionTeamTab({ missionId, canManage }: { missionId: string; canManage: boolean }) {
  const { data: allMembers = [], isLoading } = useMissionMembers(missionId);
  const { data: orgUsers = [] } = useOrganizationUsers();
  const { data: mission } = useMission(missionId);
  const currentProfile = useAuthStore((s) => s.profile);
  const viewerLevel = currentProfile?.grade_level ?? 8;
  const members = viewerLevel <= 2
    ? allMembers
    : (allMembers as any[]).filter((m: any) => {
        const lvl = m.user?.grade ? GRADE_LEVELS[m.user.grade as Grade] ?? 8 : 8;
        return lvl >= viewerLevel || m.user_id === currentProfile?.id;
      });
  const addMember = useAddMissionMember();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [removeTarget, setRemoveTarget] = useState<{ user_id: string; name: string } | null>(null);

  const canRemove = (m: any) =>
    canManage &&
    viewerLevel <= 3 &&
    m.user_id !== currentProfile?.id &&
    m.user_id !== (mission as any)?.director_id &&
    m.user_id !== (mission as any)?.chief_id;

  const memberIds = new Set(members.map((m: any) => m.user_id));
  const availableUsers = orgUsers.filter((u: any) => !memberIds.has(u.id));

  const handleAdd = async () => {
    if (!selectedUser) return;
    await addMember.mutateAsync({ missionId, userId: selectedUser, role: selectedRole });
    setAddOpen(false); setSelectedUser(''); setSelectedRole('member');
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-display">Équipe ({members.length})</h3>
        {canManage && (<Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4 mr-2" /> Ajouter un membre</Button>)}
      </div>

      {isLoading ? (<p className="text-sm text-muted-foreground">Chargement...</p>) : members.length === 0 ? (<p className="text-sm text-muted-foreground">Aucun membre dans cette mission.</p>) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10"><AvatarImage src={m.user?.avatar_url ?? ''} /><AvatarFallback>{initials(m.user?.full_name ?? '')}</AvatarFallback></Avatar>
                  {m.user?.is_online && (<div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-background" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-xs">{roleLabels[m.role] ?? m.role}</Badge>
                  {m.user?.grade && (<span className="text-xs text-muted-foreground">{GRADE_LABELS[m.user.grade as Grade] ?? m.user.grade}</span>)}
                </div>
                {canRemove(m) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setRemoveTarget({ user_id: m.user_id, name: m.user?.full_name ?? 'ce collaborateur' })}
                      >
                        <UserMinus className="mr-2 h-4 w-4" /> Retirer de la mission
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RemoveMemberDialog
        open={!!removeTarget}
        onOpenChange={(v) => { if (!v) setRemoveTarget(null); }}
        missionId={missionId}
        member={removeTarget}
      />


      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ajouter un membre</DialogTitle></DialogHeader>
          <div className="px-5 py-4 space-y-3 dialog-form-bg">
            <div><Label>Utilisateur</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
                <SelectContent>{availableUsers.map((u: any) => (<SelectItem key={u.id} value={u.id}>{u.full_name} {u.grade ? `(${u.grade})` : ''}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Rôle</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(roleLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-amber-300/40 dialog-footer-bg flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button size="sm" className="h-9 px-5" onClick={handleAdd} disabled={!selectedUser || addMember.isPending}>{addMember.isPending ? 'Ajout...' : 'Ajouter'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
