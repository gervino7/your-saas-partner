import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { useCommitteeMembers, useAddCommitteeMember, useRemoveCommitteeMember, useOrgMembers } from '@/hooks/useCommittees';

const ROLES = [
  { value: 'president', label: 'Président' },
  { value: 'vice_president', label: 'Vice-Président' },
  { value: 'secretary', label: 'Secrétaire' },
  { value: 'member', label: 'Membre' },
];

interface Props {
  committeeId: string;
  canManage: boolean;
}

const MembersList = ({ committeeId, canManage }: Props) => {
  const { data: members, isLoading } = useCommitteeMembers(committeeId);
  const { data: orgMembers } = useOrgMembers();
  const addMember = useAddCommitteeMember();
  const removeMember = useRemoveCommitteeMember();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('internal');
  const [internalForm, setInternalForm] = useState({ user_id: '', role: 'member' });
  const [externalForm, setExternalForm] = useState({ name: '', email: '', phone: '', role: 'member' });

  const handleAddInternal = async () => {
    await addMember.mutateAsync({ committee_id: committeeId, user_id: internalForm.user_id, role: internalForm.role, is_external: false });
    setInternalForm({ user_id: '', role: 'member' });
    setOpen(false);
  };

  const handleAddExternal = async () => {
    await addMember.mutateAsync({
      committee_id: committeeId, is_external: true, role: externalForm.role,
      external_name: externalForm.name, external_email: externalForm.email, external_phone: externalForm.phone,
    });
    setExternalForm({ name: '', email: '', phone: '', role: 'member' });
    setOpen(false);
  };

  const existingUserIds = new Set(members?.filter((m: any) => !m.is_external).map((m: any) => m.user_id));
  const availableMembers = orgMembers?.filter((m: any) => !existingUserIds.has(m.id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Membres du comité</CardTitle>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-2" /> Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter un membre</DialogTitle></DialogHeader>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="internal" className="flex-1">Interne</TabsTrigger>
                  <TabsTrigger value="external" className="flex-1">Externe</TabsTrigger>
                </TabsList>
                <TabsContent value="internal" className="space-y-4 mt-4">
                  <div>
                    <Label>Membre</Label>
                    <Select value={internalForm.user_id} onValueChange={(v) => setInternalForm((p) => ({ ...p, user_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        {availableMembers?.map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.grade})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rôle</Label>
                    <Select value={internalForm.role} onValueChange={(v) => setInternalForm((p) => ({ ...p, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddInternal} disabled={!internalForm.user_id || addMember.isPending} className="w-full">Ajouter</Button>
                </TabsContent>
                <TabsContent value="external" className="space-y-4 mt-4">
                  <div><Label>Nom</Label><Input value={externalForm.name} onChange={(e) => setExternalForm((p) => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label>Email</Label><Input type="email" value={externalForm.email} onChange={(e) => setExternalForm((p) => ({ ...p, email: e.target.value }))} /></div>
                  <div><Label>Téléphone</Label><Input value={externalForm.phone} onChange={(e) => setExternalForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                  <div>
                    <Label>Rôle</Label>
                    <Select value={externalForm.role} onValueChange={(v) => setExternalForm((p) => ({ ...p, role: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddExternal} disabled={!externalForm.name || !externalForm.email || addMember.isPending} className="w-full">Ajouter</Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Type</TableHead>
              {canManage && <TableHead className="w-[60px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members?.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {(m.is_external ? m.external_name : m.profiles?.full_name)?.charAt(0) ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  {m.is_external ? m.external_name : m.profiles?.full_name}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {m.is_external ? m.external_email : m.profiles?.email}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ROLES.find((r) => r.value === m.role)?.label ?? m.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={m.is_external ? 'secondary' : 'default'} className="text-xs">
                    {m.is_external ? 'Externe' : 'Interne'}
                  </Badge>
                </TableCell>
                {canManage && (
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeMember.mutate({ id: m.id, committeeId })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(!members || members.length === 0) && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun membre</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default MembersList;
