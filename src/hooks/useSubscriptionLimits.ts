import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { PLANS, PlanId, getNextPlan } from '@/lib/plans';

export const useSubscriptionLimits = () => {
  const orgId = useAuthStore((s) => s.profile?.organization_id);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-limits', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('subscription_plan, max_users, max_storage_gb')
        .eq('id', orgId!)
        .maybeSingle();

      const planId = ((org?.subscription_plan as PlanId) || 'free');
      const plan = PLANS[planId] ?? PLANS.free;

      const [{ count: userCount }, { count: missionCount }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!),
        supabase.from('missions').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!),
      ]);

      // Storage: sum of file_size from documents
      const { data: docAgg } = await supabase
        .from('documents')
        .select('file_size')
        .eq('organization_id', orgId!);
      const totalBytes = (docAgg ?? []).reduce((s, d: any) => s + (d.file_size || 0), 0);
      const storageGb = totalBytes / (1024 ** 3);

      return {
        plan,
        currentPlanId: planId,
        userCount: userCount ?? 0,
        missionCount: missionCount ?? 0,
        storageGb,
        nextPlan: getNextPlan(planId),
      };
    },
  });

  const plan = data?.plan ?? PLANS.free;
  const canCreateMission = (data?.missionCount ?? 0) < plan.maxMissions;
  const canInviteUser = (data?.userCount ?? 0) < plan.maxUsers;
  const canUploadFile = (sizeBytes = 0) =>
    ((data?.storageGb ?? 0) + sizeBytes / 1024 ** 3) < plan.maxStorageGb;

  const usagePercent = {
    users: Math.min(100, ((data?.userCount ?? 0) / plan.maxUsers) * 100),
    missions: Math.min(100, ((data?.missionCount ?? 0) / plan.maxMissions) * 100),
    storage: Math.min(100, ((data?.storageGb ?? 0) / plan.maxStorageGb) * 100),
  };

  return {
    isLoading,
    plan,
    currentPlanId: data?.currentPlanId ?? ('free' as PlanId),
    userCount: data?.userCount ?? 0,
    missionCount: data?.missionCount ?? 0,
    storageGb: data?.storageGb ?? 0,
    nextPlan: data?.nextPlan ?? null,
    canCreateMission,
    canInviteUser,
    canUploadFile,
    usagePercent,
    upgradeNeeded: !canCreateMission || !canInviteUser,
  };
};
