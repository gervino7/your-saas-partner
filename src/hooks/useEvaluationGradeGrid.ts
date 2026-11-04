import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { canEditGradeGrid, validateGradeRow, type EvaluationGradeRow } from '@/lib/evaluationGradeGrid';

export function useEvaluationGradeGrid() {
  const profile = useAuthStore(s => s.profile);
  const orgId = profile?.organization_id;
  const canEdit = canEditGradeGrid(profile?.grade_level, orgId);
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['evaluation-grade-grid', orgId, profile?.id], enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) throw new Error('Cabinet introuvable.');
      const { data, error } = await supabase.from('evaluation_grades').select('*').eq('organization_id', orgId).order('rank', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const roleGrid = useQuery({ queryKey: ['mission-role-grid', orgId, profile?.id], enabled: !!orgId, queryFn: async () => {
    const { data, error } = await supabase.rpc('mission_role_grid');
    if (error) throw new Error(error.message);
    return data ?? [];
  }});
  const invalidate = async () => {
    await Promise.all(['evaluation-grade-grid', 'evaluation-grades', 'mission-role-eligibility'].map(key => qc.invalidateQueries({ queryKey: [key] })));
  };
  const save = useMutation({ mutationFn: async (row: EvaluationGradeRow) => {
    if (!canEdit || !orgId || row.organization_id !== orgId) throw new Error('Seule la direction peut modifier la grille de son cabinet.');
    const validation = validateGradeRow(row, query.data ?? []);
    if (validation) throw new Error(validation);
    const values = { echelon: row.echelon.trim(), family: row.family.trim(), maps_to_grade: row.maps_to_grade, is_active: row.is_active };
    const result = row.id
      ? await supabase.from('evaluation_grades').update(values).eq('id', row.id).eq('organization_id', orgId).eq('practice', row.practice).eq('rank', row.rank).select('id').single()
      : await supabase.from('evaluation_grades').insert({ ...values, organization_id: orgId, practice: row.practice, rank: row.rank }).select('id').single();
    if (result.error) throw new Error(result.error.message);
  }, onSuccess: async () => { await invalidate(); toast.success('Échelon enregistré'); }, onError: (e: Error) => toast.error(e.message) });
  const seed = useMutation({ mutationFn: async () => {
    if (!canEdit || !orgId) throw new Error('Seule la direction peut créer la grille de son cabinet.');
    const { data, error } = await supabase.rpc('seed_evaluation_referentiel', { _org: orgId });
    if (error) throw new Error(error.message);
    return data;
  }, onSuccess: async () => { await invalidate(); toast.success('Grille complète créée'); }, onError: (e: Error) => toast.error(e.message) });
  return { query, roleGrid, save, seed, orgId, canEdit };
}