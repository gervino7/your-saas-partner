import { describe, expect, it } from 'vitest';
import { evaluationArchivePath, encryptArchive, decryptArchive } from '../../supabase/functions/export-evaluation-pdf/archive';

const evaluation = { id: 'ev-1', exercice: 2026, statut: 'validee' };
const data = { organization_id: 'org-1', evaluation };

describe('Evaluation PDF confidentiality', () => {
  it('separates collaborator and internal archives', () => {
    expect(evaluationArchivePath({ ...data, lecteur: { role: 'collaborateur' } })).toBe('org-1/2026/evaluation-ev-1-collaborateur-v2.enc');
    expect(evaluationArchivePath({ ...data, lecteur: { role: 'direction' } })).toBe('org-1/2026/evaluation-ev-1-interne-v2.enc');
  });
  it('does not archive drafts', () => {
    expect(evaluationArchivePath({ ...data, evaluation: { ...evaluation, statut: 'brouillon' } })).toBeNull();
  });
  it('fails closed without an authorized reader role', () => {
    expect(() => evaluationArchivePath(data)).toThrow('Accès refusé');
  });
  it('encrypts archives and binds decryption to their variant path', async () => {
    const bytes = new TextEncoder().encode('%PDF-confidential');
    const encrypted = await encryptArchive(bytes, 'test-only-key', 'internal');
    expect(encrypted).not.toEqual(bytes);
    expect(Array.from(await decryptArchive(encrypted, 'test-only-key', 'internal'))).toEqual(Array.from(bytes));
    await expect(decryptArchive(encrypted, 'test-only-key', 'collaborator')).rejects.toThrow();
  });
});