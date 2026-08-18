import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatFcfa, formatQuota } from '@/lib/plans';
import { usePlans } from '@/hooks/usePlans';
import { planByCode, planNameOf } from '@/lib/superAdmin';
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
  defaultPlan?: string;
}

export default function PlanChangeDialog({ open, onOpenChange, org, defaultPlan }: Props) {
  const { data: plans = [] } = usePlans();
  const current = org?.subscription_plan ?? plans[0]?.code ?? 'free';
  const [plan, setPlan] = useState<string>(defaultPlan ?? current);
  const [maxUsers, setMaxUsers] = useState<number>(0);
  const [maxStorage, setMaxStorage] = useState<number>(0);
  const [reason, setReason] = useState('');
  const changePlan = useChangePlan();

  useEffect(() => {
    if (!open || plans.length === 0) return;
    const code = defaultPlan ?? current;
    const p = planByCode(plans, code);
    setPlan(code);
    setMaxUsers(p?.max_users ?? 5);
    setMaxStorage(p?.max_storage_gb ?? 2);
    setReason('');
  }, [open, defaultPlan, current, plans]);

  const selectPlan = (code: string) => {
    const p = planByCode(plans, code);
    setPlan(code);
    setMaxUsers(p?.max_users ?? 5);
    setMaxStorage(p?.max_storage_gb ?? 2);
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
        _new_price: planByCode(plans, plan)?.price_monthly ?? 0,
        _reason: reason.trim(),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Changer le plan — {org?.name}</DialogTitle>
          <DialogDescription>
            Plan actuel : {planNameOf(plans, current)}. Les quotas sont pré-remplis mais restent modifiables.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => (
            <button
              key={p.code}
              type="button"
              onClick={() => selectPlan(p.code)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                plan === p.code ? 'border-primary bg-primary/5' : 'hover:bg-muted',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                {p.code === current && <span className="text-[10px] text-muted-foreground">Actuel</span>}
                {plan === p.code && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-sm text-muted-foreground">{formatFcfa(p.price_monthly)}</p>
              <p className="text-xs text-muted-foreground">
                {p.max_users} utilisateurs · {formatQuota(p.max_missions)} missions · {p.max_storage_gb} Go
              </p>
            </button>
          ))}
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
