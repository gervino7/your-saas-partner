import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Video, Phone, MapPin, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface MeetingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  members: { id: string; full_name: string; email: string; grade: string | null; avatar_url: string | null }[];
  defaultDate?: Date;
  isSubmitting?: boolean;
}

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
];

export default function MeetingFormDialog({ open, onOpenChange, onSubmit, members, defaultDate, isSubmitting }: MeetingFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : '');
  const [duration, setDuration] = useState('60');
  const [type, setType] = useState('video');
  const [location, setLocation] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState('');

  const filteredMembers = members.filter(
    (m) =>
      !selectedParticipants.includes(m.id) &&
      (m.full_name.toLowerCase().includes(participantSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(participantSearch.toLowerCase()))
  );

  const handleSubmit = () => {
    if (!title.trim() || !date) {
      toast.error('Veuillez remplir le titre et la date');
      return;
    }
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      scheduled_at: new Date(date).toISOString(),
      duration_minutes: parseInt(duration),
      type,
      location: type === 'in_person' ? location : undefined,
      recurrence,
      participants: selectedParticipants,
    });
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate('');
    setDuration('60');
    setType('video');
    setLocation('');
    setRecurrence('none');
    setSelectedParticipants([]);
    setParticipantSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle réunion</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Réunion d'équipe..." />
          </div>

          <div>
            <Label>Description / Ordre du jour</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Points à aborder..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date et heure *</Label>
              <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Durée</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Type</Label>
            <div className="flex gap-2 mt-1.5">
              {[
                { value: 'video', label: 'Vidéo', icon: Video },
                { value: 'audio', label: 'Audio', icon: Phone },
                { value: 'in_person', label: 'En personne', icon: MapPin },
              ].map((t) => (
                <Button
                  key={t.value}
                  variant={type === t.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setType(t.value)}
                  className="flex-1"
                >
                  <t.icon className="h-3.5 w-3.5 mr-1.5" />
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          {type === 'in_person' && (
            <div>
              <Label>Lieu</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Salle de conférence..." />
            </div>
          )}

          {type !== 'in_person' && (
            <p className="text-xs text-muted-foreground">
              Un lien Jitsi Meet sera généré automatiquement.
            </p>
          )}

          <div>
            <Label>Récurrence</Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuelle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Participants ({selectedParticipants.length})</Label>
            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                {selectedParticipants.map((id) => {
                  const member = members.find((m) => m.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      {member?.full_name || 'Inconnu'}
                      <button onClick={() => toggleParticipant(id)} className="ml-0.5 rounded-full hover:bg-muted p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
            <Input
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              placeholder="Rechercher un membre..."
              className="mb-2"
            />
            <ScrollArea className="h-32 border rounded-md">
              <div className="p-2 space-y-1">
                {filteredMembers.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedParticipants.includes(m.id)}
                      onCheckedChange={() => toggleParticipant(m.id)}
                    />
                    <span className="flex-1">{m.full_name}</span>
                    {m.grade && <span className="text-xs text-muted-foreground">{m.grade}</span>}
                  </label>
                ))}
                {filteredMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucun membre trouvé</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Création...' : 'Créer la réunion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
