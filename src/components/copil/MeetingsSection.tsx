import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarDays, ChevronDown, MapPin, Plus, Save, Video } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCommitteeMeetings, useCreateMeeting, useUpdateMeeting } from '@/hooks/useCommittees';
import type { Json } from '@/integrations/supabase/types';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programmée', in_progress: 'En cours', completed: 'Terminée', cancelled: 'Annulée',
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-info/15 text-info', in_progress: 'bg-warning/15 text-warning',
  completed: 'bg-success/15 text-success', cancelled: 'bg-destructive/15 text-destructive',
};

interface Decision { text: string; responsible: string; deadline: string; status: string; }

interface Props {
  committeeId: string;
  canManage: boolean;
}

/* ── Decisions editor with LOCAL state ── */
function DecisionsEditor({ meetingId, committeeId, initialDecisions, canManage }: {
  meetingId: string; committeeId: string; initialDecisions: Decision[]; canManage: boolean;
}) {
  const updateMeeting = useUpdateMeeting();
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions);
  const [dirty, setDirty] = useState(false);

  // Sync from server when initialDecisions change and there are no unsaved edits
  const initialRef = useRef(initialDecisions);
  useEffect(() => {
    if (JSON.stringify(initialDecisions) !== JSON.stringify(initialRef.current)) {
      initialRef.current = initialDecisions;
      if (!dirty) setDecisions(initialDecisions);
    }
  }, [initialDecisions, dirty]);

  const handleChange = (idx: number, field: string, value: string) => {
    setDecisions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
    setDirty(true);
  };

  const handleAdd = () => {
    setDecisions(prev => [...prev, { text: '', responsible: '', deadline: '', status: 'todo' }]);
    setDirty(true);
  };

  const handleSave = () => {
    updateMeeting.mutate(
      { id: meetingId, committee_id: committeeId, decisions: decisions as unknown as Json },
      { onSuccess: () => setDirty(false) }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Décisions ({decisions.length})</p>
        <div className="flex gap-2">
          {canManage && dirty && (
            <Button size="sm" variant="default" onClick={handleSave} disabled={updateMeeting.isPending}>
              <Save className="h-3 w-3 mr-1" />Enregistrer
            </Button>
          )}
          {canManage && (
            <Button size="sm" variant="outline" onClick={handleAdd}>
              <Plus className="h-3 w-3 mr-1" />Décision
            </Button>
          )}
        </div>
      </div>
      {decisions.map((d, i) => (
        <div key={i} className="border rounded p-3 mb-2 space-y-2">
          <Input
            placeholder="Décision..."
            value={d.text}
            onChange={(e) => handleChange(i, 'text', e.target.value)}
            disabled={!canManage}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Responsable" value={d.responsible} onChange={(e) => handleChange(i, 'responsible', e.target.value)} disabled={!canManage} />
            <Input type="date" value={d.deadline} onChange={(e) => handleChange(i, 'deadline', e.target.value)} disabled={!canManage} />
            <Select value={d.status} onValueChange={(v) => handleChange(i, 'status', v)} disabled={!canManage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">À faire</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="done">Réalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  );
}

const MeetingsSection = ({ committeeId, canManage }: Props) => {
  const { data: meetings } = useCommitteeMeetings(committeeId);
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', agenda: '', scheduled_at: '', duration_minutes: '60', location: '', meeting_link: '',
  });

  const handleCreate = async () => {
    await createMeeting.mutateAsync({
      committee_id: committeeId, title: form.title, agenda: form.agenda,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: parseInt(form.duration_minutes) || 60,
      location: form.location, meeting_link: form.meeting_link,
    });
    setOpen(false);
    setForm({ title: '', agenda: '', scheduled_at: '', duration_minutes: '60', location: '', meeting_link: '' });
  };

  const handleStatusChange = (meetingId: string, status: string) => {
    updateMeeting.mutate({ id: meetingId, committee_id: committeeId, status });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Réunions</CardTitle>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Programmer</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Programmer une réunion</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Titre</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
                <div><Label>Ordre du jour</Label><Textarea value={form.agenda} onChange={(e) => setForm((p) => ({ ...p, agenda: e.target.value }))} rows={4} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Date et heure</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))} /></div>
                  <div><Label>Durée (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm((p) => ({ ...p, duration_minutes: e.target.value }))} /></div>
                </div>
                <div><Label>Lieu</Label><Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Salle de réunion ou adresse" /></div>
                <div><Label>Lien visio</Label><Input value={form.meeting_link} onChange={(e) => setForm((p) => ({ ...p, meeting_link: e.target.value }))} placeholder="https://meet.jit.si/..." /></div>
                <Button onClick={handleCreate} disabled={!form.title || !form.scheduled_at || createMeeting.isPending} className="w-full">
                  Programmer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {meetings?.map((m: any) => {
          const decisions: Decision[] = (m.decisions as Decision[]) || [];
          return (
            <Collapsible key={m.id}>
              <div className="border rounded-lg p-4">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-medium">{m.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(m.scheduled_at), 'PPP à HH:mm', { locale: fr })}
                          {m.duration_minutes && ` · ${m.duration_minutes} min`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[m.status ?? 'scheduled']}>{STATUS_LABELS[m.status ?? 'scheduled']}</Badge>
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  {m.agenda && (
                    <div>
                      <p className="text-sm font-medium mb-1">Ordre du jour</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.agenda}</p>
                    </div>
                  )}
                  {(m.location || m.meeting_link) && (
                    <div className="flex gap-4 text-sm">
                      {m.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>}
                      {m.meeting_link && (
                        <a href={m.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                          <Video className="h-3 w-3" />Rejoindre
                        </a>
                      )}
                    </div>
                  )}

                  {/* Decisions - uses local state, saves only on button click */}
                  {m.status === 'completed' && (
                    <DecisionsEditor
                      meetingId={m.id}
                      committeeId={committeeId}
                      initialDecisions={decisions}
                      canManage={canManage}
                    />
                  )}

                  {/* Status change */}
                  {canManage && (
                    <div className="flex gap-2 pt-2 border-t">
                      {m.status === 'scheduled' && <Button size="sm" variant="outline" onClick={() => handleStatusChange(m.id, 'in_progress')}>Démarrer</Button>}
                      {m.status === 'in_progress' && <Button size="sm" variant="outline" onClick={() => handleStatusChange(m.id, 'completed')}>Terminer</Button>}
                      {(m.status === 'scheduled' || m.status === 'in_progress') && (
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(m.id, 'cancelled')}>Annuler</Button>
                      )}
                    </div>
                  )}
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
        {(!meetings || meetings.length === 0) && (
          <p className="text-center text-muted-foreground py-8">Aucune réunion programmée</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MeetingsSection;
