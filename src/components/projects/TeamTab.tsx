import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users } from 'lucide-react';
import { useProjectMembers, useAddProjectMember } from '@/hooks/useProject';
import { useMissionMembers } from '@/hooks/useMissions';
import { GRADE_LABELS } from '@/types/database';
import type { Grade } from '@/types/database';
import EmptyState from '@/components/common/EmptyState';

const roleLabels: Record<string, string> = {
  lead: 'Chef de projet',
  sub_lead: 'Sous-chef',
  member: 'Membre',
};

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

export default function TeamTab({ projectId, missionId }: { projectId: string; missionId: string | null }) {
  const { data: members = [], isLoading } = useProjectMembers(projectId);
  const { data: missionMembers = [] } = useMissionMembers(missionId ?? undefined);
  const addMember = useAddProjectMember();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');

  const existingIds = new Set(members.map((m: any) => m.user?.id));
  const availableMembers = missionMembers.filter((m: any) => !existingIds.has(m.user?.id));

  const handleAdd = () => {
    if (!selectedUser) return;
    addMember.mutate(
      { projectId, userId: selectedUser, role: selectedRole },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedUser('');
          setSelectedRole('member');
        },
      }
    );
  };

  // Group by sub_team
  const teams: Record<string, any[]> = {};
  members.forEach((m: any) => {
    const team = m.sub_team || 'Équipe principale';
    (teams[team] ??= []).push(m);
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement...</p>;

  if (members.length === 0) {
    return (
      <>
        <EmptyState
          icon={Users}
          title="Aucun membre"
          description="Ajoutez des membres de la mission à ce projet."
          actionLabel="Ajouter un membre"
          onAction={() => setDialogOpen(true)}
        />
        <AddMemberDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          availableMembers={availableMembers}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
          onAdd={handleAdd}
          isPending={addMember.isPending}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold font-display">Équipe ({members.length})</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter un membre
        </Button>
      </div>

      {Object.entries(teams).map(([teamName, teamMembers]) => (
        <div key={teamName} className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">{teamName}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamMembers.map((m: any) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={m.user?.avatar_url ?? ''} />
                    <AvatarFallback>{initials(m.user?.full_name ?? '')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.user?.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">
                        {GRADE_LABELS[m.user?.grade as Grade] ?? m.user?.grade ?? '—'}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {roleLabels[m.role] ?? m.role}
                      </Badge>
                    </div>
                  </div>
                  <div className={`h-2 w-2 rounded-full ${m.user?.is_online ? 'bg-success' : 'bg-muted-foreground/30'}`} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <AddMemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        availableMembers={availableMembers}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}
        selectedRole={selectedRole}
        onSelectRole={setSelectedRole}
        onAdd={handleAdd}
        isPending={addMember.isPending}
      />
    </div>
  );
}

function AddMemberDialog({ open, onOpenChange, availableMembers, selectedUser, onSelectUser, selectedRole, onSelectRole, onAdd, isPending }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Ajouter un membre</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={selectedUser} onValueChange={onSelectUser}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un membre" /></SelectTrigger>
            <SelectContent>
              {availableMembers.map((m: any) => (
                <SelectItem key={m.user?.id} value={m.user?.id}>{m.user?.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={onSelectRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Membre</SelectItem>
              <SelectItem value="sub_lead">Sous-chef</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={onAdd} disabled={isPending || !selectedUser}>
              {isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
