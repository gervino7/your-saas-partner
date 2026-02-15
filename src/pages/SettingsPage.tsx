import AdminSettings from '@/components/admin/AdminSettings';
import DataSaverSettings from '@/components/settings/DataSaverSettings';
import { useAuthStore } from '@/stores/authStore';
import EmptyState from '@/components/common/EmptyState';
import { Shield } from 'lucide-react';

const SettingsPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;

  if (gradeLevel > 2) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-display">Paramètres</h1>
        <DataSaverSettings />
        <EmptyState icon={Shield} title="Accès restreint" description="Les paramètres d'administration sont réservés aux administrateurs." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Paramètres</h1>
        <p className="text-muted-foreground">Configuration de votre organisation.</p>
      </div>
      <DataSaverSettings />
      <AdminSettings />
    </div>
  );
};

export default SettingsPage;
