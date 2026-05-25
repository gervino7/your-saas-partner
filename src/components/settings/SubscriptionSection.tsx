import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { PLANS, PLAN_ORDER, PlanId, formatFcfa } from '@/lib/plans';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const SubscriptionSection = () => {
  const limits = useSubscriptionLimits();
  const orgId = useAuthStore((s) => s.profile?.organization_id);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PlanId>(limits.currentPlanId);

  const change = async () => {
    if (!orgId) return;
    const p = PLANS[selected];
    const { error } = await supabase
      .from('organizations')
      .update({ subscription_plan: selected, max_users: p.maxUsers, max_storage_gb: p.maxStorageGb })
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
            Plan actuel : <Badge variant="outline" className="ml-1">{plan.name}</Badge> — {formatFcfa(plan.price)}
          </CardDescription>
        </div>
        <Button onClick={() => setOpen(true)}>Changer de plan</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1"><span>Utilisateurs</span><span>{userCount} / {plan.maxUsers}</span></div>
          <Progress value={usagePercent.users} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1"><span>Missions</span><span>{missionCount} / {plan.maxMissions}</span></div>
          <Progress value={usagePercent.missions} />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1"><span>Stockage</span><span>{storageGb.toFixed(2)} / {plan.maxStorageGb} Go</span></div>
          <Progress value={usagePercent.storage} />
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Choisir un plan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLAN_ORDER.map((pid) => {
              const p = PLANS[pid];
              const sel = selected === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setSelected(pid)}
                  className={`text-left rounded-lg border-2 p-4 transition-all ${sel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-sm text-muted-foreground">{formatFcfa(p.price)}</p>
                    </div>
                    {sel && <Check className="h-5 w-5 text-primary" />}
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {p.features.map((f) => <li key={f}>• {f}</li>)}
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
