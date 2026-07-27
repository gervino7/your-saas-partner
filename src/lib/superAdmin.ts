import { PLANS, PLAN_ORDER, PlanId } from '@/lib/plans';

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  org_viewed: "Consultation d'organisation",
  plan_changed: 'Changement de plan',
  org_suspended: 'Suspension',
  org_reactivated: 'Réactivation',
  user_search: 'Recherche utilisateur',
  org_updated: 'Mise à jour fiche',
};

export const auditLabel = (action: string) => AUDIT_ACTION_LABELS[action] ?? action;

export const planOf = (plan?: string | null): PlanId =>
  (plan && plan in PLANS ? plan : 'free') as PlanId;

export const priceOf = (plan?: string | null) => PLANS[planOf(plan)].price;

export const computeMrr = (orgs: { subscription_plan?: string | null; is_active?: boolean | null }[]) =>
  orgs.filter((o) => o.is_active !== false).reduce((sum, o) => sum + priceOf(o.subscription_plan), 0);

export const planBreakdown = (orgs: { subscription_plan?: string | null; is_active?: boolean | null }[]) =>
  PLAN_ORDER.map((id) => {
    const list = orgs.filter((o) => planOf(o.subscription_plan) === id);
    const active = list.filter((o) => o.is_active !== false);
    return {
      id,
      name: PLANS[id].name,
      price: PLANS[id].price,
      count: list.length,
      subtotal: active.length * PLANS[id].price,
    };
  });

export const nextPlanId = (plan?: string | null): PlanId => {
  const idx = PLAN_ORDER.indexOf(planOf(plan));
  return PLAN_ORDER[Math.min(idx + 1, PLAN_ORDER.length - 1)];
};

export const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

export const pctClass = (pct: number) =>
  pct >= 100 ? 'text-destructive' : pct >= 80 ? 'text-amber-600' : 'text-muted-foreground';

export const barClass = (pct: number) =>
  pct >= 100 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-primary';

export const daysUntil = (date?: string | null) => {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
};

export const daysSince = (date?: string | null) => {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
};

export const ALERT_META: Record<string, { label: string; className: string }> = {
  depassement: { label: 'Dépassement', className: 'bg-destructive text-destructive-foreground' },
  attention: { label: 'Attention', className: 'bg-amber-500 text-white' },
  ok: { label: 'OK', className: 'bg-emerald-600 text-white' },
};
