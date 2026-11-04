import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useEvaluationGradeGrid } from '@/hooks/useEvaluationGradeGrid';
import { GRID_RANKS, PRACTICES, validateGradeRow, type EvaluationGradeRow } from '@/lib/evaluationGradeGrid';
import { GRADE_LABELS } from '@/types/database';

const practiceLabels = { comptable: 'Comptable', conseil: 'Conseil', juridique: 'Juridique' };

export default function AdminEvaluationGrades() {
  const { query, roleGrid, save, seed, orgId, canEdit } = useEvaluationGradeGrid();
  const [editing, setEditing] = useState<EvaluationGradeRow | null>(null);
  const rows = query.data ?? [];
  const validation = editing ? validateGradeRow(editing, rows) : null;
  if (query.isLoading) return <p className="text-muted-foreground">Chargement de la grille...</p>;
  if (query.error) return <div role="alert" className="space-y-3"><p className="text-destructive">Impossible de charger la grille : {query.error.message}</p><Button variant="outline" onClick={() => query.refetch()}>Réessayer</Button></div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-primary">Grilles des grades et échelons</h2>
      <span className="text-sm text-muted-foreground tabular-nums">{rows.length} / 54 échelons{!canEdit && ' - Lecture seule'}</span>
    </div>
    {rows.length === 0 && <div className="border-y border-border py-6 space-y-3">
      <p>Aucune grille d’échelons pour ce cabinet.</p>
      {canEdit ? <Button onClick={() => seed.mutate()} disabled={seed.isPending}><Plus className="h-4 w-4 mr-2" />{seed.isPending ? 'Création...' : 'Créer la grille complète'}</Button> : <p className="text-sm text-muted-foreground">La direction du cabinet peut créer la grille complète.</p>}
      {seed.data && <p className="text-sm text-muted-foreground">Résultat : {JSON.stringify(seed.data)}</p>}
    </div>}
    <Tabs defaultValue="comptable">
      <TabsList className="w-full sm:w-auto">{PRACTICES.map(p => <TabsTrigger key={p} value={p}>{practiceLabels[p]}</TabsTrigger>)}</TabsList>
      {PRACTICES.map(practice => <TabsContent key={practice} value={practice} className="space-y-4">
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Rôles de mission et rangs autorisés</h3>
          {roleGrid.isLoading ? <p>Chargement des rôles...</p> : roleGrid.error ? <p role="alert" className="text-destructive">Impossible de charger les rôles : {roleGrid.error.message}</p> : <Table>
            <TableHeader><TableRow><TableHead>Rôle</TableHead><TableHead className="text-right">Rangs</TableHead></TableRow></TableHeader>
            <TableBody>{(roleGrid.data ?? []).map(r => <TableRow key={r.role} className="h-11"><TableCell className="py-2">{r.libelle}</TableCell><TableCell className="py-2 text-right tabular-nums">{r.rang_min} - {r.rang_max}</TableCell></TableRow>)}</TableBody>
          </Table>}
        </section>
        {rows.length > 0 && <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">{rows.filter(r => r.practice === practice).length} / 18 échelons - {practiceLabels[practice]}</h3>
          <Table><TableHeader><TableRow><TableHead className="text-right">Rang</TableHead><TableHead>Échelon</TableHead><TableHead>Famille</TableHead><TableHead>Grade</TableHead><TableHead>Actif</TableHead>{canEdit && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
            <TableBody>{GRID_RANKS.map(rank => {
              const row = rows.find(r => r.practice === practice && r.rank === rank);
              return <TableRow key={rank} className="h-11"><TableCell className="py-2 text-right tabular-nums">{rank}</TableCell><TableCell className="py-2">{row?.echelon ?? 'Échelon à compléter'}</TableCell><TableCell className="py-2">{row?.family ?? '-'}</TableCell><TableCell className="py-2">{row?.maps_to_grade ?? '-'}</TableCell><TableCell className="py-2">{row ? row.is_active ? 'Oui' : 'Non' : '-'}</TableCell>{canEdit && <TableCell className="py-1 text-right"><Button size="icon" variant="ghost" title={row ? 'Modifier cet échelon' : 'Compléter cet échelon'} aria-label={`${row ? 'Modifier' : 'Compléter'} le rang ${rank}`} onClick={() => setEditing(row ?? { id: '', organization_id: orgId ?? null, practice, rank, echelon: '', family: '', maps_to_grade: null, is_active: true })}>{row ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</Button></TableCell>}</TableRow>;
            })}</TableBody>
          </Table>
        </section>}
      </TabsContent>)}
    </Tabs>
    <Dialog open={!!editing && canEdit} onOpenChange={v => { if (!v) setEditing(null); }}>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?.id ? 'Modifier' : 'Compléter'} l’échelon - rang {editing?.rank}</DialogTitle></DialogHeader>
        {editing && <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{practiceLabels[editing.practice]} - Rang {editing.rank}</p>
          <div className="space-y-1.5"><Label htmlFor="grid-echelon">Échelon</Label><Input id="grid-echelon" value={editing.echelon} onChange={e => setEditing({ ...editing, echelon: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="grid-family">Famille</Label><Input id="grid-family" value={editing.family} onChange={e => setEditing({ ...editing, family: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Grade</Label><Select value={editing.maps_to_grade ?? ''} onValueChange={v => setEditing({ ...editing, maps_to_grade: v })}><SelectTrigger aria-label="Grade de l’échelon"><SelectValue placeholder="Choisir un grade" /></SelectTrigger><SelectContent>{Object.entries(GRADE_LABELS).map(([code, label]) => <SelectItem key={code} value={code}>{code} - {label}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex items-center gap-2"><Switch id="grid-active" checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label htmlFor="grid-active">Échelon actif</Label></div>
          {validation && <p role="alert" className="text-sm text-destructive">{validation}</p>}
        </div>}
        <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button><Button disabled={!!validation || save.isPending} onClick={async () => { if (editing) { try { await save.mutateAsync(editing); setEditing(null); } catch { /* mutation displays the error */ } } }}>{save.isPending ? 'Enregistrement...' : 'Enregistrer'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}