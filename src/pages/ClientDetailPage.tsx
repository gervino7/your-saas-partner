import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClient } from '@/hooks/useCRM';
import Loading from '@/components/common/Loading';
import EmptyState from '@/components/common/EmptyState';
import ClientInfoTab from '@/components/crm/ClientInfoTab';
import ClientContactsTab from '@/components/crm/ClientContactsTab';
import ClientMissionsTab from '@/components/crm/ClientMissionsTab';
import ClientDocumentsTab from '@/components/crm/ClientDocumentsTab';
import ClientSatisfactionTab from '@/components/crm/ClientSatisfactionTab';
import ClientHistoryTab from '@/components/crm/ClientHistoryTab';

const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);

  if (isLoading) return <Loading />;
  if (!client) return <EmptyState icon={Building2} title="Client introuvable" description="Ce client n'existe pas." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/clients')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-display">{client.name}</h1>
          <p className="text-muted-foreground">{client.industry ? `${client.industry} — ` : ''}{client.city || ''} {client.country || ''}</p>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="missions">Missions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-4"><ClientInfoTab client={client} /></TabsContent>
        <TabsContent value="contacts" className="mt-4"><ClientContactsTab clientId={client.id} /></TabsContent>
        <TabsContent value="missions" className="mt-4"><ClientMissionsTab clientId={client.id} /></TabsContent>
        <TabsContent value="documents" className="mt-4"><ClientDocumentsTab clientId={client.id} /></TabsContent>
        <TabsContent value="satisfaction" className="mt-4"><ClientSatisfactionTab clientId={client.id} /></TabsContent>
        <TabsContent value="history" className="mt-4"><ClientHistoryTab clientId={client.id} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientDetailPage;
