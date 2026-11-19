import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useOrganizationUsers } from '@/hooks/useMissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const db = supabase as any;

// Grade is the right criterion here: the tasks insert policy allows project-less tasks for grade levels 1-3.
export default function GeneralTaskDialog() {
  const profile = useAuthStore(s => s.profile);
  const users = useOrganizationUsers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState('none');
  const [pending, setPending] = useState(false);
  if ((profile?.grade_level ?? 99) > 3) return null;

  const create = async () => {
    if (!profile) return;
    setPending(true);
    try {
      const { data, error } = await db.from('tasks').insert({ organization_id: profile.organization_id, project_id: null, title: title.trim(), due_date: due || null, status: 'todo' }).select().single();
      if (error) throw new Error(error.message);
      if (assignee !== 'none') {
        const { error: e2 } = await db.from('task_assignments').insert({ task_id: data.id, user_id: assignee });
        if (e2) throw new Error(`Tâche créée, mais l'affectation a été refusée : ${e2.message}`);
      }
      toast.success(`Tâche générale « ${title.trim()} » créée.`);
      qc.invalidateQueries({ queryKey: ['taches-imputables'] });
      setOpen(false); setTitle(''); setDue(''); setAssignee('none');
    } catch (e) { toast.error((e as Error).message); }
    finally { setPending(false); }
  };

  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Nouvelle tâche générale</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>Nouvelle tâche générale</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5"><Label>Intitulé</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Préparation du séminaire interne" /></div>
        <div className="space-y-1.5"><Label>Échéance (facultative)</Label><Input type="date" className="w-44 tabular-nums" value={due} onChange={e => setDue(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Assigner à (facultatif)</Label>
          <Select value={assignee} onValueChange={setAssignee}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Personne pour l'instant</SelectItem>
              {users.data?.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Annuler</Button>
        <Button onClick={create} disabled={pending || !title.trim()}>Créer la tâche</Button></DialogFooter>
    </DialogContent></Dialog>
  </>;
}
