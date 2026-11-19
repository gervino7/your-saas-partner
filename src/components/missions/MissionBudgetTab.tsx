import { useState } from 'react';
import { Lock, Wallet, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CURRENCY_LABELS } from '@/types/database';
import { toast } from 'sonner';
import { formatMontant, useMissionBudget, useSetMissionBudget } from '@/hooks/useMissionBudget';

function FixerBudget({ missionId, initial, open, onOpenChange }: {
  missionId: string; initial: { montant?: number; devise?: string; notes?: string | null }; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const [montant, setMontant] = useState(initial.montant?.toString() ?? '');
  const [devise, setDevise] = useState(initial.devise ?? 'XOF');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const save = useSetMissionBudget(missionId);
  const valeur = Number(montant.replace(/\s/g, '').replace(',', '.'));
  const valide = montant.trim() !== '' && Number.isFinite(valeur) && valeur >= 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Fixer le budget</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[2fr_1fr] gap-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Montant</label>
              <Input inputMode="decimal" className="tabular-nums" value={montant} onChange={(e) => setMontant(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Devise</label>
              <Select value={devise} onValueChange={setDevise}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button disabled={!valide || save.isPending} onClick={() => save.mutate(
            { montant: valeur, devise, notes: notes.trim() || null },
            { onSuccess: () => { toast.success('Budget enregistré'); onOpenChange(false); }, onError: (e: any) => toast.error(e.message) },
          )}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MissionBudgetTab({ mission }: { mission: any }) {
  const { data, isLoading, error } = useMissionBudget(mission.id);
  const [open, setOpen] = useState(false);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  if (data.etat === 'reserve') {
    return (
      <Card><CardContent className="flex items-center gap-3 py-8">
        <Lock className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm">Le budget de cette mission est réservé à l'associé et au directeur de mission.</p>
      </CardContent></Card>
    );
  }

  const bouton = data.peutFixer && (
    <Button size="sm" variant={data.etat === 'fixe' ? 'outline' : 'default'} onClick={() => setOpen(true)}>
      <Pencil className="mr-1.5 h-4 w-4" /> Fixer le budget
    </Button>
  );
  const dialog = data.peutFixer && open && (
    <FixerBudget missionId={mission.id} open={open} onOpenChange={setOpen}
      initial={data.etat === 'fixe' ? { montant: data.montant, devise: data.devise, notes: data.notes } : {}} />
  );

  if (data.etat === 'non_fixe') {
    return (
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 py-8">
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm">Aucun budget fixé pour cette mission.</p>
        </div>
        {bouton}
        {dialog}
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Budget de la mission</CardTitle>
          {bouton}
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-semibold tabular-nums">{formatMontant(data.montant, data.devise)}</p>
          {data.fixePar && <p className="text-xs text-muted-foreground">Fixé par {data.fixePar}</p>}
          {data.notes && <p className="text-sm text-muted-foreground whitespace-pre-line">{data.notes}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Consommation</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Non calculée : aucun taux journalier officiel n'est encore défini pour le cabinet.</p>
        </CardContent>
      </Card>
      {dialog}
    </div>
  );
}
