import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Video, MapPin, Phone, Clock, CalendarDays, Users, Check, X, ExternalLink, Shield, Flag, Star } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';
import type { CalendarEvent } from '@/hooks/useCalendar';
import { useAuthStore } from '@/stores/authStore';

interface MeetingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onRespond?: (meetingId: string, status: string) => void;
  onSaveSummary?: (meetingId: string, summary: string) => void;
  onDelete?: (meetingId: string) => void;
  members?: { id: string; full_name: string }[];
}

const typeIcons: Record<string, any> = {
  video: Video,
  audio: Phone,
  in_person: MapPin,
};

const eventTypeLabels: Record<string, string> = {
  meeting: 'Réunion',
  copil: 'Comité',
  deadline: 'Échéance',
  milestone: 'Jalon',
};

const eventTypeIcons: Record<string, any> = {
  meeting: Video,
  copil: Shield,
  deadline: Flag,
  milestone: Star,
};

export default function MeetingDetailDialog({ open, onOpenChange, event, onRespond, onSaveSummary, onDelete, members = [] }: MeetingDetailDialogProps) {
  const { user } = useAuthStore();
  const [summary, setSummary] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  if (!event) return null;

  const meta = event.metadata || {};
  const isMeeting = meta.entityType === 'meeting';
  const isOrganizer = isMeeting && meta.organizer_id === user?.id;
  const participants = meta.meeting_participants || [];
  const myParticipation = participants.find((p: any) => p.user_id === user?.id);
  const meetingLink = meta.meeting_link;
  const isPast = event.end < new Date();
  const canJoin = !isPast && differenceInMinutes(event.start, new Date()) <= 15;

  const EventIcon = eventTypeIcons[event.type] || Video;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${event.color}20`, color: event.color }}>
              <EventIcon className="h-5 w-5" />
            </div>
            <div>
              <Badge variant="outline" className="mb-1 text-xs" style={{ borderColor: event.color, color: event.color }}>
                {eventTypeLabels[event.type]}
              </Badge>
              <DialogTitle className="text-base">{event.title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>{format(event.start, "EEEE d MMMM yyyy", { locale: fr })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{format(event.start, 'HH:mm')} — {format(event.end, 'HH:mm')}</span>
          </div>

          {meta.description && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm whitespace-pre-wrap">{meta.description}</p>
              </div>
            </>
          )}

          {isMeeting && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Participants ({participants.length})
                </p>
                <div className="space-y-1.5">
                  {participants.map((p: any) => {
                    const member = members.find((m) => m.id === p.user_id);
                    return (
                      <div key={p.user_id} className="flex items-center justify-between text-sm">
                        <span>{member?.full_name || 'Membre'}</span>
                        <Badge variant={p.status === 'accepted' ? 'default' : p.status === 'declined' ? 'destructive' : 'secondary'} className="text-xs">
                          {p.status === 'accepted' ? 'Accepté' : p.status === 'declined' ? 'Décliné' : 'En attente'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Respond buttons */}
              {myParticipation && !isOrganizer && onRespond && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={myParticipation.status === 'accepted' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => onRespond(meta.id, 'accepted')}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Accepter
                    </Button>
                    <Button
                      size="sm"
                      variant={myParticipation.status === 'declined' ? 'destructive' : 'outline'}
                      className="flex-1"
                      onClick={() => onRespond(meta.id, 'declined')}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Décliner
                    </Button>
                  </div>
                </>
              )}

              {/* Join button */}
              {meetingLink && meta.type !== 'in_person' && (
                <>
                  <Separator />
                  <Button
                    className="w-full"
                    disabled={!canJoin}
                    onClick={() => window.open(meetingLink, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {canJoin ? 'Rejoindre la réunion' : `Disponible 15 min avant`}
                  </Button>
                </>
              )}

              {/* Post-meeting summary */}
              {isPast && isOrganizer && (
                <>
                  <Separator />
                  {!showSummary ? (
                    <Button variant="outline" size="sm" onClick={() => { setSummary(meta.summary || ''); setShowSummary(true); }}>
                      {meta.summary ? 'Modifier le résumé' : 'Ajouter un résumé'}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Label>Résumé / Décisions</Label>
                      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { onSaveSummary?.(meta.id, summary); setShowSummary(false); }}>
                          Enregistrer
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowSummary(false)}>Annuler</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {isOrganizer && onDelete && (
          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={() => { onDelete(meta.id); onOpenChange(false); }}>
              Supprimer
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
