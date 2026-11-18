import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Pencil, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GRADE_LABELS } from '@/types/database';

type Practice = 'comptable' | 'conseil' | 'juridique';
const PRACTICES: { value: Practice; label: string }[] = [
  { value: 'comptable', label: 'Comptable' },
  { value: 'conseil', label: 'Conseil' },
  { value: 'juridique', label: 'Juridique' },
];
const GRADE_CODES = ['DA', 'DM', 'CM', 'SUP', 'AS', 'AUD', 'AJ', 'STG'] as const;
const RANKS = Array.from({ length: 18 }, (_, i) => i + 1);
const OCCUPIED_HINT = "Déplacez d'abord les collaborateurs assis sur cet échelon.";

interface Echelon {
  echelon_id: string; practice: string; famille: string; echelon: string; rang: number;
  grade: string; roles_permis: string; actif: boolean; occupants: number; qui: string | null; modifiable: boolean;
}

interface FormState { echelon: string; family: string; rank: number | null; maps_to_grade: string; is_active: boolean }
const EMPTY: FormState = { echelon: '', family: '', rank: null, maps_to_grade: 'AUD', is_active: true };

const norm = (s: string) => s.trim().toLowerCase();
const gradeLabel = (g: string) => (GRADE_LABELS as Record<string, string>)[g] ?? g;

export default function AdminGrades() {
  const profile = useAuthStore((s) => s.profile);
  const orgId = profile?.organization_id;
  const qc = useQueryClient();
  const [practice, setPractice] = useState<Practice>('comptable');
  const [editing, setEditing] = useState<Echelon | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [toDelete, setToDelete] = useState<Echelon | null>(null);

  const { data: grille = [], isLoading } = useQuery({
    queryKey: ['grille-du-cabinet', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('grille_du_cabinet', { _practice: null as unknown as string });
      if (error) throw error;
      return (data ?? []) as Echelon[];
    },
    enabled: !!orgId,
  });

  const { data: profils = [] } = useQuery({
    queryKey: ['grille-profils', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, practice, grade, grade_echelon')
        .eq('organization_id', orgId!)
        .not('grade_echelon', 'is', null);
      if (error) throw error;
      return data as { id: string; full_name: string; practice: string | null; grade: string | null; grade_echelon: string }[];
    },
    enabled: !!orgId,
  });

  const modifiable = grille.length > 0 && grille.some((e) => e.modifiable);
  const rows = useMemo(
    () => grille.filter((e) => e.practice === practice).sort((a, b) => b.rang - a.rang),
    [grille, practice],
  );

  const anomalies = useMemo(() => {
    if (!grille.length) return [];
    return profils.flatMap((p) => {
      const match = grille.find((e) => e.practice === p.practice && norm(e.echelon) === norm(p.grade_echelon));
      if (!match) return [{ ...p, motif: "Échelon non reconnu par la grille de sa practice" }];
      if (p.grade && match.grade && p.grade !== match.grade)
        return [{ ...p, motif: `Grade ${p.grade} différent de celui de l'échelon (${match.grade})` }];
      return [];
    });
  }, [grille, profils]);

  const freeRanks = useMemo(() => {
    const taken = new Set(rows.filter((r) => r.echelon_id !== editing?.echelon_id).map((r) => r.rang));
    return RANKS.filter((r) => !taken.has(r));
  }, [rows, editing]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['grille-du-cabinet'] });
    qc.invalidateQueries({ queryKey: ['grille-profils'] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const nom = form.echelon.trim();
      if (!nom || !form.family.trim() || !form.rank) throw new Error('Renseignez le nom, la famille et le rang.');
      if (rows.some((r) => r.echelon_id !== editing?.echelon_id && r.echelon.toLowerCase() === nom.toLowerCase()))
        throw new Error('Cet échelon existe déjà dans cette practice.');
      if (!editing) {
        const { error } = await supabase.from('evaluation_grades').insert({
          practice, family: form.family.trim(), echelon: nom, rank: form.rank,
          maps_to_grade: form.maps_to_grade, is_active: true, organization_id: orgId!,
        });
        if (error) throw error;
        return 'Échelon créé.';
      }
      let msg = 'Échelon mis à jour.';
      if (nom !== editing.echelon) {
        const { data, error } = await supabase.rpc('renommer_echelon', { _echelon_id: editing.echelon_id, _nouveau_nom: nom });
        if (error) throw error;
        const r = (Array.isArray(data) ? data[0] : data) as { profils_mis_a_jour?: number; lignes_d_historique_mises_a_jour?: number } | null;
        msg = `Échelon renommé. ${r?.profils_mis_a_jour ?? 0} collaborateurs et ${r?.lignes_d_historique_mises_a_jour ?? 0} lignes d'historique mis à jour.`;
      }
      const { error } = await supabase.from('evaluation_grades')
        .update({ family: form.family.trim(), rank: form.rank, maps_to_grade: form.maps_to_grade, is_active: form.is_active })
        .eq('id', editing.echelon_id);
      if (error) throw error;
      return msg;
    },
    onSuccess: (msg) => { invalidate(); setDialogOpen(false); toast.success(msg); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('evaluation_grades').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setToDelete(null); toast.success('Échelon supprimé.'); },
    onError: (e: Error) => { setToDelete(null); toast.error(e.message); },
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true); };
  const openEdit = (e: Echelon) => {
    setEditing(e);
    setForm({ echelon: e.echelon, family: e.famille, rank: e.rang, maps_to_grade: e.grade, is_active: e.actif });
    setDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 min-w-0 max-w-full">
        <Card className="min-w-0 max-w-full overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle>Grille des grades et des échelons</CardTitle>
              <CardDescription>18 échelons par practice. Le rang décide des rôles qu'un collaborateur peut tenir en mission.</CardDescription>
            </div>
            {modifiable && (
              <Button size="sm" onClick={openCreate} disabled={freeRanks.length === 0}>
                <Plus className="h-4 w-4 mr-1" /> Nouvel échelon
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4 min-w-0">
            {anomalies.length > 0 && (
              <div className="rounded-md border border-accent/40 bg-accent/5 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <AlertTriangle className="h-4 w-4 text-accent" />
                  {anomalies.length} collaborateurs non reconnus par la grille : leur rang est approximé.
                </div>
                <ul className="space-y-1">
                  {anomalies.map((a) => (
                    <li key={a.id}>
                      <Link to={`/profile/${a.id}`} className="font-medium text-primary hover:underline">{a.full_name}</Link>
                      <span className="text-muted-foreground"> - {a.grade_echelon} ({a.practice ?? 'sans practice'}) : {a.motif}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!isLoading && !modifiable && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" /> Seul le directeur associé peut modifier la grille.
              </div>
            )}
            <Tabs value={practice} onValueChange={(v) => setPractice(v as Practice)}>
              <TabsList>
                {PRACTICES.map((p) => (
                  <TabsTrigger key={p.value} value={p.value}>
                    {p.label} <span className="ml-1 text-xs text-muted-foreground tabular">{grille.filter((e) => e.practice === p.value).length}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rang</TableHead>
                  <TableHead>Échelon</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="hidden sm:table-cell">Rôles permis en mission</TableHead>
                  <TableHead className="hidden sm:table-cell w-28">Occupants</TableHead>
                  <TableHead className="w-24">Statut</TableHead>
                  {modifiable && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Chargement…</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Aucun échelon pour cette practice.</TableCell></TableRow>
                ) : rows.map((e) => (
                  <TableRow key={e.echelon_id} className="h-11">
                    <TableCell className="tabular font-medium">{e.rang}</TableCell>
                    <TableCell>
                      <div className="font-medium">{e.echelon}</div>
                      <div className="text-xs text-muted-foreground">{e.famille}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{e.grade}</Badge> <span className="text-xs text-muted-foreground">{gradeLabel(e.grade)}</span></TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{e.roles_permis || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="tabular font-medium">{e.occupants}</div>
                      {e.qui && <div className="text-xs text-muted-foreground line-clamp-2" title={e.qui}>{e.qui}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.actif ? 'default' : 'secondary'}>{e.actif ? 'Actif' : 'Inactif'}</Badge>
                    </TableCell>
                    {modifiable && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)} aria-label="Modifier">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button variant="ghost" size="icon" disabled={e.occupants > 0} onClick={() => setToDelete(e)} aria-label="Supprimer">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {e.occupants > 0 && <TooltipContent>{OCCUPIED_HINT}</TooltipContent>}
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier l'échelon" : 'Nouvel échelon'}</DialogTitle>
              <DialogDescription>Practice {PRACTICES.find((p) => p.value === practice)?.label}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Échelon</Label>
                <Input value={form.echelon} onChange={(ev) => setForm({ ...form, echelon: ev.target.value })} />
                {editing && editing.occupants > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Le renommage sera reporté sur les {editing.occupants} collaborateurs concernés et leur historique.</p>
                )}
              </div>
              <div>
                <Label>Famille</Label>
                <Input value={form.family} onChange={(ev) => setForm({ ...form, family: ev.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Rang</Label>
                  <Select value={form.rank ? String(form.rank) : ''} onValueChange={(v) => setForm({ ...form, rank: Number(v) })}>
                    <SelectTrigger><SelectValue placeholder="Rang libre" /></SelectTrigger>
                    <SelectContent>
                      {freeRanks.map((r) => <SelectItem key={r} value={String(r)}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grade</Label>
                  <Select value={form.maps_to_grade} onValueChange={(v) => setForm({ ...form, maps_to_grade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRADE_CODES.map((g) => <SelectItem key={g} value={g}>{g} - {gradeLabel(g)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {editing && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Switch checked={form.is_active} disabled={editing.occupants > 0 && form.is_active}
                        onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                      <Label>Actif</Label>
                    </div>
                  </TooltipTrigger>
                  {editing.occupants > 0 && <TooltipContent>{OCCUPIED_HINT}</TooltipContent>}
                </Tooltip>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer l'échelon « {toDelete?.echelon} » ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est définitive.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.echelon_id)}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
