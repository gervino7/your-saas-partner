import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/authStore';
import { useMissions, type MissionFilters } from '@/hooks/useMissions';
import MissionCard from '@/components/missions/MissionCard';
import MissionsTable from '@/components/missions/MissionsTable';
import MissionFiltersBar from '@/components/missions/MissionFilters';
import MissionFormDialog from '@/components/missions/MissionFormDialog';
import EmptyState from '@/components/common/EmptyState';
import { Target } from 'lucide-react';

const PAGE_SIZE = 12;

const MissionsPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const [filters, setFilters] = useState<MissionFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(0);

  const { data: missions = [], isLoading } = useMissions(filters);

  const canCreate = profile?.grade_level != null && profile.grade_level <= 3;

  const paginatedMissions = missions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(missions.length / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Missions</h1>
        {canCreate && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle mission
          </Button>
        )}
      </div>

      <MissionFiltersBar
        filters={filters}
        onFiltersChange={(f) => { setFilters(f); setPage(0); }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : missions.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aucune mission"
          description="Créez votre première mission pour commencer à organiser vos projets."
          actionLabel={canCreate ? 'Nouvelle mission' : undefined}
          onAction={canCreate ? () => setFormOpen(true) : undefined}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedMissions.map((m: any) => (
            <MissionCard key={m.id} mission={m} />
          ))}
        </div>
      ) : (
        <MissionsTable missions={paginatedMissions} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} sur {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            Suivant
          </Button>
        </div>
      )}

      <MissionFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
};

export default MissionsPage;
