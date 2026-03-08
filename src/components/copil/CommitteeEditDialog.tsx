import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUpdateCommittee, useMissionMembers } from '@/hooks/useCommittees';

interface Props {
  committee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommitteeEditDialog = ({ committee, open, onOpenChange }: Props) => {
  const [form, setForm] = useState({ name: '', type: 'copil', meeting_frequency: 'monthly', secretary_id: '', description: '' });
  const update = useUpdateCommittee();
  const { data: members } = useMissionMembers(committee?.mission_id);

  useEffect(() => {
    if (committee) {
      setForm({
        name: committee.name || '',
        type: committee.type || 'copil',
        meeting_frequency: committee.meeting_frequency || 'monthly',
        secretary_id: committee.secretary_id || '',
        description: committee.description || '',
      });
    }
  }, [committee]);

  const handleSubmit = async () => {
    await update.mutateAsync({
      id: committee.id,
      name: form.name,
      type: form.type,
      meeting_frequency: form.meeting_frequency,
      secretary_id: form.secretary_id || null,
      description: form.description || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le comité</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3 dialog-form-bg">
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
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
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
        </div>
        <div className="px-5 py-3 border-t border-amber-300/40 dialog-footer-bg flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!form.name || update.isPending}>
            {update.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommitteeEditDialog;
