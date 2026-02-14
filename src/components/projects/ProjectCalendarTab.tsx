import { useState } from 'react';
import { toast } from 'sonner';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import MeetingFormDialog from '@/components/calendar/MeetingFormDialog';
import MeetingDetailDialog from '@/components/calendar/MeetingDetailDialog';
import { useCalendar, type CalendarEvent } from '@/hooks/useCalendar';

export default function ProjectCalendarTab({ projectId }: { projectId: string }) {
  const { events, orgMembers, createMeeting, updateMeeting, respondToMeeting, deleteMeeting } = useCalendar();
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  // Filter events related to this project
  const projectEvents = events.filter(
    (e) => e.metadata?.project_id === projectId || e.metadata?.entityType === 'task'
  );

  const handleCreateMeeting = async (data: any) => {
    try {
      await createMeeting.mutateAsync({ ...data, project_id: projectId });
      toast.success('Réunion créée');
      setShowForm(false);
    } catch {
      toast.error('Erreur lors de la création');
    }
  };

  return (
    <div>
      <CalendarGrid
        events={projectEvents}
        onDateClick={(d) => { setDefaultDate(d); setShowForm(true); }}
        onEventClick={setSelectedEvent}
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
        onRespond={(id, s) => respondToMeeting.mutateAsync({ meetingId: id, status: s })}
        onSaveSummary={(id, s) => updateMeeting.mutateAsync({ id, summary: s })}
        onDelete={(id) => { deleteMeeting.mutateAsync(id); setSelectedEvent(null); }}
        members={orgMembers}
      />
    </div>
  );
}
