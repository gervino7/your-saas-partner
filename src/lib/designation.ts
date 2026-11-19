// Mirrors the server rule for display only; assign_evaluator remains authoritative.
export const NIVEAU_ROLE: Record<string, number> = {
  associe: 1, directeur_mission: 2, chef_mission: 3,
  auditeur_experimente: 4, auditeur: 5, auditeur_junior: 6,
};
export type MembreEquipe = { user_id: string; role: string };
/** Un évaluateur de mission domine strictement l'évalué par son rôle (le rôle prime sur le grade). */
export function evaluateursDeMission<T extends MembreEquipe>(equipe: T[], evalue?: MembreEquipe): T[] {
  if (!evalue || NIVEAU_ROLE[evalue.role] == null) return [];
  return equipe.filter(m => m.user_id !== evalue.user_id && NIVEAU_ROLE[m.role] != null && NIVEAU_ROLE[m.role] < NIVEAU_ROLE[evalue.role]);
}
/** Hors mission, le grade décide (niveau strictement plus petit). */
export function evaluateursParGrade<T extends { id: string; grade_level?: number | null }>(users: T[], evalue?: T): T[] {
  if (!evalue) return [];
  return users.filter(u => u.id !== evalue.id && (u.grade_level ?? 8) < (evalue.grade_level ?? 0));
}
