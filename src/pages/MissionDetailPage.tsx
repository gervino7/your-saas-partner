import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { useMission, useUpdateMission } from '@/hooks/useMissions';
import { useAuthStore } from '@/stores/authStore';
import { MISSION_STATUS_LABELS } from '@/types/database';
import type { MissionStatus } from '@/types/database';
import MissionStatusBadge from '@/components/missions/MissionStatusBadge';
import PriorityBadge from '@/components/missions/PriorityBadge';
import MissionOverviewTab from '@/components/missions/MissionOverviewTab';
import MissionProjectsTab from '@/components/missions/MissionProjectsTab';
import MissionTeamTab from '@/components/missions/MissionTeamTab';
import MissionBudgetTab from '@/components/missions/MissionBudgetTab';
import MissionSettingsTab from '@/components/missions/MissionSettingsTab';
import EmptyState from '@/components/common/EmptyState';
import { FileText, Calendar, Shield } from 'lucide-react';

const MissionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const { data: mission, isLoading, error } = useMission(id);
  const updateMission = useUpdateMission();

  const gradeLevel = profile?.grade_level ?? 8;
  const canManage = gradeLevel <= 3;

  const handleStatusChange = async (newStatus: string) => {
    if (mission) {
      await updateMission.mutateAsync({ id: mission.id, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/missions')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
        <p className="text-destructive">Mission non trouvée.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/missions')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-display truncate">{mission.name}</h1>
            <span className="text-sm font-mono text-muted-foreground">{mission.code}</span>
            <PriorityBadge priority={mission.priority} />
          </div>
        </div>
        {canManage && (
          <Select value={mission.status ?? 'draft'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MISSION_STATUS_LABELS).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!canManage && <MissionStatusBadge status={mission.status ?? 'draft'} />}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="projects">Projets</TabsTrigger>
          <TabsTrigger value="team">Équipe</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="copil">COPIL</TabsTrigger>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          {canManage && <TabsTrigger value="settings">Paramètres</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <MissionOverviewTab mission={mission} />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <MissionProjectsTab missionId={mission.id} canCreate={canManage} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <MissionTeamTab missionId={mission.id} canManage={canManage} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <EmptyState
            icon={FileText}
            title="Documents"
            description="La gestion documentaire sera implémentée dans le module GED."
          />
        </TabsContent>

        <TabsContent value="copil" className="mt-6">
          <EmptyState
            icon={Shield}
            title="COPIL"
            description="Le module de gouvernance COPIL sera implémenté prochainement."
          />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <EmptyState
            icon={Calendar}
            title="Calendrier"
            description="Le calendrier de la mission sera implémenté prochainement."
          />
        </TabsContent>

        <TabsContent value="budget" className="mt-6">
          <MissionBudgetTab mission={mission} />
        </TabsContent>

        {canManage && (
          <TabsContent value="settings" className="mt-6">
            <MissionSettingsTab mission={mission} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default MissionDetailPage;
