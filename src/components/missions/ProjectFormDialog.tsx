import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProject, useUpdateProject, useOrganizationUsers } from '@/hooks/useMissions';
import { Info, CalendarDays } from 'lucide-react';

const projectSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(200),
  description: z.string().max(2000).optional(),
  lead_id: z.string().optional(),
  budget_allocated: z.coerce.number().min(0).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missionId: string;
  project?: any;
}

function SectionHeader({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider pb-2 mb-3 border-b border-amber-200/60 dark:border-amber-800/30 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

export default function ProjectFormDialog({ open, onOpenChange, missionId, project }: Props) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { data: users = [] } = useOrganizationUsers();
  const isEdit = !!project;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', description: '', lead_id: '', budget_allocated: undefined, start_date: '', end_date: '' },
  });

  useEffect(() => {
    if (project && open) {
      form.reset({ name: project.name || '', description: project.description || '', lead_id: project.lead_id || '', budget_allocated: project.budget_allocated ?? undefined, start_date: project.start_date || '', end_date: project.end_date || '' });
    } else if (!project && open) {
      form.reset({ name: '', description: '', lead_id: '', budget_allocated: undefined, start_date: '', end_date: '' });
    }
  }, [project, open]);

  const onSubmit = async (values: ProjectFormValues) => {
    const cleaned = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '' && v !== undefined));
    if (isEdit) {
      await updateProject.mutateAsync({ id: project.id, ...cleaned });
    } else {
      await createProject.mutateAsync({ ...cleaned, mission_id: missionId } as any);
    }
    onOpenChange(false);
    form.reset();
  };

  const leads = users.filter((u: any) => u.grade_level && u.grade_level <= 4);
  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-5 py-4 space-y-3 overflow-y-auto max-h-[65vh] bg-amber-50/70 dark:bg-amber-950/10">
              <div>
                <SectionHeader icon={Info} label="Informations générales" />
                <div className="space-y-3">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du projet *</FormLabel>
                      <FormControl><Input placeholder="Revue des processus comptables" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Description du projet..." rows={3} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <FormField control={form.control} name="lead_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chef de projet</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {leads.map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.grade})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="budget_allocated" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget alloué (FCFA)</FormLabel>
                        <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>

              <div>
                <SectionHeader icon={CalendarDays} label="Planification" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de début</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="end_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date de fin</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border/40 bg-muted/30 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="h-9 px-4" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" className="h-9 px-5" disabled={isPending}>
                {isPending ? (isEdit ? 'Mise à jour...' : 'Création...') : (isEdit ? 'Enregistrer' : 'Créer le projet')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
