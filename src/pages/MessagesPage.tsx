import { MessageSquare } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

const MessagesPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold font-display">Messagerie</h1>
    <EmptyState
      icon={MessageSquare}
      title="Aucune conversation"
      description="Démarrez une conversation avec un membre de votre équipe."
      actionLabel="Nouvelle conversation"
      onAction={() => {}}
    />
  </div>
);

export default MessagesPage;
