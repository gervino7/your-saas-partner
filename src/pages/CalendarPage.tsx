import { useState } from 'react';
import { toast } from 'sonner';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import MeetingFormDialog from '@/components/calendar/MeetingFormDialog';
import MeetingDetailDialog from '@/components/calendar/MeetingDetailDialog';
import { useCalendar, type CalendarEvent } from '@/hooks/useCalendar';
import Loading from '@/components/common/Loading';

const CalendarPage = () => {
  const { events, orgMembers, createMeeting, updateMeeting, respondToMeeting, deleteMeeting, isLoading } = useCalendar();
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  const handleDateClick = (date: Date) => {
    setDefaultDate(date);
    setShowForm(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleCreateMeeting = async (data: any) => {
    try {
      await createMeeting.mutateAsync(data);
      toast.success('Réunion créée avec succès');
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    }
  };

  const handleRespond = async (meetingId: string, status: string) => {
    try {
      await respondToMeeting.mutateAsync({ meetingId, status });
      toast.success(status === 'accepted' ? 'Invitation acceptée' : 'Invitation déclinée');
    } catch {
      toast.error('Erreur lors de la réponse');
    }
  };

  const handleSaveSummary = async (meetingId: string, summary: string) => {
    try {
      await updateMeeting.mutateAsync({ id: meetingId, summary });
      toast.success('Résumé enregistré');
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (meetingId: string) => {
    try {
      await deleteMeeting.mutateAsync(meetingId);
      toast.success('Réunion supprimée');
      setSelectedEvent(null);
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Calendrier</h1>
        <p className="text-sm text-muted-foreground">Réunions, échéances et jalons</p>
      </div>

      <CalendarGrid
        events={events}
        onDateClick={handleDateClick}
        onEventClick={handleEventClick}
        onCreateClick={() => { setDefaultDate(undefined); setShowForm(true); }}
      />

      <MeetingFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleCreateMeeting}
        members={orgMembers}
        defaultDate={defaultDate}
        isSubmitting={createMeeting.isPending}
      />

      <MeetingDetailDialog
        open={!!selectedEvent}
        onOpenChange={(o) => { if (!o) setSelectedEvent(null); }}
        event={selectedEvent}
        onRespond={handleRespond}
        onSaveSummary={handleSaveSummary}
        onDelete={handleDelete}
        members={orgMembers}
      />
    </div>
  );
};

export default CalendarPage;
