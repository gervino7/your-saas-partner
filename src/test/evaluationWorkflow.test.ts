import { describe, expect, it } from 'vitest';
import { canValidateEvaluation, canManageDepartments, showEvaluationTracking } from '@/lib/evaluationWorkflow';

describe('Départements et circuit DA', () => {
  it('reserves validation to DA, not DM or the ordinary evaluator', () => {
    expect(canValidateEvaluation('DA', 'observations_recues', '2026-10-27')).toBe(true);
    expect(canValidateEvaluation('DM', 'observations_recues', '2026-10-27')).toBe(false);
    expect(canValidateEvaluation('CM', 'revisee', '2026-10-27')).toBe(false);
  });
  it('requires online observations before DA validation', () => {
    expect(canValidateEvaluation('DA', 'envoyee', null)).toBe(false);
    expect(canValidateEvaluation('DA', 'revisee', '2026-10-27')).toBe(true);
    expect(canValidateEvaluation('DA', 'validee', '2026-10-27')).toBe(false);
  });
  it('limits department configuration to grade levels 1 and 2', () => {
    expect(canManageDepartments(1)).toBe(true); expect(canManageDepartments(2)).toBe(true);
    expect(canManageDepartments(3)).toBe(false); expect(canManageDepartments(null)).toBe(false);
  });
  it('includes tracking only for disagreement or objection', () => {
    expect(showEvaluationTracking({ desaccord: false }, { desaccord: false, objection: false })).toBe(false);
    expect(showEvaluationTracking({ desaccord: true }, {})).toBe(true);
    expect(showEvaluationTracking(undefined, { objection: true })).toBe(true);
    expect(showEvaluationTracking({ desaccord: false }, { desaccord: true })).toBe(true);
  });
});