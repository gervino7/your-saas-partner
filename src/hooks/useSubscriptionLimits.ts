import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { usePlans } from '@/hooks/usePlans';
import { findPlan, missionQuota, nextPlan as nextPlanOf, UNLIMITED, type Plan } from '@/lib/plans';

const FALLBACK: Plan = {
  id: 'fallback',
  code: 'free',
  name: 'Gratuit',
  description: null,
  price_monthly: 0,
  max_users: 5,
  max_missions: 1,
  max_storage_gb: 2,
  max_clients: null,
  features: [],
  is_active: true,
  is_public: true,
  sort_order: 0,
};

export const useSubscriptionLimits = () => {
  const orgId = useAuthStore((s) => s.profile?.organization_id);
  const { data: plans = [], isLoading: plansLoading } = usePlans();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-limits', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('subscription_plan, max_users, max_storage_gb')
        .eq('id', orgId!)
        .maybeSingle();

      const [{ count: userCount }, { count: missionCount }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!),
        supabase.from('missions').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!),
      ]);

      const { data: docAgg } = await supabase
        .from('documents')
        .select('file_size')
        .eq('organization_id', orgId!);
      const totalBytes = (docAgg ?? []).reduce((s, d: any) => s + (d.file_size || 0), 0);

      return {
        planCode: (org?.subscription_plan as string) || 'free',
        userCount: userCount ?? 0,
        missionCount: missionCount ?? 0,
        storageGb: totalBytes / 1024 ** 3,
      };
    },
  });

  const plan = (plans.length ? findPlan(plans, data?.planCode) : null) ?? FALLBACK;
  const maxMissions = missionQuota(plan);

  const canCreateMission = (data?.missionCount ?? 0) < maxMissions;
  const canInviteUser = (data?.userCount ?? 0) < plan.max_users;
  const canUploadFile = (sizeBytes = 0) =>
    ((data?.storageGb ?? 0) + sizeBytes / 1024 ** 3) < plan.max_storage_gb;

  const usagePercent = {
    users: Math.min(100, ((data?.userCount ?? 0) / plan.max_users) * 100),
    missions: maxMissions >= UNLIMITED ? 0 : Math.min(100, ((data?.missionCount ?? 0) / maxMissions) * 100),
    storage: Math.min(100, ((data?.storageGb ?? 0) / plan.max_storage_gb) * 100),
  };

  return {
    isLoading: isLoading || plansLoading,
    plans,
    plan,
    currentPlanId: data?.planCode ?? 'free',
    userCount: data?.userCount ?? 0,
    missionCount: data?.missionCount ?? 0,
    storageGb: data?.storageGb ?? 0,
    nextPlan: nextPlanOf(plans, data?.planCode),
    canCreateMission,
    canInviteUser,
    canUploadFile,
    usagePercent,
    upgradeNeeded: !canCreateMission || !canInviteUser,
  };
};
