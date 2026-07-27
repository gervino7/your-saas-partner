import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PLANS, PLAN_ORDER, PlanId, formatFcfa } from '@/lib/plans';
import { planOf } from '@/lib/superAdmin';
import { useChangePlan } from '@/hooks/useSuperAdmin';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  org: {
    id: string;
    name: string;
    subscription_plan?: string | null;
    user_count?: number | null;
    storage_used_mb?: number | null;
  } | null;
  defaultPlan?: PlanId;
}

export default function PlanChangeDialog({ open, onOpenChange, org, defaultPlan }: Props) {
  const current = planOf(org?.subscription_plan);
  const [plan, setPlan] = useState<PlanId>(defaultPlan ?? current);
  const [maxUsers, setMaxUsers] = useState<number>(PLANS[defaultPlan ?? current].maxUsers);
  const [maxStorage, setMaxStorage] = useState<number>(PLANS[defaultPlan ?? current].maxStorageGb);
  const [reason, setReason] = useState('');
  const changePlan = useChangePlan();

  useEffect(() => {
    if (open) {
      const p = defaultPlan ?? current;
      setPlan(p);
      setMaxUsers(PLANS[p].maxUsers);
      setMaxStorage(PLANS[p].maxStorageGb);
      setReason('');
    }
  }, [open, defaultPlan, current]);

  const selectPlan = (p: PlanId) => {
    setPlan(p);
    setMaxUsers(PLANS[p].maxUsers);
    setMaxStorage(PLANS[p].maxStorageGb);
  };

  const usedUsers = Number(org?.user_count ?? 0);
  const usedGb = Number(org?.storage_used_mb ?? 0) / 1024;
  const downgradeUsers = usedUsers > maxUsers;
  const downgradeStorage = usedGb > maxStorage;

  const submit = () => {
    if (!org || reason.trim().length < 5) return;
    changePlan.mutate(
      {
        _org_id: org.id,
        _new_plan: plan,
        _max_users: maxUsers,
        _max_storage_gb: maxStorage,
        _new_price: PLANS[plan].price,
        _reason: reason.trim(),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Changer le plan — {org?.name}</DialogTitle>
          <DialogDescription>
            Plan actuel : {PLANS[current].name}. Les quotas sont pré-remplis mais restent modifiables.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectPlan(id)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  plan === id ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  {id === current && <span className="text-[10px] text-muted-foreground">Actuel</span>}
                  {plan === id && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground">{formatFcfa(p.price)}</p>
                <p className="text-xs text-muted-foreground">
                  {p.maxUsers} utilisateurs · {p.maxStorageGb} Go
                </p>
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mu">Utilisateurs max</Label>
            <Input id="mu" type="number" min={1} value={maxUsers} onChange={(e) => setMaxUsers(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms">Stockage max (Go)</Label>
            <Input id="ms" type="number" min={1} value={maxStorage} onChange={(e) => setMaxStorage(Number(e.target.value))} />
          </div>
        </div>

        {(downgradeUsers || downgradeStorage) && (
          <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Déclassement sous l'usage actuel</p>
              {downgradeUsers && <p>{usedUsers} utilisateurs actifs pour une limite de {maxUsers}.</p>}
              {downgradeStorage && <p>{usedGb.toFixed(1)} Go utilisés pour une limite de {maxStorage} Go.</p>}
              <p className="mt-1">Le changement sera refusé par la plateforme.</p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="reason">Motif (obligatoire)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex. Montée en gamme demandée par le cabinet"
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={reason.trim().length < 5 || changePlan.isPending}>
            Appliquer le changement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
