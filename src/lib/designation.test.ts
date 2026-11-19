import { describe, it, expect } from 'vitest';
import { evaluateursDeMission, evaluateursParGrade } from './designation';
describe('désignation des évaluateurs', () => {
  it('les rôles supérieurs de l\'équipe sont proposés', () => {
    const equipe = [{ user_id: 'cm', role: 'chef_mission' }, { user_id: 'aud', role: 'auditeur' }, { user_id: 'dm', role: 'directeur_mission' }];
    expect(evaluateursDeMission(equipe, { user_id: 'aud', role: 'auditeur' }).map(m => m.user_id)).toEqual(['cm', 'dm']);
  });
  it('le rôle prime sur le grade : le chef de mission évalue un auditeur expérimenté de grade supérieur', () => {
    const equipe = [{ user_id: 'cm', role: 'chef_mission', grade_level: 5 }, { user_id: 'x', role: 'auditeur_experimente', grade_level: 2 }];
    expect(evaluateursDeMission(equipe, equipe[1]).map(m => m.user_id)).toEqual(['cm']);
  });
  it('à rôle égal, personne ne domine', () => {
    const equipe = [{ user_id: 'a', role: 'auditeur' }, { user_id: 'b', role: 'auditeur' }];
    expect(evaluateursDeMission(equipe, equipe[0])).toEqual([]);
  });
  it('annuelle : grade strictement supérieur', () => {
    const u = [{ id: 'a', grade_level: 2 }, { id: 'b', grade_level: 4 }, { id: 'c', grade_level: 4 }];
    expect(evaluateursParGrade(u, u[1]).map(x => x.id)).toEqual(['a']);
  });
});
