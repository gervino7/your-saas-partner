import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFixOrg } from '@/hooks/useSuperAdmin';
import { GRADE_LABELS, GRADE_LEVELS } from '@/types/database';
import type { Grade } from '@/types/database';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgId: string;
  users: { id: string; full_name?: string | null; email?: string | null; grade?: string | null }[];
}

export default function AssignGradeDialog({ open, onOpenChange, orgId, users }: Props) {
  const fix = useFixOrg();
  const [grade, setGrade] = useState<Grade>('AUD');
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const apply = async () => {
    for (const userId of selected) {
      await fix.mutateAsync({
        _org_id: orgId,
        _action: 'reset_grade',
        _params: { user_id: userId, grade, grade_level: GRADE_LEVELS[grade] },
      });
    }
    setSelected([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Attribuer un grade</DialogTitle>
          <DialogDescription>
            Sans grade, un collaborateur ne voit aucune mission. Le grade choisi sera appliqué aux comptes sélectionnés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>Grade à attribuer</Label>
          <Select value={grade} onValueChange={(v) => setGrade(v as Grade)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(GRADE_LABELS) as Grade[]).map((g) => (
                <SelectItem key={g} value={g}>{g} - {GRADE_LABELS[g]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
          {users.length === 0 && <p className="p-2 text-sm text-muted-foreground">Aucun collaborateur sans grade.</p>}
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <Checkbox checked={selected.includes(u.id)} onCheckedChange={() => toggle(u.id)} />
              <span className="font-medium">{u.full_name || 'Sans nom'}</span>
              <span className="text-xs text-muted-foreground">{u.email}</span>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={apply} disabled={selected.length === 0 || fix.isPending}>
            Appliquer à {selected.length} compte(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
