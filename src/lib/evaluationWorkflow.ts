// UI eligibility mirrors server rules; workflow RPCs remain authoritative.
export function canValidateEvaluation(grade: string | null | undefined, status: string, observedAt: string | null | undefined) {
  return grade === 'DA' && ['envoyee', 'observations_recues', 'revisee'].includes(status) && !!observedAt;
}

export function showEvaluationTracking(header: { desaccord?: boolean | null } | null | undefined, evaluation: { desaccord?: boolean | null; objection?: boolean | null }) {
  return Boolean(header?.desaccord || evaluation.desaccord || evaluation.objection);
}

export function canManageDepartments(gradeLevel: number | null | undefined) {
  return (gradeLevel ?? 99) <= 2;
}