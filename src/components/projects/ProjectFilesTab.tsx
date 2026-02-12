import { FileArchive } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function ProjectFilesTab({ projectId }: { projectId: string }) {
  return (
    <EmptyState
      icon={FileArchive}
      title="Gestion documentaire"
      description="La gestion documentaire (GED) avec dossiers, upload et recherche sera disponible prochainement."
    />
  );
}
