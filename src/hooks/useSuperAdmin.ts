import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PlanId } from '@/lib/plans';

export type PlatformRole = 'owner' | 'admin' | 'support';

type PlatformAdminState = {
  isAdmin: boolean;
  role: PlatformRole | null;
  canManage: boolean;
  isOwner: boolean;
};

export function useIsPlatformAdmin() {
  const query = useQuery({
    queryKey: ['is-platform-admin'],
    queryFn: async (): Promise<PlatformAdminState> => {
      const [support, admin, owner] = await Promise.all([
        supabase.rpc('is_platform_admin', { _min_role: 'support' }),
        supabase.rpc('is_platform_admin', { _min_role: 'admin' }),
        supabase.rpc('is_platform_admin', { _min_role: 'owner' }),
      ]);

      if (support.error) {
        console.error('[SuperAdmin] RPC error:', support.error);
        return { isAdmin: false, role: null, canManage: false, isOwner: false };
      }

      const role: PlatformRole | null = owner.data ? 'owner' : admin.data ? 'admin' : support.data ? 'support' : null;
      return {
        isAdmin: !!support.data,
        role,
        canManage: !!admin.data,
        isOwner: !!owner.data,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    ...query,
    isAdmin: query.data?.isAdmin ?? false,
    role: query.data?.role ?? null,
    canManage: query.data?.canManage ?? false,
    isOwner: query.data?.isOwner ?? false,
  };
}

// ── Dashboard ──
export function useSuperAdminKpis() {
  return useQuery({
    queryKey: ['sa-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_kpis');
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
}

export function useGrowth(months = 12) {
  return useQuery({
    queryKey: ['sa-growth', months],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_growth', { _months: months });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Organisations ──
export function useAllOrgs() {
  return useQuery({
    queryKey: ['sa-orgs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_get_all_orgs');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface OrgDetail {
  organization: Record<string, any>;
  usage: Record<string, any>;
  members: Record<string, any>[];
  plan_history: Record<string, any>[];
}

export function useOrgDetail(orgId?: string) {
  return useQuery({
    queryKey: ['sa-org-detail', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<OrgDetail> => {
      const { data, error } = await supabase.rpc('super_admin_org_detail', { _org_id: orgId! });
      if (error) throw error;
      const d = (data ?? {}) as any;
      return {
        organization: d.organization ?? {},
        usage: d.usage ?? {},
        members: d.members ?? [],
        plan_history: d.plan_history ?? [],
      };
    },
  });
}

export function useUpdateOrg() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      _org_id: string;
      _billing_email?: string | null;
      _billing_contact?: string | null;
      _phone?: string | null;
      _country?: string | null;
      _city?: string | null;
      _trial_ends_at?: string | null;
      _internal_notes?: string | null;
    }) => {
      const { error } = await supabase.rpc('super_admin_update_org', payload as any);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast({ title: 'Fiche mise à jour' });
      qc.invalidateQueries({ queryKey: ['sa-org-detail', v._org_id] });
      qc.invalidateQueries({ queryKey: ['sa-orgs'] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

export function useChangePlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: {
      _org_id: string;
      _new_plan: PlanId;
      _max_users: number;
      _max_storage_gb: number;
      _new_price?: number;
      _reason?: string;
    }) => {
      const { error } = await supabase.rpc('super_admin_change_plan', payload as any);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast({ title: 'Plan modifié' });
      qc.invalidateQueries({ queryKey: ['sa-org-detail', v._org_id] });
      qc.invalidateQueries({ queryKey: ['sa-orgs'] });
      qc.invalidateQueries({ queryKey: ['sa-health'] });
      qc.invalidateQueries({ queryKey: ['sa-plan-changes'] });
    },
    onError: (e: any) => toast({ title: 'Changement refusé', description: e.message, variant: 'destructive' }),
  });
}

export function useToggleOrg() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: { _org_id: string; _activate: boolean; _reason?: string }) => {
      const { error } = await supabase.rpc('super_admin_toggle_org', payload as any);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast({ title: v._activate ? 'Organisation réactivée' : 'Organisation suspendue' });
      qc.invalidateQueries({ queryKey: ['sa-org-detail', v._org_id] });
      qc.invalidateQueries({ queryKey: ['sa-orgs'] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

// ── Diagnostic d'organisation ──
export interface OrgDiagnostic {
  organization: Record<string, any>;
  health_checks: Record<string, any>;
  volumes: Record<string, number>;
  recent_logins: Record<string, any>[];
  recent_activity: Record<string, any>[];
}

export function useOrgDiagnostic(orgId?: string, enabled = true) {
  return useQuery({
    queryKey: ['sa-org-diagnostic', orgId],
    enabled: !!orgId && enabled,
    queryFn: async (): Promise<OrgDiagnostic> => {
      const { data, error } = await supabase.rpc('super_admin_org_diagnostic', { _org_id: orgId! } as any);
      if (error) throw error;
      const d = (data ?? {}) as any;
      return {
        organization: d.organization ?? {},
        health_checks: d.health_checks ?? {},
        volumes: d.volumes ?? {},
        recent_logins: d.recent_logins ?? [],
        recent_activity: d.recent_activity ?? [],
      };
    },
  });
}

export function useFixOrg() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: { _org_id: string; _action: string; _params?: Record<string, any> }) => {
      const { data, error } = await supabase.rpc('super_admin_fix_org', {
        _org_id: payload._org_id,
        _action: payload._action,
        _params: payload._params ?? {},
      } as any);
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data, v) => {
      const detail = data?.detail ?? {};
      const count = detail.missions_fixed ?? detail.users_fixed;
      toast({
        title: 'Correction appliquée',
        description: count !== undefined ? `${count} enregistrement(s) corrigé(s)` : 'Référentiels initialisés',
      });
      qc.invalidateQueries({ queryKey: ['sa-org-diagnostic', v._org_id] });
      qc.invalidateQueries({ queryKey: ['sa-org-detail', v._org_id] });
    },
    onError: (e: any) => toast({ title: 'Correction refusée', description: e.message, variant: 'destructive' }),
  });
}

// ── Support utilisateurs ──

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['sa-search-users', query],
    enabled: query.trim().length >= 3,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_search_users', { _query: query.trim() });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Santé plateforme ──
export function usePlatformHealth() {
  return useQuery({
    queryKey: ['sa-health'],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('super_admin_health');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Journal d'audit ──
export function useAuditLog(page = 0, pageSize = 50) {
  return useQuery({
    queryKey: ['sa-audit', page, pageSize],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('super_admin_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });
}

// ── Changements de plan ──
export function usePlanChanges(limit = 50) {
  return useQuery({
    queryKey: ['sa-plan-changes', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_changes_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Administrateurs plateforme ──
export function usePlatformAdmins() {
  return useQuery({
    queryKey: ['sa-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_admins')
        .select('*')
        .order('granted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGrantAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: PlatformRole }) => {
      const clean = email.trim().toLowerCase();
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', clean)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!profile) throw new Error(`Aucun profil trouvé pour ${clean}`);
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('platform_admins').insert({
        user_id: profile.id,
        email: clean,
        role,
        is_active: true,
        granted_by: auth.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Administrateur ajouté' });
      qc.invalidateQueries({ queryKey: ['sa-admins'] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

export function useRevokeAdmin() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_admins')
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Accès révoqué' });
      qc.invalidateQueries({ queryKey: ['sa-admins'] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}
