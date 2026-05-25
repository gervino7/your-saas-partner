import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PLANS, PLAN_ORDER, PlanId, SUPER_ADMIN_EMAILS } from '@/lib/plans';
import { Building2, Users, Briefcase, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const email = useAuthStore((s) => s.user?.email);
  const isSuper = !!email && SUPER_ADMIN_EMAILS.includes(email);

  useEffect(() => {
    if (profile && !isSuper) navigate('/', { replace: true });
  }, [profile, isSuper, navigate]);

  const { data: orgs = [] } = useQuery({
    queryKey: ['super-admin-orgs'],
    enabled: isSuper,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_get_all_orgs');
      if (error) throw error;
      return data ?? [];
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: PlanId }) => {
      const p = PLANS[plan];
      const { error } = await supabase
        .from('organizations')
        .update({ subscription_plan: plan, max_users: p.maxUsers, max_storage_gb: p.maxStorageGb })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Plan mis à jour' });
      qc.invalidateQueries({ queryKey: ['super-admin-orgs'] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  if (!isSuper) {
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Accès refusé</h1>
        <p className="text-muted-foreground">Cette zone est réservée aux super-administrateurs.</p>
      </div>
    );
  }

  const totalUsers = orgs.reduce((s: number, o: any) => s + Number(o.user_count || 0), 0);
  const totalMissions = orgs.reduce((s: number, o: any) => s + Number(o.mission_count || 0), 0);
  const mrr = orgs.reduce((s: number, o: any) => s + (PLANS[o.subscription_plan as PlanId]?.price ?? 0), 0);

  const stats = [
    { label: 'Organisations', value: orgs.length, icon: Building2 },
    { label: 'Utilisateurs', value: totalUsers, icon: Users },
    { label: 'Missions', value: totalMissions, icon: Briefcase },
    { label: 'MRR', value: `${mrr.toLocaleString('fr-FR')} FCFA`, icon: DollarSign },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Super Administration — Mission-DGC</h1>
        <p className="text-muted-foreground">Vue cross-organisations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Toutes les organisations</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Utilisateurs</TableHead>
                <TableHead>Missions</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell><Badge variant="outline">{PLANS[o.subscription_plan as PlanId]?.name ?? o.subscription_plan}</Badge></TableCell>
                  <TableCell>{o.user_count} / {o.max_users}</TableCell>
                  <TableCell>{o.mission_count}</TableCell>
                  <TableCell>{format(new Date(o.created_at), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Select
                      value={o.subscription_plan}
                      onValueChange={(v) => updatePlan.mutate({ id: o.id, plan: v as PlanId })}
                    >
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PLAN_ORDER.map((p) => <SelectItem key={p} value={p}>{PLANS[p].name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminPage;
