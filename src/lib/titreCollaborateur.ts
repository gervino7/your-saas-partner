import { GRADE_LABELS } from '@/types/database';

// Le titre d'un collaborateur, tel qu'il se nomme dans son cabinet.
// L'échelon fait foi ; le libellé du code n'est qu'un repli.
export function titreDuCollaborateur(p: { grade_echelon?: string | null; grade?: string | null }): string {
  const e = p.grade_echelon?.trim();
  if (e) return e;
  return p.grade ? (GRADE_LABELS as Record<string, string>)[p.grade] ?? p.grade : '-';
}
