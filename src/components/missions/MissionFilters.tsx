import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MISSION_STATUS_LABELS, MISSION_TYPE_LABELS } from '@/types/database';
import type { MissionFilters as Filters } from '@/hooks/useMissions';
import { useClients } from '@/hooks/useMissions';

interface Props {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  viewMode: 'grid' | 'table';
  onViewModeChange: (mode: 'grid' | 'table') => void;
}

export default function MissionFiltersBar({ filters, onFiltersChange, viewMode, onViewModeChange }: Props) {
  const { data: clients = [] } = useClients();

  const update = (partial: Partial<Filters>) => onFiltersChange({ ...filters, ...partial });

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher une mission..."
          className="pl-9"
          value={filters.search ?? ''}
          onChange={(e) => update({ search: e.target.value })}
        />
      </div>

      <Select value={filters.status ?? 'all'} onValueChange={(v) => update({ status: v })}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {Object.entries(MISSION_STATUS_LABELS).map(([k, l]) => (
            <SelectItem key={k} value={k}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.type ?? 'all'} onValueChange={(v) => update({ type: v })}>
        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          {Object.entries(MISSION_TYPE_LABELS).map(([k, l]) => (
            <SelectItem key={k} value={k}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.priority ?? 'all'} onValueChange={(v) => update({ priority: v })}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priorité" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes</SelectItem>
          <SelectItem value="low">Basse</SelectItem>
          <SelectItem value="medium">Moyenne</SelectItem>
          <SelectItem value="high">Haute</SelectItem>
          <SelectItem value="urgent">Urgente</SelectItem>
        </SelectContent>
      </Select>

      {clients.length > 0 && (
        <Select value={filters.clientId ?? 'all'} onValueChange={(v) => update({ clientId: v })}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Client" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les clients</SelectItem>
            {clients.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex border rounded-md">
        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9" onClick={() => onViewModeChange('grid')}>
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9" onClick={() => onViewModeChange('table')}>
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
