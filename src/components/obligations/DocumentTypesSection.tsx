import { useState } from 'react';
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import {
  useObligationDocTypes, useUpsertDocType, useDeleteDocType, useSeedDocTypes,
} from '@/hooks/useObligationDocs';

interface Props { obligationTypeId: string }

type DocTypeRow = { id: string; label: string; is_required: boolean; sort_order: number };

const DocumentTypesSection = ({ obligationTypeId }: Props) => {
  const profile = useAuthStore((s) => s.profile);
  const { data: rows = [] } = useObligationDocTypes(obligationTypeId);
  const upsert = useUpsertDocType();
  const del = useDeleteDocType();
  const seed = useSeedDocTypes();

  const [editing, setEditing] = useState<Partial<DocTypeRow> | null>(null);

  const list = rows as unknown as DocTypeRow[];

  const save = () => {
    if (!editing?.label?.trim()) return;
    upsert.mutate({
      id: editing.id,
      obligation_type_id: obligationTypeId,
      label: editing.label.trim(),
      is_required: editing.is_required !== false,
      sort_order: editing.sort_order ?? list.length,
    }, { onSuccess: () => setEditing(null) });
  };

  const move = (row: DocTypeRow, dir: -1 | 1) => {
    const idx = list.findIndex((r) => r.id === row.id);
    const target = list[idx + dir];
    if (!target) return;
    upsert.mutate({ id: row.id, obligation_type_id: obligationTypeId, label: row.label, is_required: row.is_required, sort_order: target.sort_order });
    upsert.mutate({ id: target.id, obligation_type_id: obligationTypeId, label: target.label, is_required: target.is_required, sort_order: row.sort_order });
  };

  return (
    <div className="md:col-span-2 border-t pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Pièces attendues</Label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!profile?.organization_id || seed.isPending}
            onClick={() => seed.mutate(profile!.organization_id!)}>
            <RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser les pièces types
          </Button>
          <Button size="sm" onClick={() => setEditing({ label: '', is_required: true, sort_order: list.length })}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Ces pièces seront proposées automatiquement pour chaque échéance de cette obligation.
      </p>

      <div className="rounded-lg border divide-y">
        {list.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground italic">Aucune pièce type définie.</p>
        )}
        {list.map((r, i) => (
          <div key={r.id} className="flex items-center gap-3 p-2">
            <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
            <span className="flex-1 text-sm">{r.label}</span>
            <Badge variant={r.is_required ? 'default' : 'outline'}>{r.is_required ? 'Requise' : 'Optionnelle'}</Badge>
            <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(r, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" disabled={i === list.length - 1} onClick={() => move(r, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="text-destructive"
              onClick={() => del.mutate({ id: r.id, obligation_type_id: obligationTypeId })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/30">
          <div className="flex-1 min-w-52">
            <Label className="text-xs">Libellé</Label>
            <Input className="mt-1" value={editing.label ?? ''} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={editing.is_required !== false} onCheckedChange={(v) => setEditing({ ...editing, is_required: v })} />
            <Label className="text-xs">Requise</Label>
          </div>
          <Button size="sm" onClick={save} disabled={upsert.isPending}>Enregistrer</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
        </div>
      )}
    </div>
  );
};

export default DocumentTypesSection;
