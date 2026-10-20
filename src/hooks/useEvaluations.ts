import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import type { Category } from '@/lib/evaluation';

// JSON contracts are defined by the installed RPCs; authorization never comes from these types.
export type EvaluationData = Record<string, any>;
export type EvaluationForm = { evaluation: EvaluationData; categories: Category[]; scale: {label: string; min: number; max: number}[]; exchanges: EvaluationData[] };
export async function evaluationRpc<T = EvaluationData>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const invoke = supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: T; error: { message: string } | null }>;
  const { data, error } = await invoke.call(supabase, name, args);
  if (error) throw new Error(error.message);
  return data;
}
export const evaluationQuery = (q: {queryKey: readonly unknown[]}) => /evaluation|annual-campaign|mission-aggregate|feedback|evaluation-settings/.test(String(q.queryKey[0]));
function useRead<T = EvaluationData>(key: string, name: string, args: Record<string, unknown> = {}, enabled = true) {
  const id = useAuthStore(s => s.profile?.id);
  return useQuery({ queryKey: [key, args, id], queryFn: () => evaluationRpc<T>(name, args), enabled: !!id && enabled });
}
function useAction(name: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (args: Record<string, unknown>) => evaluationRpc(name, args), onSuccess: () => qc.invalidateQueries({ predicate: evaluationQuery }), onError: (e: Error) => toast.error(e.message) });
}
export const useMyEvaluations = () => useRead('my-evaluations', 'get_my_evaluations');
export const useEvaluationForm = (id?: string) => useRead<EvaluationForm>('evaluation-form', 'get_evaluation_form', { _evaluation_id: id }, !!id);
export const useGlobalEvaluation = (u?: string, ex?: number) => useRead('global-evaluation', 'get_global_evaluation', { _user_id: u, _exercice: ex }, !!u && !!ex);
export const useMissionAggregate = (u: string, ex: number) => useRead('mission-aggregate', 'get_mission_aggregate', { _user_id: u, _exercice: ex });
export const useEvaluationHistory = (u?: string, n?: number) => useRead('evaluation-history', 'get_evaluation_history', { _user_id: u, _cycles: n ?? null }, !!u);
export const useEvaluationRegistre = (p: {exercice: number; practice?: string; userId?: string}, enabled = true) => useRead('evaluation-registre', 'get_evaluation_registre', { _exercice: p.exercice, _practice: p.practice || null, _user_id: p.userId || null }, enabled);
export const useAnnualCampaign = (ex: number, enabled = true) => useRead('annual-campaign', 'get_annual_campaign', {_exercice: ex}, enabled);
export const useEvaluationFeedback = (id?: string, enabled = true) => useRead<EvaluationData[]>('evaluation-feedback', 'get_evaluation_feedback', {_evaluation_id: id}, !!id && enabled);
export const useSuggestContributors = (id?: string, enabled = true) => useRead<EvaluationData[]>('feedback-contributors', 'suggest_feedback_contributors', {_evaluation_id: id}, !!id && enabled);
export const useAssignEvaluator = () => useAction('assign_evaluator');
export const useOpenEvaluation = () => useAction('open_evaluation');
export const useOpenMissionEvaluations = () => useAction('open_mission_evaluations');
export const useOpenAnnualCampaign = () => useAction('open_annual_campaign');
export const useSendEvaluation = () => useAction('send_evaluation');
export const useSubmitObservations = () => useAction('submit_evaluation_observations');
export const useSignalDisagreement = () => useAction('signal_evaluation_disagreement');
export const useValidateEvaluation = () => useAction('validate_evaluation');
export const useRequestArbitration = () => useAction('request_evaluation_arbitration');
export const useDecideArbitration = () => useAction('decide_evaluation_arbitration');
export const useSetObjectives = () => useAction('set_evaluation_objectives');
export const useRateObjective = () => useAction('rate_evaluation_objective');
export const useSetSignificance = () => useAction('set_evaluation_significance');
export const useSetFiscalMonth = () => useAction('set_fiscal_year_start_month');
export const useRequestFeedback = () => useAction('request_evaluation_feedback');
export const useSubmitFeedback = () => useAction('submit_evaluation_feedback');
export function usePendingEvaluationFeedback() {
 const id=useAuthStore(s=>s.profile?.id);
 return useQuery({queryKey:['pending-evaluation-feedback',id],enabled:!!id,refetchInterval:60000,queryFn:()=>evaluationRpc<EvaluationData[]>('get_pending_evaluation_feedback')});
}
export function useEvaluationSettings() {
  const orgId = useAuthStore(s => s.profile?.organization_id);
  return useQuery({ queryKey: ['evaluation-settings', orgId], enabled: !!orgId, queryFn: async () => {
    if (!orgId) throw new Error('Cabinet introuvable.');
    const [org, scale] = await Promise.all([supabase.from('organizations').select('fiscal_year_start_month,eval_weight_missions,eval_weight_annuelle,eval_mission_aggregation,eval_history_cycles,eval_mission_practice_source,eval_default_practice').eq('id', orgId).single(), supabase.from('evaluation_scale').select('*').eq('organization_id',orgId).order('sort_order')]);
    if (org.error) throw new Error(org.error.message); if (scale.error) throw new Error(scale.error.message);
    return { ...org.data, scale: scale.data ?? [] };
  }});
}
export function useEvaluationGrades(practice: string) {
  return useQuery({queryKey: ['evaluation-grades', practice], enabled: !!practice, queryFn: async () => {
    const {data,error} = await supabase.from('evaluation_grades').select('echelon,family,rank,maps_to_grade').eq('practice', practice as 'comptable'|'conseil'|'juridique').order('rank');
    if(error) throw new Error(error.message); return data ?? [];
  }});
}
