import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCreateTask } from '@/hooks/useProject';

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
}

export default function TaskFormDialog({ open, onOpenChange, projectId, members, activities, tasks }: TaskFormDialogProps) {
  const createTask = useCreateTask();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'todo', priority: 'medium', assigned_to: [] },
  });

  const onSubmit = (values: FormValues) => {
    createTask.mutate(
      { ...values, title: values.title, project_id: projectId },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Nouvelle tâche</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            {tasks.length > 0 && (
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

            {members.length > 0 && (
              <FormField control={form.control} name="assigned_to" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigné à</FormLabel>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                    {members.map((m: any) => {
                      const selected = field.value?.includes(m.user?.id);
                      return (
                        <button
                          type="button"
                          key={m.user?.id}
                          onClick={() => {
                            const id = m.user?.id;
                            if (selected) {
                              field.onChange(field.value.filter((v: string) => v !== id));
                            } else {
                              field.onChange([...(field.value || []), id]);
                            }
                          }}
                          className={`px-2 py-1 rounded-full text-xs transition-colors ${
                            selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {m.user?.full_name}
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? 'Création...' : 'Créer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
