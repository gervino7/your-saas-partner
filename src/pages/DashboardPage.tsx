import { Target, FolderKanban, CheckSquare, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

const stats = [
  { label: 'Missions actives', value: '0', icon: Target, color: 'text-primary' },
  { label: 'Projets en cours', value: '0', icon: FolderKanban, color: 'text-accent' },
  { label: 'Tâches à faire', value: '0', icon: CheckSquare, color: 'text-warning' },
  { label: 'Équipe', value: '0', icon: Users, color: 'text-success' },
];

const DashboardPage = () => {
  const { profile } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">
          Bonjour, {profile?.full_name || 'Utilisateur'} 👋
        </h1>
        <p className="text-muted-foreground">
          Voici un aperçu de votre espace de travail
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
