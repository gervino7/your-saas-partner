import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { formatFcfa, formatQuota, findPlan } from '@/lib/plans';
import { usePlans } from '@/hooks/usePlans';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const SubscriptionSection = () => {
  const limits = useSubscriptionLimits();
  const { data: plans = [] } = usePlans();
  const orgId = useAuthStore((s) => s.profile?.organization_id);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(limits.currentPlanId);

  useEffect(() => setSelected(limits.currentPlanId), [limits.currentPlanId]);

  const change = async () => {
    if (!orgId) return;
    const p = findPlan(plans, selected);
    if (!p) return;
    const { error } = await supabase
      .from('organizations')
      .update({ subscription_plan: p.code, max_users: p.max_users, max_storage_gb: p.max_storage_gb })
      .eq('id', orgId);
    if (error) toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Plan mis à jour', description: `Vous êtes maintenant sur ${p.name}` });
      qc.invalidateQueries({ queryKey: ['subscription-limits'] });
      setOpen(false);
    }
  };

  const { plan, userCount, missionCount, storageGb, usagePercent } = limits;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Mon abonnement</CardTitle>
          <CardDescription>
            Plan actuel : <Badge variant="outline" className="ml-1">{plan.name}</Badge> - {formatFcfa(plan.price_monthly)}
          </CardDescription>
        </div>
        <Button onClick={() => setOpen(true)}>Changer de plan</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-sm"><span>Utilisateurs</span><span>{userCount} / {plan.max_users}</span></div>
          <Progress value={usagePercent.users} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm"><span>Missions</span><span>{missionCount} / {formatQuota(plan.max_missions)}</span></div>
          <Progress value={usagePercent.missions} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm"><span>Stockage</span><span>{storageGb.toFixed(2)} / {plan.max_storage_gb} Go</span></div>
          <Progress value={usagePercent.storage} />
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Choisir un plan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {plans.map((p) => {
              const sel = selected === p.code;
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setSelected(p.code)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${sel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-sm text-muted-foreground">{formatFcfa(p.price_monthly)}</p>
                    </div>
                    {sel && <Check className="h-5 w-5 text-primary" />}
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {(p.features ?? []).map((f) => <li key={f}>• {f}</li>)}
                  </ul>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={change} disabled={selected === limits.currentPlanId}>Confirmer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SubscriptionSection;
