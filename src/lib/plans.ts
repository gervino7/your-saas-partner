// Les plans sont désormais stockés en base (table subscription_plans).
// Ce fichier ne conserve que les types et les formats d'affichage.

export type PlanId = string;

export interface Plan {
  id: string;
  code: PlanId;
  name: string;
  description: string | null;
  price_monthly: number;
  max_users: number;
  max_missions: number | null; // null = illimité
  max_storage_gb: number;
  max_clients: number | null;
  features: string[];
  is_active: boolean;
  is_public: boolean;
  sort_order: number | null;
}

export const UNLIMITED = 9_999_999;

export const formatFcfa = (n: number) =>
  n === 0 ? 'Gratuit' : `${Math.round(n).toLocaleString('fr-FR')} FCFA / mois`;

export const formatQuota = (n: number | null | undefined) =>
  n === null || n === undefined ? 'Illimité' : n.toLocaleString('fr-FR');

export const missionQuota = (p?: Plan | null) => p?.max_missions ?? UNLIMITED;

export const findPlan = (plans: Plan[], code?: string | null) =>
  plans.find((p) => p.code === code) ?? plans[0] ?? null;

export const nextPlan = (plans: Plan[], code?: string | null): Plan | null => {
  const idx = plans.findIndex((p) => p.code === code);
  if (idx < 0 || idx >= plans.length - 1) return null;
  return plans[idx + 1];
};
