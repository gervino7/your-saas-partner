import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject, useProjectMembers } from '@/hooks/useProject';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, Trash2, Archive, AlertTriangle, Calendar, DollarSign, Users, Info } from 'lucide-react';
import Loading from '@/components/common/Loading';
import { useNavigate } from 'react-router-dom';

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planification' },
  { value: 'active', label: 'Actif' },
  { value: 'on_hold', label: 'En pause' },
  { value: 'review', label: 'En revue' },
  { value: 'completed', label: 'Terminé' },
  { value: 'archived', label: 'Archivé' },
];

export default function ProjectSettingsTab({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useProject(projectId);
  const { data: members } = useProjectMembers(projectId);
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const gradeLevel = profile?.grade_level ?? 8;
  const canEdit = gradeLevel <= 3;

  const [form, setForm] = useState<Record<string, any> | null>(null);

  // Initialize form when project loads
  const formData = form ?? {
    name: project?.name ?? '',
    description: project?.description ?? '',
    code: project?.code ?? '',
    status: project?.status ?? 'planning',
    start_date: project?.start_date ?? '',
    end_date: project?.end_date ?? '',
    budget_allocated: project?.budget_allocated ?? '',
    lead_id: project?.lead_id ?? '',
  };

  const setField = (key: string, value: any) => {
    setForm({ ...formData, [key]: value });
  };

  const updateProject = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { data, error } = await supabase
        .from('projects')
        .update(values)
        .eq('id', projectId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projet mis à jour avec succès');
      setForm(null);
    },
    onError: (e: Error) => toast.error(`Erreur: ${e.message}`),
  });

  const deleteProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projet supprimé');
      navigate(`/missions/${project?.mission_id}`);
    },
    onError: (e: Error) => toast.error(`Erreur: ${e.message}`),
  });

  const handleSave = () => {
    const payload: Record<string, any> = {};
    if (formData.name !== project?.name) payload.name = formData.name;
    if (formData.description !== (project?.description ?? '')) payload.description = formData.description || null;
    if (formData.code !== (project?.code ?? '')) payload.code = formData.code || null;
    if (formData.status !== project?.status) payload.status = formData.status;
    if (formData.start_date !== (project?.start_date ?? '')) payload.start_date = formData.start_date || null;
    if (formData.end_date !== (project?.end_date ?? '')) payload.end_date = formData.end_date || null;
    if (formData.lead_id !== (project?.lead_id ?? '')) payload.lead_id = formData.lead_id || null;

    const budgetVal = formData.budget_allocated === '' ? null : Number(formData.budget_allocated);
    if (budgetVal !== (project?.budget_allocated ?? null)) payload.budget_allocated = budgetVal;

    if (Object.keys(payload).length === 0) {
      toast.info('Aucune modification détectée');
      return;
    }
    updateProject.mutate(payload);
  };

  if (isLoading) return <Loading />;
  if (!project) return null;

  // Get org members for lead selection
  const orgMembers = members?.map((m: any) => m.user).filter(Boolean) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      {!canEdit && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 flex items-center gap-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Vous n'avez pas les droits pour modifier les paramètres du projet.
        </div>
      )}

      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-primary" />
            Informations générales
          </CardTitle>
          <CardDescription>Nom, code et description du projet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du projet *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setField('name', e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setField('code', e.target.value)}
                disabled={!canEdit}
                placeholder="PRJ-2026-001"
                className="tabular-nums"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setField('description', e.target.value)}
              disabled={!canEdit}
              rows={3}
              placeholder="Décrivez l'objectif du projet..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Status & Lead */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Statut et responsable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setField('status', v)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chef de projet</Label>
              <Select
                value={formData.lead_id}
                onValueChange={(v) => setField('lead_id', v)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un responsable" />
                </SelectTrigger>
                <SelectContent>
                  {orgMembers.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name} {m.grade ? `(${m.grade})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Planification
          </CardTitle>
          <CardDescription>Dates de début et de fin du projet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Date de début</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Date de fin</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setField('end_date', e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            Budget
          </CardTitle>
          <CardDescription>Budget alloué au projet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="budget">Montant alloué (FCFA)</Label>
            <Input
              id="budget"
              type="number"
              min={0}
              value={formData.budget_allocated}
              onChange={(e) => setField('budget_allocated', e.target.value)}
              disabled={!canEdit}
              placeholder="0"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateProject.isPending} className="gap-2">
            <Save className="h-4 w-4" />
            {updateProject.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      )}

      {/* Danger Zone */}
      {gradeLevel <= 2 && (
        <>
          <Separator />
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Zone de danger
              </CardTitle>
              <CardDescription>Ces actions sont irréversibles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-destructive/20 p-4">
                <div>
                  <p className="font-medium text-sm">Archiver le projet</p>
                  <p className="text-xs text-muted-foreground">Le projet sera masqué des vues actives.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-warning/50 text-warning hover:bg-warning/10"
                  onClick={() => {
                    updateProject.mutate({ status: 'archived' });
                  }}
                  disabled={project.status === 'archived'}
                >
                  <Archive className="h-4 w-4" />
                  {project.status === 'archived' ? 'Déjà archivé' : 'Archiver'}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-destructive/20 p-4">
                <div>
                  <p className="font-medium text-sm">Supprimer le projet</p>
                  <p className="text-xs text-muted-foreground">Supprime le projet et toutes ses tâches, activités et fichiers.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-1.5">
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer « {project.name} » ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Toutes les tâches, activités, fichiers et données associées seront définitivement supprimés.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteProject.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Supprimer définitivement
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
