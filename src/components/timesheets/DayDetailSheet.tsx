import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pencil, Plus, Trash2, Lock } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ActionElementaire, ActionInput, ETAT_LABELS, EtatAction, formatHeures,
  useActionsElementaires, useDeleteAction, useSaveAction,
} from '@/hooks/useTimesheetDetails';

export type DayDetailTarget = { entryId: string; tache: string; date: string; heures: number; status: string };

const EMPTY = { intitule: '', quantite: '', unite: '', etat: 'fait' as EtatAction, preuve: '', heures: '' };

function toForm(a: ActionElementaire) {
  return {
    intitule: a.intitule, quantite: a.quantite?.toString() ?? '', unite: a.unite ?? '',
    etat: a.etat, preuve: a.preuve ?? '', heures: a.heures?.toString() ?? '',
  };
}

function ActionForm({ initial, onCancel, onSave, saving }: {
  initial: typeof EMPTY; onCancel?: () => void; onSave: (v: ActionInput) => void; saving: boolean;
}) {
  const [f, setF] = useState(initial);
  const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
  const valid = f.intitule.trim().length >= 3;
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="space-y-1">
        <label className="text-xs font-medium">Intitulé</label>
        <Input value={f.intitule} onChange={(e) => setF({ ...f, intitule: e.target.value })} placeholder="Comptes rapprochés" />
        {f.intitule.length > 0 && !valid && <p className="text-xs text-destructive">3 caractères minimum</p>}
      </div>
      <div className="grid grid-cols-[1fr_1.4fr] gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">Quantité</label>
          <Input inputMode="decimal" className="tabular-nums" value={f.quantite} onChange={(e) => setF({ ...f, quantite: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Unité</label>
          <Input value={f.unite} onChange={(e) => setF({ ...f, unite: e.target.value })} placeholder="comptes" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">État</label>
          <Select value={f.etat} onValueChange={(v) => setF({ ...f, etat: v as EtatAction })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ETAT_LABELS) as EtatAction[]).map((k) => <SelectItem key={k} value={k}>{ETAT_LABELS[k]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Heures</label>
          <Input inputMode="decimal" className="tabular-nums" value={f.heures} onChange={(e) => setF({ ...f, heures: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">Preuve</label>
        <Input value={f.preuve} onChange={(e) => setF({ ...f, preuve: e.target.value })} />
        <p className="text-xs text-muted-foreground">Référence, numéro de pièce, chemin du document</p>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>}
        <Button size="sm" disabled={!valid || saving} onClick={() => onSave({
          intitule: f.intitule.trim(), quantite: num(f.quantite), unite: f.unite.trim() || null,
          etat: f.etat, preuve: f.preuve.trim() || null, heures: num(f.heures),
        })}>Enregistrer</Button>
      </div>
    </div>
  );
}

export default function DayDetailSheet({ target, onClose }: { target: DayDetailTarget | null; onClose: () => void }) {
  const entryId = target?.entryId ?? null;
  const { data: actions = [] } = useActionsElementaires(entryId);
  const save = useSaveAction(entryId ?? '');
  const del = useDeleteAction(entryId ?? '');
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const readOnly = target?.status === 'approved';
  const total = actions.reduce((s, a) => s + Number(a.heures ?? 0), 0);
  const over = target ? total > target.heures : false;

  const handleSave = (values: ActionInput, id?: string) => {
    save.mutate(
      { id, values, ordre: id ? undefined : (actions.at(-1)?.ordre ?? 0) + 1 },
      { onSuccess: () => setEditing(null), onError: (e: any) => toast.error(e.message) },
    );
  };

  return (
    <Sheet open={!!target} onOpenChange={(o) => { if (!o) { setEditing(null); onClose(); } }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-4 text-left">
          <SheetTitle className="text-base">
            Détail de la journée - {target?.tache}, {target ? format(new Date(target.date), 'EEEE dd/MM/yyyy', { locale: fr }) : ''}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {readOnly && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2.5 text-sm">
              <Lock className="h-4 w-4 text-muted-foreground" /> Journée validée par le directeur associé
            </div>
          )}
          {actions.length === 0 && editing !== 'new' && (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune action élémentaire déclarée</p>
          )}
          {actions.map((a) => editing === a.id ? (
            <ActionForm key={a.id} initial={toForm(a)} saving={save.isPending} onCancel={() => setEditing(null)} onSave={(v) => handleSave(v, a.id)} />
          ) : (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">
                  {a.intitule}
                  {(a.quantite != null || a.unite) && (
                    <span className="font-normal text-muted-foreground tabular-nums">
                      {' - '}{a.quantite != null ? Number(a.quantite).toLocaleString('fr-FR') : ''}{a.unite ? ` ${a.unite}` : ''}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">{ETAT_LABELS[a.etat] ?? a.etat}</Badge>
                  {a.heures != null && <span className="tabular-nums">{formatHeures(Number(a.heures))}</span>}
                  {a.preuve && <span className="truncate">Preuve : {a.preuve}</span>}
                </div>
              </div>
              {!readOnly && (
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Modifier" onClick={() => setEditing(a.id)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Supprimer"
                    onClick={() => del.mutate(a.id, { onError: (e: any) => toast.error(e.message) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          ))}
          {!readOnly && (editing === 'new' ? (
            <ActionForm initial={EMPTY} saving={save.isPending} onCancel={() => setEditing(null)} onSave={(v) => handleSave(v)} />
          ) : (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setEditing('new')}>
              <Plus className="mr-1.5 h-4 w-4" /> Ajouter une action
            </Button>
          ))}
        </div>
        <div className={cn('border-t border-border p-4 text-sm font-medium tabular-nums', over && 'text-destructive')}>
          {formatHeures(total)} réparties sur {formatHeures(target?.heures ?? 0)} imputées
        </div>
      </SheetContent>
    </Sheet>
  );
}
