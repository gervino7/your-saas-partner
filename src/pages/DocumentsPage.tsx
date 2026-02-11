import { FileText } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

const DocumentsPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold font-display">Documents</h1>
    <EmptyState
      icon={FileText}
      title="Aucun document"
      description="Vos documents de mission apparaîtront ici."
    />
  </div>
);

export default DocumentsPage;
