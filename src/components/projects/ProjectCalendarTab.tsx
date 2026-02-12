import { CalendarDays } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function ProjectCalendarTab({ projectId }: { projectId: string }) {
  return (
    <EmptyState
      icon={CalendarDays}
      title="Calendrier du projet"
      description="Le calendrier avec tâches, réunions et jalons sera disponible prochainement."
    />
  );
}
