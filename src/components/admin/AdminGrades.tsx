import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, GraduationCap, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GRADE_LABELS, GRADE_LEVELS } from '@/types/database';

interface OrgGrade {
  id: string;
  organization_id: string;
  code: string;
  label: string;
  level: number;
  daily_rate: number;
  currency: string;
  is_active: boolean;
}

const DEFAULT_GRADES = Object.entries(GRADE_LABELS).map(([code, label]) => ({
  code,
  label,
  level: GRADE_LEVELS[code as keyof typeof GRADE_LEVELS],
  daily_rate: 0,
  currency: 'XOF',
  is_active: true,
}));

export default function AdminGrades() {
  const profile = useAuthStore((s) => s.profile);
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<OrgGrade | null>(null);
  const [form, setForm] = useState({ code: '', label: '', level: 1, daily_rate: 0, currency: 'XOF', is_active: true });

  const { data: grades = [], isLoading } = useQuery({
    queryKey: ['organization-grades', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_grades')
        .select('*')
        .eq('organization_id', orgId!)
        .order('level', { ascending: true });
      if (error) throw error;
      return data as OrgGrade[];
    },
    enabled: !!orgId,
  });

  const initializeGrades = useMutation({
    mutationFn: async () => {
      const rows = DEFAULT_GRADES.map((g) => ({ ...g, organization_id: orgId! }));
      const { error } = await supabase.from('organization_grades').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-grades'] });
      toast.success('Grades par défaut initialisés');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveGrade = useMutation({
    mutationFn: async () => {
      if (editingGrade) {
        const { error } = await supabase
          .from('organization_grades')
          .update({ code: form.code, label: form.label, level: form.level, daily_rate: form.daily_rate, currency: form.currency, is_active: form.is_active })
          .eq('id', editingGrade.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_grades')
          .insert({ ...form, organization_id: orgId! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-grades'] });
      toast.success(editingGrade ? 'Grade modifié' : 'Grade ajouté');
      setDialogOpen(false);
      setEditingGrade(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteGrade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organization_grades').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-grades'] });
      toast.success('Grade supprimé');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingGrade(null);
    const nextLevel = grades.length > 0 ? Math.max(...grades.map((g) => g.level)) + 1 : 1;
    setForm({ code: '', label: '', level: nextLevel, daily_rate: 0, currency: 'XOF', is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (g: OrgGrade) => {
    setEditingGrade(g);
    setForm({ code: g.code, label: g.label, level: g.level, daily_rate: g.daily_rate, currency: g.currency, is_active: g.is_active });
    setDialogOpen(true);
  };

  const formatRate = (rate: number, currency: string) => {
    if (!rate) return '-';
    return `${rate.toLocaleString('fr-FR')} ${currency}`;
  };

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Grades hiérarchiques</CardTitle>
                <CardDescription>Gérez les grades de votre organisation et les taux journaliers associés.</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {grades.length === 0 && (
                <Button variant="outline" size="sm" onClick={() => initializeGrades.mutate()} disabled={initializeGrades.isPending}>
                  Initialiser par défaut
                </Button>
              )}
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Nouveau grade
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Aucun grade configuré.</p>
              <p className="text-sm">Cliquez sur « Initialiser par défaut » pour charger les grades standards.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Niveau</TableHead>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Taux journalier</TableHead>
                  <TableHead className="w-20">Statut</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((g) => (
                  <TableRow key={g.id} className={!g.is_active ? 'text-muted-foreground' : ''}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{g.level}</Badge>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{g.code}</TableCell>
                    <TableCell>{g.label}</TableCell>
                    <TableCell className="text-muted-foreground">{formatRate(g.daily_rate, g.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={g.is_active ? 'default' : 'secondary'} className="text-xs">
                        {g.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer le grade « {g.code} » ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Les utilisateurs ayant ce grade devront être réassignés manuellement.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteGrade.mutate(g.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      {/* Create Dialog - Simple form */}
      <Dialog open={dialogOpen && !editingGrade} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingGrade(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau grade</DialogTitle>
            <DialogDescription>Ajoutez un nouveau grade à votre organisation.</DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[65vh] dialog-form-bg">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DA" maxLength={10} />
              </div>
              <div className="space-y-1.5">
                <Label>Niveau hiérarchique</Label>
                <Input type="number" min={1} max={99} value={form.level} onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Libellé</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Directeur Associé" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Taux journalier</Label>
                <Input type="number" min={0} value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Devise</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="XOF" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Grade actif</Label>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-amber-300/40 dialog-footer-bg flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button size="sm" className="h-9 px-5" onClick={() => saveGrade.mutate()} disabled={!form.code || !form.label || saveGrade.isPending}>
              Ajouter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Form + grades list */}
      <Dialog open={dialogOpen && !!editingGrade} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditingGrade(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le grade</DialogTitle>
            <DialogDescription>Modifiez les informations du grade sélectionné.</DialogDescription>
          </DialogHeader>

          <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[65vh] dialog-form-bg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Code</Label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DA" maxLength={10} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Niveau hiérarchique</Label>
                    <Input type="number" min={1} max={99} value={form.level} onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) || 1 })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Libellé</Label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Directeur Associé" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Taux journalier</Label>
                    <Input type="number" min={0} value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Devise</Label>
                    <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} placeholder="XOF" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Grade actif</Label>
                </div>
              </div>

              {/* Right: Existing grades list */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Grades existants ({grades.length})</Label>
                <div className="rounded-lg max-h-64 overflow-y-auto bg-background border border-border">
                  {grades.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun grade configuré</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {grades.map((g) => {
                        const isSelected = editingGrade?.id === g.id;
                        return (
                          <li key={g.id}>
                            <button
                              type="button"
                              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors
                                ${isSelected
                                  ? 'bg-primary/15 border-l-3 border-l-primary text-foreground'
                                  : 'hover:bg-accent/50 text-foreground border-l-3 border-l-transparent'}
                                ${!g.is_active ? 'text-muted-foreground' : ''}`}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingGrade(g);
                                setForm({ code: g.code, label: g.label, level: g.level, daily_rate: g.daily_rate, currency: g.currency, is_active: g.is_active });
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pointer-events-none">
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">{g.level}</span>
                                <div className="min-w-0">
                                  <span className="font-semibold text-foreground">{g.code}</span>
                                  <span className="ml-1.5 text-muted-foreground truncate">{g.label}</span>
                                </div>
                              </div>
                              <span className="text-xs font-medium text-foreground/70 shrink-0 ml-2 pointer-events-none">
                                {g.daily_rate ? `${g.daily_rate.toLocaleString('fr-FR')} ${g.currency}` : '-'}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <p className="text-xs text-muted-foreground italic">Cliquez sur un grade pour charger ses données dans le formulaire.</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-amber-300/40 dialog-footer-bg flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-9 px-4" onClick={() => { setDialogOpen(false); setEditingGrade(null); }}>Annuler</Button>
            <Button size="sm" className="h-9 px-5" onClick={() => saveGrade.mutate()} disabled={!form.code || !form.label || saveGrade.isPending}>
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
