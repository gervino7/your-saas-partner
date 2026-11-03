export const STAFFING_ROLES = {
  associe: { label: 'Associé', color: 'navy' },
  directeur_mission: { label: 'Directeur de mission', color: 'navy' },
  chef_mission: { label: 'Chef de mission', color: 'copper' },
  auditeur_experimente: { label: 'Auditeur expérimenté', color: 'blue' },
  auditeur: { label: 'Auditeur', color: 'slate' },
} as const;

export type StaffingRole = keyof typeof STAFFING_ROLES;

export const STAFFING_STATUS = {
  accepted: { label: 'Active', color: 'green' },
  cancelled: { label: 'Annulée', color: 'gray' },
} as const;

export type StaffingStatus = keyof typeof STAFFING_STATUS;

export const ROLE_BADGE_CLASSES: Record<StaffingRole, string> = {
  associe: 'bg-primary/10 text-primary border-primary/30',
  directeur_mission: 'bg-primary/10 text-primary border-primary/30',
  chef_mission: 'bg-accent/10 text-accent border-accent/30',
  auditeur_experimente: 'bg-info/10 text-info border-info/30',
  auditeur: 'bg-muted text-muted-foreground border-border',
};

export const STATUS_BADGE_CLASSES: Record<StaffingStatus, string> = {
  accepted: 'bg-success/10 text-success border-success/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};
