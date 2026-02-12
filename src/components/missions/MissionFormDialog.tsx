import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateMission, useUpdateMission, useOrganizationUsers, useClients } from '@/hooks/useMissions';
import { MISSION_TYPE_LABELS, CURRENCY_LABELS } from '@/types/database';
import type { MissionType, Currency } from '@/types/database';

const missionSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(200),
  description: z.string().max(2000).optional(),
  type: z.string().optional(),
  client_id: z.string().optional(),
  director_id: z.string().optional(),
  chief_id: z.string().optional(),
  budget_amount: z.coerce.number().min(0).optional(),
  budget_currency: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  priority: z.string().optional(),
});

type MissionFormValues = z.infer<typeof missionSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission?: any; // If provided, edit mode
}

export default function MissionFormDialog({ open, onOpenChange, mission }: Props) {
  const createMission = useCreateMission();
  const updateMission = useUpdateMission();
  const { data: users = [] } = useOrganizationUsers();
  const { data: clients = [] } = useClients();

  const isEdit = !!mission;

  const form = useForm<MissionFormValues>({
    resolver: zodResolver(missionSchema),
    defaultValues: {
      name: mission?.name ?? '',
      description: mission?.description ?? '',
      type: mission?.type ?? '',
      client_id: mission?.client_id ?? '',
      director_id: mission?.director_id ?? '',
      chief_id: mission?.chief_id ?? '',
      budget_amount: mission?.budget_amount ?? undefined,
      budget_currency: mission?.budget_currency ?? 'XOF',
      start_date: mission?.start_date ?? '',
      end_date: mission?.end_date ?? '',
      priority: mission?.priority ?? 'medium',
    },
  });

  const onSubmit = async (values: MissionFormValues) => {
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v !== undefined)
    );

    if (isEdit) {
      await updateMission.mutateAsync({ id: mission.id, ...cleaned });
    } else {
      await createMission.mutateAsync(cleaned as any);
    }
    onOpenChange(false);
    form.reset();
  };

  const directors = users.filter((u: any) => u.grade_level && u.grade_level <= 2);
  const chiefs = users.filter((u: any) => u.grade_level && u.grade_level <= 3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? 'Modifier la mission' : 'Nouvelle mission'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nom de la mission *</FormLabel>
                <FormControl><Input placeholder="Audit des comptes 2025" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea placeholder="Description de la mission..." rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de mission</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(MISSION_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
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

            <FormField control={form.control} name="client_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="director_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Directeur de Mission</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {directors.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.grade})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="chief_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Chef de Mission</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {chiefs.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.grade})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="budget_amount" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Budget</FormLabel>
                  <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="budget_currency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Devise</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(CURRENCY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
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
              <Button type="submit" disabled={createMission.isPending || updateMission.isPending}>
                {createMission.isPending || updateMission.isPending ? 'En cours...' : isEdit ? 'Mettre à jour' : 'Créer la mission'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
