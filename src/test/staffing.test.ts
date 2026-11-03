import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ insert }) } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { useCreateAssignment } from '@/hooks/useStaffing';

describe('Affectation immédiate', () => {
  beforeEach(() => { insert.mockReset(); insert.mockResolvedValue({ error: null }); });
  it('sends auditeur directly and leaves activation to the database default', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateAssignment(), {
      wrapper: ({ children }) => createElement(QueryClientProvider, { client }, children),
    });
    await act(async () => {
      await result.current.mutateAsync({ mission_id: 'mission', user_id: 'collaborator', role: 'auditeur', start_date: '2026-11-03', weekly_hours: 35 });
    });
    expect(insert).toHaveBeenCalledWith({ mission_id: 'mission', project_id: null, user_id: 'collaborator', role: 'auditeur', start_date: '2026-11-03', end_date: null, weekly_hours: 35 });
    expect(insert.mock.calls[0][0]).not.toHaveProperty('status');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['mission-members'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    client.clear();
  });
});