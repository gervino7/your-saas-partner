import { describe, expect, it } from 'vitest';
import { isMissionAssociate, isMissionPilotRole, isAuthorizedMissionRole } from '@/lib/missionRoles';
import { STAFFING_ROLES, STAFFING_STATUS } from '@/lib/staffing';
import { GRADE_LEVELS, MISSION_MEMBER_ROLE_LABELS } from '@/types/database';

describe('Référentiel mission et staffing', () => {
  it('uses exactly the six database roles for both teams and staffing', () => {
    const roles = ['associe', 'auditeur', 'auditeur_experimente', 'auditeur_junior', 'chef_mission', 'directeur_mission'];
    expect(Object.keys(MISSION_MEMBER_ROLE_LABELS).sort()).toEqual(roles);
    expect(Object.keys(STAFFING_ROLES).sort()).toEqual(roles);
  });
  it('supports only active and cancelled assignments', () => {
    expect(Object.keys(STAFFING_STATUS).sort()).toEqual(['accepted', 'cancelled']);
  });
  it('reserves removal to the current mission associate, not its director', () => {
    const mission = [{ user_id: 'associate', role: 'associe' }, { user_id: 'director', role: 'directeur_mission' }];
    expect(isMissionAssociate(mission, 'associate')).toBe(true);
    expect(isMissionAssociate(mission, 'director')).toBe(false);
    expect(isMissionAssociate(mission, 'other-mission-associate')).toBe(false);
    expect(isMissionAssociate(mission, undefined)).toBe(false);
    expect(isMissionAssociate([], 'associate')).toBe(false);
  });
  it('recognizes the three mission pilot roles, not project roles or legacy roles', () => {
    for (const role of ['associe', 'directeur_mission', 'chef_mission']) expect(isMissionPilotRole(role)).toBe(true);
    for (const role of ['auditeur_experimente', 'auditeur', 'auditeur_junior', 'chef', 'lead', 'member', null]) expect(isMissionPilotRole(role)).toBe(false);
  });
  it('preserves all eight grade codes and levels, including CM', () => {
    expect(GRADE_LEVELS).toEqual({ DA: 1, DM: 2, CM: 3, SUP: 4, AS: 5, AUD: 6, AJ: 7, STG: 8 });
  });
  const rpcRoles = (allowed: string[]) => Object.keys(STAFFING_ROLES).map(role => ({ role, libelle: role, autorise: allowed.includes(role), motif: allowed.includes(role) ? 'autorise' : 'grade insuffisant' }));
  it('allows only junior for the trainee RPC response', () => {
    const roles = rpcRoles(['auditeur_junior']);
    expect(Object.keys(STAFFING_ROLES).filter(r => isAuthorizedMissionRole(roles, r))).toEqual(['auditeur_junior']);
  });
  it('allows only associate and director for the DA RPC response', () => {
    const roles = rpcRoles(['associe', 'directeur_mission']);
    expect(Object.keys(STAFFING_ROLES).filter(r => isAuthorizedMissionRole(roles, r))).toEqual(['associe', 'directeur_mission']);
  });
  it('fails closed without a completed grade or without RPC data', () => {
    const roles = rpcRoles([]).map(r => ({ ...r, motif: 'grade ou echelon non renseigne' }));
    expect(isAuthorizedMissionRole(roles, 'auditeur')).toBe(false);
    expect(isAuthorizedMissionRole([], 'auditeur_junior')).toBe(false);
  });
});