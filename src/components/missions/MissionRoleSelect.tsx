import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MissionRoleEligibility } from '@/lib/missionRoles';

interface Props {
  roles: readonly MissionRoleEligibility[];
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  loading: boolean;
  error?: string;
}

export default function MissionRoleSelect({ roles, value, onValueChange, disabled, loading, error }: Props) {
  const incomplete = roles.some(r => r.motif === 'grade ou echelon non renseigne');
  return <>
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading || !!error}>
      <SelectTrigger aria-label="Rôle de mission"><SelectValue placeholder={loading ? 'Chargement des rôles...' : 'Sélectionner un rôle'} /></SelectTrigger>
      <SelectContent>
        {roles.map(r => <Tooltip key={r.role}>
          <TooltipTrigger asChild>
            <div title={!r.autorise ? r.motif : undefined}>
              <SelectItem value={r.role} disabled={!r.autorise}>{r.libelle}</SelectItem>
            </div>
          </TooltipTrigger>
          {!r.autorise && <TooltipContent>{r.motif}</TooltipContent>}
        </Tooltip>)}
      </SelectContent>
    </Select>
    {incomplete && <p role="alert" className="text-sm text-destructive">Complétez le grade et l’échelon dans la fiche du collaborateur avant de l’affecter.</p>}
    {error && <p role="alert" className="text-sm text-destructive">Les rôles ne peuvent pas être chargés : {error}. Réessayez avant d’enregistrer.</p>}
    {!incomplete && !error && !loading && roles.length > 0 && !roles.some(r => r.autorise) && <p role="alert" className="text-sm text-destructive">Aucun rôle autorisé pour ce collaborateur.</p>}
  </>;
}