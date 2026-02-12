import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProject, useOrganizationUsers } from '@/hooks/useMissions';

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
}

export default function ProjectFormDialog({ open, onOpenChange, missionId }: Props) {
  const createProject = useCreateProject();
  const { data: users = [] } = useOrganizationUsers();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      lead_id: '',
      budget_allocated: undefined,
      start_date: '',
      end_date: '',
    },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined)
    );

    await createProject.mutateAsync({
      ...cleaned,
      mission_id: missionId,
    } as any);
    onOpenChange(false);
    form.reset();
  };

  // Leads can be grade <= 4 (Superviseur and above)
  const leads = users.filter((u: any) => u.grade_level && u.grade_level <= 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Nouveau projet</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? 'Création...' : 'Créer le projet'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
