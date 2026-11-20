import { beforeEach, describe, expect, it, vi } from 'vitest';

const { select, eq, inFn, update } = vi.hoisted(() => {
  const select = vi.fn();
  const eq = vi.fn(() => ({ select }));
  const inFn = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq, in: inFn }));
  return { select, eq, inFn, update };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ update }) } }));
import { updateByIdOrFail, updateManyOrFail } from '@/lib/safeUpdate';

describe('updateByIdOrFail', () => {
  beforeEach(() => { select.mockReset(); eq.mockClear(); update.mockClear(); });

  it('ne lève rien quand une ligne est revenue', async () => {
    select.mockResolvedValue({ data: [{ id: 'a' }], error: null });
    await expect(updateByIdOrFail('daily_rates', 'a', { daily_rate: 100 })).resolves.toBeUndefined();
  });

  it('lève une erreur quand la politique masque la ligne (0 ligne, 0 erreur)', async () => {
    select.mockResolvedValue({ data: [], error: null });
    await expect(updateByIdOrFail('daily_rates', 'a', { daily_rate: 100 })).rejects.toThrow("n'a pas été appliquée");
  });

  it('lève une erreur quand data est null', async () => {
    select.mockResolvedValue({ data: null, error: null });
    await expect(updateByIdOrFail('daily_rates', 'a', { daily_rate: 100 })).rejects.toThrow("n'a pas été appliquée");
  });

  it('propage l erreur de la base', async () => {
    select.mockResolvedValue({ data: null, error: new Error('refusé') });
    await expect(updateByIdOrFail('daily_rates', 'a', { daily_rate: 100 })).rejects.toThrow('refusé');
  });

  it('utilise le message personnalisé quand il est fourni', async () => {
    select.mockResolvedValue({ data: [], error: null });
    await expect(updateByIdOrFail('daily_rates', 'a', {}, 'message métier')).rejects.toThrow('message métier');
  });
});

describe('updateManyOrFail', () => {
  beforeEach(() => { select.mockReset(); inFn.mockClear(); update.mockClear(); });

  it('ne lève rien quand toutes les lignes sont revenues', async () => {
    select.mockResolvedValue({ data: [{ id: 'a' }, { id: 'b' }], error: null });
    await expect(updateManyOrFail('time_entries', ['a', 'b'], { status: 'approved' })).resolves.toBeUndefined();
  });

  it('lève une erreur quand une partie des lignes est masquée', async () => {
    select.mockResolvedValue({ data: [{ id: 'a' }], error: null });
    await expect(updateManyOrFail('time_entries', ['a', 'b'], { status: 'approved' })).rejects.toThrow("n'a pas été appliquée");
  });

  it('ne fait aucun appel quand la liste est vide', async () => {
    await expect(updateManyOrFail('time_entries', [], { status: 'approved' })).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
  });
});
