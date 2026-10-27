import { useDepartments } from '@/hooks/useDepartments';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DepartmentSelect({ value, onChange, disabled, dossier = false }: { value?: string | null; onChange: (value: string | null) => void; disabled?: boolean; dossier?: boolean }) {
  const q = useDepartments();
  const selected = q.data?.find(d => d.id === value);
  const defaultDepartment = q.data?.find(d => d.is_default_dossier);
  return <div className="space-y-1"><Select value={value || 'none'} onValueChange={v => onChange(v === 'none' ? null : v)} disabled={disabled || q.isLoading || !!q.error}>
    <SelectTrigger aria-label="Département"><SelectValue placeholder="Choisir un département" /></SelectTrigger>
    <SelectContent><SelectItem value="none">{dossier ? `Par défaut${defaultDepartment ? ` - ${defaultDepartment.label}` : ''}` : 'Non précisé'}</SelectItem>
      {selected && !selected.is_active && <SelectItem value={selected.id} disabled>{selected.label} (inactif)</SelectItem>}
      {q.data?.filter(d => d.is_active).map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
    </SelectContent></Select>{q.error && <p role="alert" className="text-xs text-destructive">{q.error.message}</p>}</div>;
}