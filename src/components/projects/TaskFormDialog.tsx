import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCreateTask, useUpdateTask } from '@/hooks/useProject';
import { Info, CalendarDays, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  title: z.string().min(1, 'Titre requis').default(''),
  description: z.string().optional(),
  status: z.string().default('todo'),
  priority: z.string().default('medium'),
  due_date: z.string().optional(),
  start_date: z.string().optional(),
  estimated_hours: z.coerce.number().optional(),
  compartment: z.string().optional(),
  activity_id: z.string().optional(),
  parent_task_id: z.string().optional(),
  assigned_to: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof schema>;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  members: any[];
  activities: any[];
  tasks: any[];
  taskToEdit?: any;
}

function SectionHeader({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider pb-2 mb-3 border-b border-amber-200/60 dark:border-amber-800/30 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

export default function TaskFormDialog({ open, onOpenChange, projectId, members, activities, tasks, taskToEdit }: TaskFormDialogProps) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isEditing = !!taskToEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'todo', priority: 'medium', assigned_to: [] },
  });

  const assignableMembers = useMemo(() => {
    const seen = new Set<string>();
    return members
      .map((member: any) => {
        const id = member.user?.id ?? member.user_id ?? '';
        const name = member.user?.full_name ?? member.user?.email ?? `Utilisateur ${id.slice(0, 8)}`;
        return { id, name };
      })
      .filter((member: { id: string }) => {
        if (!member.id || seen.has(member.id)) return false;
        seen.add(member.id);
        return true;
      });
  }, [members]);

  useEffect(() => {
    if (taskToEdit && open) {
      form.reset({
        title: taskToEdit.title ?? '', description: taskToEdit.description ?? '',
        status: taskToEdit.status ?? 'todo', priority: taskToEdit.priority ?? 'medium',
        due_date: taskToEdit.due_date ?? '', start_date: taskToEdit.start_date ?? '',
        estimated_hours: taskToEdit.estimated_hours ?? undefined, compartment: taskToEdit.compartment ?? '',
        activity_id: taskToEdit.activity_id ?? '', parent_task_id: taskToEdit.parent_task_id ?? '',
        assigned_to: taskToEdit.assignments?.map((a: any) => a.user?.id || a.user_id).filter(Boolean) ?? [],
      });
    } else if (!taskToEdit && open) {
      form.reset({ status: 'todo', priority: 'medium', assigned_to: [] });
    }
  }, [taskToEdit, open]);

  const onSubmit = (values: FormValues) => {
    if (isEditing) {
      const { assigned_to, ...taskValues } = values;
      updateTask.mutate({ id: taskToEdit.id, assigned_to, ...taskValues }, { onSuccess: () => { form.reset(); onOpenChange(false); } });
    } else {
      createTask.mutate({ ...values, title: values.title, project_id: projectId }, { onSuccess: () => { form.reset(); onOpenChange(false); } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-5 py-4 space-y-3 overflow-y-auto max-h-[65vh] dialog-form-bg">
              <div>
                <SectionHeader icon={Info} label="Informations générales" />
                <div className="space-y-3">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre *</FormLabel>
                      <FormControl><Input placeholder="Nom de la tâche" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Détails de la tâche..." rows={3} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="todo">À faire</SelectItem>
                            <SelectItem value="in_progress">En cours</SelectItem>
                            <SelectItem value="in_review">En revue</SelectItem>
                            <SelectItem value="correction">Correction</SelectItem>
                            <SelectItem value="validated">Validé</SelectItem>
                            <SelectItem value="completed">Terminé</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priorité</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="low">Basse</SelectItem>
                            <SelectItem value="medium">Moyenne</SelectItem>
                            <SelectItem value="high">Haute</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
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

                  <FormField control={form.control} name="due_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date limite</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="estimated_hours" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heures estimées</FormLabel>
                      <FormControl><Input type="number" min={0} step={0.5} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="compartment" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compartiment</FormLabel>
                      <FormControl><Input placeholder="ex: Comptabilité" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div>
                <SectionHeader icon={Settings} label="Rattachement & Assignation" />
                <div className="space-y-3">
                  {activities.length > 0 && (
                    <FormField control={form.control} name="activity_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Activité parente</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {activities.map((a: any) => (
                              <SelectItem key={a.id} value={a.id}>{'  '.repeat(a.depth ?? 0)}{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {tasks.length > 0 && !isEditing && (
                    <FormField control={form.control} name="parent_task_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tâche parente (sous-tâche)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {tasks.map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <FormField control={form.control} name="assigned_to" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigner à</FormLabel>
                      {assignableMembers.length > 0 ? (
                        <div className="border border-border rounded-md p-3 bg-card max-h-48 overflow-y-auto space-y-2">
                          {assignableMembers.map((member) => {
                            const checked = field.value?.includes(member.id);
                            return (
                              <label
                                key={member.id}
                                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded-md transition-colors"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    if (isChecked) {
                                      field.onChange([...(field.value || []), member.id]);
                                    } else {
                                      field.onChange((field.value || []).filter((v: string) => v !== member.id));
                                    }
                                  }}
                                />
                                <span className="text-sm">{member.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 rounded-md border border-dashed border-border text-xs text-muted-foreground bg-muted/20">
                          Aucun membre assignable trouvé. Ajoutez des membres dans l'onglet Équipe.
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-amber-300/40 dialog-footer-bg flex items-center justify-end gap-2">
              <Button variant="outline" type="button" size="sm" className="h-9 px-4" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" size="sm" className="h-9 px-5" disabled={createTask.isPending || updateTask.isPending}>
                {(createTask.isPending || updateTask.isPending) ? (isEditing ? 'Mise à jour...' : 'Création...') : (isEditing ? 'Enregistrer' : 'Créer')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

