import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Shield } from 'lucide-react';
import { useCreateCommittee, useMissionMembers } from '@/hooks/useCommittees';

interface Props {
  missionId: string;
  canManage: boolean;
}

const CommitteeSetup = ({ missionId, canManage }: Props) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'copil', meeting_frequency: 'monthly', secretary_id: '', description: '' });
  const create = useCreateCommittee();
  const { data: members } = useMissionMembers(missionId);

  const handleSubmit = async () => {
    await create.mutateAsync({
      ...form,
      mission_id: missionId || null,
      secretary_id: form.secretary_id || null,
    });
    setOpen(false);
    setForm({ name: '', type: 'copil', meeting_frequency: 'monthly', secretary_id: '', description: '' });
  };

  if (!canManage) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Créer un comité</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau comité</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="copil">COPIL</SelectItem>
                <SelectItem value="comite_direction">Comité de Direction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nom du comité</Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="COPIL Mission X" />
          </div>
          <div>
            <Label>Fréquence de réunion</Label>
            <Select value={form.meeting_frequency} onValueChange={(v) => setForm((p) => ({ ...p, meeting_frequency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="biweekly">Bimensuelle</SelectItem>
                <SelectItem value="monthly">Mensuelle</SelectItem>
                <SelectItem value="on_demand">À la demande</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Secrétaire</Label>
            <Select value={form.secretary_id} onValueChange={(v) => setForm((p) => ({ ...p, secretary_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                {members?.map((m: any) => (
                  <SelectItem key={m.profiles?.id} value={m.profiles?.id ?? ''}>
                    {m.profiles?.full_name} ({m.profiles?.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <Button onClick={handleSubmit} disabled={!form.name || create.isPending} className="w-full">
            {create.isPending ? 'Création...' : 'Créer le comité'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommitteeSetup;
