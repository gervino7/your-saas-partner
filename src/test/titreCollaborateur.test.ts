import { describe, it, expect } from 'vitest';
import { titreDuCollaborateur } from '@/lib/titreCollaborateur';
import { GRADE_LABELS } from '@/types/database';
describe('titreDuCollaborateur', () => {
  it("l'échelon fait foi", () => expect(titreDuCollaborateur({ grade: 'CM', grade_echelon: ' Directeur de mission 2 ' })).toBe('Directeur de mission 2'));
  it('repli sur le libellé du code', () => expect(titreDuCollaborateur({ grade: 'CM', grade_echelon: null })).toBe(GRADE_LABELS.CM));
  it('rien du tout', () => expect(titreDuCollaborateur({})).toBe('-'));
});
