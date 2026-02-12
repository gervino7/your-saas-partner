import { Settings } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function ProjectSettingsTab({ projectId }: { projectId: string }) {
  return (
    <EmptyState
      icon={Settings}
      title="Paramètres du projet"
      description="Les paramètres avancés du projet seront disponibles prochainement."
    />
  );
}
