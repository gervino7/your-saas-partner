import { describe, expect, it } from 'vitest';
import { GRID_RANKS, PRACTICES, canEditGradeGrid, validateGradeRow, type EvaluationGradeRow } from '@/lib/evaluationGradeGrid';

const row: EvaluationGradeRow = { id: 'one', organization_id: 'cabinet', practice: 'comptable', rank: 10, echelon: 'Manager 1', family: 'Managers', maps_to_grade: 'CM', is_active: true };
describe('Grille du cabinet', () => {
  it('has 18 fixed descending ranks per practice and 54 total', () => {
    expect(GRID_RANKS).toEqual([18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1]);
    expect(PRACTICES).toEqual(['comptable','conseil','juridique']);
    expect(GRID_RANKS.length * PRACTICES.length).toBe(54);
  });
  it('allows editing only grades 1 and 2 with a cabinet', () => {
    expect(canEditGradeGrid(1, 'cabinet')).toBe(true);
    expect(canEditGradeGrid(2, 'cabinet')).toBe(true);
    for (const level of [0,3,4,5,6,7,8,undefined]) expect(canEditGradeGrid(level, 'cabinet')).toBe(false);
    expect(canEditGradeGrid(1, null)).toBe(false);
  });
  it('rejects a duplicate rank in the same cabinet and practice', () => {
    expect(validateGradeRow({ ...row, id: 'two', echelon: 'Other' }, [row])).toBeTruthy();
    expect(validateGradeRow({ ...row, id: 'two', practice: 'conseil' }, [row])).toBeNull();
  });
  it('rejects duplicate echelon names only within the same cabinet and practice', () => {
    expect(validateGradeRow({ ...row, id: 'two', rank: 11 }, [row])).toBeTruthy();
    expect(validateGradeRow({ ...row, id: 'two', rank: 11, organization_id: 'other' }, [row])).toBeNull();
  });
  it('requires ranks between 1 and 18', () => {
    for (const rank of [0,19,1.5]) expect(validateGradeRow({ ...row, rank }, [])).toBeTruthy();
    for (const rank of [1,18]) expect(validateGradeRow({ ...row, rank }, [])).toBeNull();
  });
  it('requires echelon, family and one of the eight grade codes', () => {
    for (const field of ['echelon', 'family', 'maps_to_grade'] as const) expect(validateGradeRow({ ...row, [field]: '' }, [])).toBeTruthy();
    expect(validateGradeRow({ ...row, maps_to_grade: 'MGR' }, [])).toBeTruthy();
    for (const code of ['DA','DM','CM','SUP','AS','AUD','AJ','STG']) expect(validateGradeRow({ ...row, maps_to_grade: code }, [])).toBeNull();
  });
});