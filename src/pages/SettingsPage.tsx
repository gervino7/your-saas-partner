import AdminSettings from '@/components/admin/AdminSettings';
import DataSaverSettings from '@/components/settings/DataSaverSettings';
import AutomationSettings from '@/components/settings/AutomationSettings';
import SubscriptionSection from '@/components/settings/SubscriptionSection';
import ObligationTypesSettings from '@/components/obligations/ObligationTypesSettings';
import { useAuthStore } from '@/stores/authStore';
import EmptyState from '@/components/common/EmptyState';
import { Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SettingsPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;

  if (gradeLevel > 2) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold ">Paramètres</h1>
        <DataSaverSettings />
        <EmptyState icon={Shield} title="Accès restreint" description="Les paramètres d'administration sont réservés aux administrateurs." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold ">Paramètres</h1>
        <p className="text-muted-foreground">Configuration de votre organisation.</p>
      </div>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
        </TabsList>
        <TabsContent value="general" className="space-y-6 mt-4">
          <SubscriptionSection />
          <DataSaverSettings />
          <AutomationSettings />
          <AdminSettings />
        </TabsContent>
        <TabsContent value="obligations" className="mt-4">
          <ObligationTypesSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
