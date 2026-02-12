import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { useMissionMembers, useOrganizationUsers, useAddMissionMember } from '@/hooks/useMissions';
import { GRADE_LABELS } from '@/types/database';
import type { Grade } from '@/types/database';

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

const roleLabels: Record<string, string> = {
  director: 'Directeur de Mission',
  chief: 'Chef de Mission',
  supervisor: 'Superviseur',
  project_lead: 'Chef de Projet',
  member: 'Membre',
};

export default function MissionTeamTab({ missionId, canManage }: { missionId: string; canManage: boolean }) {
  const { data: members = [], isLoading } = useMissionMembers(missionId);
  const { data: orgUsers = [] } = useOrganizationUsers();
  const addMember = useAddMissionMember();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  const memberIds = new Set(members.map((m: any) => m.user_id));
  const availableUsers = orgUsers.filter((u: any) => !memberIds.has(u.id));

  const handleAdd = async () => {
    if (!selectedUser) return;
    await addMember.mutateAsync({ missionId, userId: selectedUser, role: selectedRole });
    setAddOpen(false);
    setSelectedUser('');
    setSelectedRole('member');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-display">Équipe ({members.length})</h3>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Ajouter un membre
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun membre dans cette mission.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={m.user?.avatar_url ?? ''} />
                    <AvatarFallback>{initials(m.user?.full_name ?? '')}</AvatarFallback>
                  </Avatar>
                  {m.user?.is_online && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="text-xs">
                    {roleLabels[m.role] ?? m.role}
                  </Badge>
                  {m.user?.grade && (
                    <span className="text-xs text-muted-foreground">
                      {GRADE_LABELS[m.user.grade as Grade] ?? m.user.grade}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Utilisateur</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name} {u.grade ? `(${u.grade})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Rôle</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
              <Button onClick={handleAdd} disabled={!selectedUser || addMember.isPending}>
                {addMember.isPending ? 'Ajout...' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
