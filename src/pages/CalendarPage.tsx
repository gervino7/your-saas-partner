import { Calendar } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

const CalendarPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold font-display">Calendrier</h1>
    <EmptyState
      icon={Calendar}
      title="Aucun événement"
      description="Vos réunions et échéances apparaîtront ici."
    />
  </div>
);

export default CalendarPage;
