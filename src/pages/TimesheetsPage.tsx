import { Clock } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

const TimesheetsPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold font-display">Feuilles de temps</h1>
    <EmptyState
      icon={Clock}
      title="Aucune feuille de temps"
      description="Saisissez vos heures de travail quotidiennes ici."
      actionLabel="Saisir mes heures"
      onAction={() => {}}
    />
  </div>
);

export default TimesheetsPage;
