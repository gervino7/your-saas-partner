import { Target } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

const MissionsPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold font-display">Missions</h1>
    <EmptyState
      icon={Target}
      title="Aucune mission"
      description="Créez votre première mission pour commencer à organiser vos projets."
      actionLabel="Nouvelle mission"
      onAction={() => {}}
    />
  </div>
);

export default MissionsPage;
