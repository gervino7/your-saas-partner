import { describe, it, expect } from 'vitest';
import { mouvement, ORIGINES } from './gradeHistory';
describe('parcours des grades', () => {
  it('rang 8 vers rang 10 est une montée', () => expect(mouvement(10, 8)).toBe('montee'));
  it('rang 10 vers rang 8 est une descente', () => expect(mouvement(8, 10)).toBe('descente'));
  it('sans étape précédente : première affectation', () => expect(mouvement(5, undefined)).toBe('premiere'));
  it('modification_fiche est marquée comme telle', () => expect(ORIGINES.modification_fiche).toBe('Modification directe de la fiche'));
});
