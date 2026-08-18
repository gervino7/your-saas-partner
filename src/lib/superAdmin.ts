import type { Plan } from '@/lib/plans';

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  org_viewed: "Consultation d'organisation",
  plan_changed: 'Changement de plan',
  org_suspended: 'Suspension',
  org_reactivated: 'Réactivation',
  user_search: 'Recherche utilisateur',
  org_updated: 'Mise à jour fiche',
  org_diagnostic: 'Diagnostic organisation',
  org_fix: 'Action corrective',
  plan_upserted: 'Plan créé ou modifié',
};

export const auditLabel = (action: string) => AUDIT_ACTION_LABELS[action] ?? action;

/** Code de plan effectif d'une organisation, replié sur le premier plan connu. */
export const planOf = (plans: Plan[], plan?: string | null): string =>
  plans.some((p) => p.code === plan) ? (plan as string) : plans[0]?.code ?? 'free';

export const planByCode = (plans: Plan[], plan?: string | null): Plan | null =>
  plans.find((p) => p.code === plan) ?? plans[0] ?? null;

export const planNameOf = (plans: Plan[], plan?: string | null) =>
  planByCode(plans, plan)?.name ?? (plan ?? '—');

export const priceOf = (plans: Plan[], plan?: string | null) => planByCode(plans, plan)?.price_monthly ?? 0;

type OrgLike = { subscription_plan?: string | null; is_active?: boolean | null };

export const computeMrr = (plans: Plan[], orgs: OrgLike[]) =>
  orgs.filter((o) => o.is_active !== false).reduce((sum, o) => sum + priceOf(plans, o.subscription_plan), 0);

export const planBreakdown = (plans: Plan[], orgs: OrgLike[]) =>
  plans.map((p) => {
    const list = orgs.filter((o) => planOf(plans, o.subscription_plan) === p.code);
    const active = list.filter((o) => o.is_active !== false);
    return {
      id: p.code,
      name: p.name,
      price: p.price_monthly,
      count: list.length,
      subtotal: active.length * p.price_monthly,
    };
  });

export const nextPlanCode = (plans: Plan[], plan?: string | null): string => {
  const idx = plans.findIndex((p) => p.code === planOf(plans, plan));
  return plans[Math.min(idx + 1, plans.length - 1)]?.code ?? planOf(plans, plan);
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
