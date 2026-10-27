// Shared pure rule, copied at deployment because functions cannot import src/.
export function showEvaluationTracking(header: { desaccord?: boolean | null } | null | undefined, evaluation: { desaccord?: boolean | null; objection?: boolean | null }) {
  return Boolean(header?.desaccord || evaluation.desaccord || evaluation.objection);
}