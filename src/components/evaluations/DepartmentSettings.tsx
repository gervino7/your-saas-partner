import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useDepartments, useSaveDepartment, useDefaultDepartment, type Department } from '@/hooks/useDepartments';
import { useAuthStore } from '@/stores/authStore';
import { canManageDepartments } from '@/lib/evaluationWorkflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function DepartmentSettings() {
  const profile = useAuthStore(s => s.profile);
  const q = useDepartments(); const save = useSaveDepartment(); const def = useDefaultDepartment();
  const [editing, setEditing] = useState<Partial<Department> | null>(null);
  if (!canManageDepartments(profile?.grade_level)) return null;
  async function submit() {
    if (!editing?.label?.trim() || !editing.code?.trim()) return;
    try { await save.mutateAsync({ id: editing.id, label: editing.label.trim(), code: editing.code.trim(), sort_order: editing.sort_order ?? 0, is_active: editing.is_active !== false }); setEditing(null); } catch { /* error toast */ }
  }
  return <section className="space-y-4 max-w-3xl"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Départements du cabinet</h2><Button onClick={() => setEditing({ code: '', label: '', is_active: true, sort_order: (q.data?.length ?? 0) + 1 })}><Plus className="h-4 w-4 mr-2" />Ajouter un département</Button></div>
    {q.error && <p role="alert" className="text-destructive text-sm">{q.error.message}</p>}
    <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Département</TableHead><TableHead>Actif</TableHead><TableHead>Par défaut des dossiers</TableHead><TableHead className="w-12" /></TableRow></TableHeader><TableBody>
      {q.isLoading ? <TableRow><TableCell colSpan={5}>Chargement des départements...</TableCell></TableRow> : q.data?.length === 0 ? <TableRow><TableCell colSpan={5}>Aucun département configuré. Ajoutez un département.</TableCell></TableRow> : q.data?.map(d => <TableRow key={d.id} className="h-11"><TableCell>{d.code}</TableCell><TableCell>{d.label}</TableCell><TableCell><Switch aria-label={`Activer ${d.label}`} checked={d.is_active} disabled={save.isPending || d.is_default_dossier} onCheckedChange={is_active => save.mutate({ ...d, is_active })} /></TableCell><TableCell><Checkbox aria-label={`Département par défaut : ${d.label}`} checked={d.is_default_dossier} disabled={!d.is_active || def.isPending || d.is_default_dossier} onCheckedChange={checked => { if (checked) def.mutate(d.id); }} /></TableCell><TableCell><Button variant="ghost" size="icon" title={`Modifier ${d.label}`} onClick={() => setEditing(d)}><Pencil className="h-4 w-4" /></Button></TableCell></TableRow>)}
    </TableBody></Table>
    <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?.id ? 'Modifier le département' : 'Ajouter un département'}</DialogTitle></DialogHeader><form id="department-form" onSubmit={e => { e.preventDefault(); void submit(); }} className="space-y-4"><div><Label htmlFor="department-code">Code</Label><Input id="department-code" required value={editing?.code ?? ''} onChange={e => setEditing(v => ({ ...v, code: e.target.value }))} /></div><div><Label htmlFor="department-label">Libellé</Label><Input id="department-label" required value={editing?.label ?? ''} onChange={e => setEditing(v => ({ ...v, label: e.target.value }))} /></div><div className="flex gap-3 items-center"><Switch aria-label="Département actif" checked={editing?.is_active !== false} disabled={editing?.is_default_dossier} onCheckedChange={is_active => setEditing(v => ({ ...v, is_active }))} /><Label>Actif</Label></div></form><DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button><Button type="submit" form="department-form" disabled={save.isPending || !editing?.code?.trim() || !editing?.label?.trim()}>Enregistrer</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}