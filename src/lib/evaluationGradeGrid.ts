import type { Database } from '@/integrations/supabase/types';
import { GRADE_LEVELS } from '@/types/database';

export type EvaluationGradeRow = Database['public']['Tables']['evaluation_grades']['Row'];
export const PRACTICES = ['comptable', 'conseil', 'juridique'] as const;
export const GRID_RANKS = Array.from({ length: 18 }, (_, i) => 18 - i);

export function canEditGradeGrid(gradeLevel: number | undefined, organizationId: string | null | undefined) {
  return !!organizationId && (gradeLevel === 1 || gradeLevel === 2);
}

export function validateGradeRow(row: EvaluationGradeRow, rows: readonly EvaluationGradeRow[]) {
  if (!row.organization_id) return 'Cabinet introuvable.';
  if (!PRACTICES.includes(row.practice)) return 'Choisissez une practice.';
  if (!Number.isInteger(row.rank) || row.rank < 1 || row.rank > 18) return 'Le rang doit être compris entre 1 et 18.';
  if (!row.echelon.trim()) return 'Renseignez le libellé de l’échelon.';
  if (!row.family.trim()) return 'Renseignez la famille.';
  if (!row.maps_to_grade || !Object.hasOwn(GRADE_LEVELS, row.maps_to_grade)) return 'Choisissez l’un des 8 grades.';
  const siblings = rows.filter(r => r.id !== row.id && r.organization_id === row.organization_id && r.practice === row.practice);
  if (siblings.some(r => r.rank === row.rank)) return 'Ce rang possède déjà un échelon dans cette practice.';
  if (siblings.some(r => r.echelon.trim() === row.echelon.trim())) return 'Ce libellé existe déjà dans cette practice.';
  return null;
}