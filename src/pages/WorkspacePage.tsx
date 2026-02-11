import { HardDrive } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

const WorkspacePage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold font-display">Bureau personnel</h1>
    <EmptyState
      icon={HardDrive}
      title="Espace vide"
      description="Votre bureau personnel pour stocker et synchroniser vos fichiers."
    />
  </div>
);

export default WorkspacePage;
