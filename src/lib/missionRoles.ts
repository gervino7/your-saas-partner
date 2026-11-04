interface MissionMembership {
  user_id: string;
  role: string | null;
}

export function isMissionAssociate(members: readonly MissionMembership[], userId: string | undefined) {
  return !!userId && members.some(member => member.user_id === userId && member.role === 'associe');
}

export function isMissionPilotRole(role: string | null) {
  return ['associe', 'directeur_mission', 'chef_mission'].includes(role ?? '');
}

export interface MissionRoleEligibility {
  role: string;
  libelle: string;
  autorise: boolean;
  motif: string;
}

export function isAuthorizedMissionRole(roles: readonly MissionRoleEligibility[], role: string) {
  return roles.some(option => option.role === role && option.autorise);
}