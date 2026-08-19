import { useState } from 'react';
import { AlertCircle, Plus, RotateCcw, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useObligationTypes, useUpsertObligationType, useSeedObligationTypes, useGeneratePeriods } from '@/hooks/useObligations';
import DocumentTypesSection from '@/components/obligations/DocumentTypesSection';
import { PERIODICITE_LABELS, CATEGORY_LABELS, REGIMES, formatDeadline } from '@/lib/obligations';

const emptyType = {
  code: '', label: '', category: 'fiscal', periodicite: 'mensuelle',
  deadline_day: 15, deadline_month: null as number | null,
  deadline_offset_months: 1, applies_to_regimes: [] as string[] | null,
  description: '', is_active: true,
};

const ObligationTypesSettings = () => {
  const { data: types = [] } = useObligationTypes();
  const upsert = useUpsertObligationType();
  const seed = useSeedObligationTypes();
  const generate = useGeneratePeriods();

  const [editing, setEditing] = useState<any | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<string>('all');

  const openEdit = (t?: any) => setEditing(t ? { ...t } : { ...emptyType });

  const save = () => {
    upsert.mutate(editing, { onSuccess: () => setEditing(null) });
  };

  const toggleRegime = (v: string) => {
    setEditing((e: any) => {
      const arr: string[] = e.applies_to_regimes ?? [];
      const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
      return { ...e, applies_to_regimes: next.length ? next : null };
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900 dark:text-amber-100">
          Les échéances par défaut sont indicatives. Les dates réelles dépendent de la catégorie du contribuable (DGE / CME / CDI) et de la réglementation en vigueur. <b>Vérifiez et ajustez ces valeurs auprès de la DGI</b> avant exploitation.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Référentiel des obligations</CardTitle>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm"><RotateCcw className="h-4 w-4 mr-2" /> Réinitialiser</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Réinitialiser le référentiel ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Les types d'obligations manquants seront recréés. Les types existants sont préservés (aucune écrasement).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => seed.mutate()}>Réinitialiser</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" onClick={() => openEdit()}><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Périodicité</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Régimes</TableHead>
                <TableHead>Actif</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(t)}>
                  <TableCell className="tabular-nums text-xs">{t.code}</TableCell>
                  <TableCell className="font-medium">{t.label}</TableCell>
                  <TableCell>{CATEGORY_LABELS[t.category] ?? t.category}</TableCell>
                  <TableCell>{PERIODICITE_LABELS[t.periodicite] ?? t.periodicite}</TableCell>
                  <TableCell className="text-sm">{formatDeadline(t)}</TableCell>
                  <TableCell className="text-xs">
                    {t.applies_to_regimes?.length
                      ? t.applies_to_regimes.map((r: string) => REGIMES.find((x) => x.value === r)?.label ?? r).join(', ')
                      : <span className="text-muted-foreground">Tous</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? 'default' : 'outline'}>{t.is_active ? 'Oui' : 'Non'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Générer l'échéancier</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label>Année</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mois</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute l'année</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => generate.mutate({ year, month: month === 'all' ? null : Number(month) })}
              disabled={generate.isPending}
            >
              <Play className="h-4 w-4 mr-2" /> Générer
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">La génération est sans risque : relancer ne crée pas de doublon.</p>
        </CardContent>
      </Card>

      {/* Dialog d'édition */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Modifier' : 'Ajouter'} un type d'obligation</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Code</Label>
                <Input value={editing.code ?? ''} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <Label>Libellé</Label>
                <Input value={editing.label ?? ''} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Périodicité</Label>
                <Select value={editing.periodicite} onValueChange={(v) => setEditing({ ...editing, periodicite: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERIODICITE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Jour d'échéance</Label>
                <Input type="number" min={1} max={31} value={editing.deadline_day ?? ''} onChange={(e) => setEditing({ ...editing, deadline_day: e.target.value ? Number(e.target.value) : null })} />
              </div>
              {editing.periodicite === 'annuelle' && (
                <div>
                  <Label>Mois d'échéance</Label>
                  <Input type="number" min={1} max={12} value={editing.deadline_month ?? ''} onChange={(e) => setEditing({ ...editing, deadline_month: e.target.value ? Number(e.target.value) : null })} />
                </div>
              )}
              {editing.periodicite !== 'annuelle' && (
                <div>
                  <Label>Décalage (mois)</Label>
                  <Input type="number" min={0} max={12} value={editing.deadline_offset_months ?? 1} onChange={(e) => setEditing({ ...editing, deadline_offset_months: Number(e.target.value) })} />
                </div>
              )}
              <div className="md:col-span-2">
                <Label>Régimes applicables (vide = tous)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {REGIMES.map((r) => {
                    const active = editing.applies_to_regimes?.includes(r.value);
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => toggleRegime(r.value)}
                        className={`px-3 py-1.5 rounded-md text-xs border transition ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              {editing.id && <DocumentTypesSection obligationTypeId={editing.id} />}
              <div className="flex items-center gap-3">
                <Switch checked={editing.is_active !== false} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Actif</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={save} disabled={upsert.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ObligationTypesSettings;
