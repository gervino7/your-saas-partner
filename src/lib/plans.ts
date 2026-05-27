export type PlanId = "free" | "starter" | "pro" | "business";

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // FCFA / month
  maxUsers: number;
  maxMissions: number;
  maxStorageGb: number;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Gratuit",
    price: 0,
    maxUsers: 5,
    maxMissions: 1,
    maxStorageGb: 2,
    features: ["1 mission", "5 utilisateurs", "2 Go de stockage"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    price: 49000,
    maxUsers: 15,
    maxMissions: 5,
    maxStorageGb: 50,
    features: ["5 missions", "15 utilisateurs", "50 Go de stockage", "COPIL & CODIR"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 149000,
    maxUsers: 50,
    maxMissions: 25,
    maxStorageGb: 200,
    features: ["25 missions", "50 utilisateurs", "200 Go", "Tracking emails", "Timesheet"],
  },
  business: {
    id: "business",
    name: "Business",
    price: 299000,
    maxUsers: 200,
    maxMissions: 9999,
    maxStorageGb: 1024,
    features: ["Missions illimitées", "200 utilisateurs", "1 To", "Analytics avancées"],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "business"];

export const getNextPlan = (current: PlanId): Plan | null => {
  const idx = PLAN_ORDER.indexOf(current);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  return PLANS[PLAN_ORDER[idx + 1]];
};

export const formatFcfa = (n: number) => (n === 0 ? "Gratuit" : `${n.toLocaleString("fr-FR")} FCFA/mois`);

export const SUPER_ADMIN_EMAILS = [
  "gervais@abodje.com",
  "admin@d-gconseil.com",
  "info@abodje.com",
  "gkonan7@yahoo.com",
];
