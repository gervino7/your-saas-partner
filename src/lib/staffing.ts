export const STAFFING_ROLES = {
  directeur_mission: { label: 'Directeur de mission', color: 'navy' },
  chef_projet: { label: 'Chef de projet', color: 'copper' },
  superviseur: { label: 'Superviseur', color: 'blue' },
  collaborateur: { label: 'Collaborateur', color: 'slate' },
} as const;

export type StaffingRole = keyof typeof STAFFING_ROLES;

export const STAFFING_STATUS = {
  proposed: { label: 'Proposée', color: 'amber' },
  accepted: { label: 'Acceptée', color: 'green' },
  adjustment_requested: { label: 'Ajustement demandé', color: 'orange' },
  cancelled: { label: 'Annulée', color: 'gray' },
} as const;

export type StaffingStatus = keyof typeof STAFFING_STATUS;

export const ROLE_BADGE_CLASSES: Record<StaffingRole, string> = {
  directeur_mission: 'bg-[#16519C]/10 text-[#16519C] border-[#16519C]/30',
  chef_projet: 'bg-[#E67433]/10 text-[#E67433] border-[#E67433]/30',
  superviseur: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  collaborateur: 'bg-slate-500/10 text-slate-700 border-slate-500/30',
};

export const STATUS_BADGE_CLASSES: Record<StaffingStatus, string> = {
  proposed: 'bg-amber-100 text-amber-800 border-amber-300',
  accepted: 'bg-green-100 text-green-800 border-green-300',
  adjustment_requested: 'bg-orange-100 text-orange-800 border-orange-300',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-300',
};
