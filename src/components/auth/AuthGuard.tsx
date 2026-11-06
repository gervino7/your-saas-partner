import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Loading from '@/components/common/Loading';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth(reason: string) {
      setLoading(true);
      setAuthorized(false);

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        navigate('/login', { replace: true });
        setLoading(false);
        return;
      }

      // Always fetch fresh profile from DB (no cache) to get up-to-date organization_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      const hasOrganization = typeof profile?.organization_id === 'string' && profile.organization_id.trim().length > 0;
      const isOnboardingRoute = location.pathname === '/onboarding';
      const isSuspendedRoute = location.pathname === '/compte-suspendu';

      console.log('[AuthGuard]', {
        reason,
        userId: user.id,
        orgId: profile?.organization_id ?? null,
        hasOrganization,
        profileError: profileError?.message ?? null,
        path: location.pathname,
      });

      // No organization → force onboarding
      if (!hasOrganization && !isOnboardingRoute) {
        navigate('/onboarding', { replace: true });
        setLoading(false);
        return;
      }

      // Organisation suspendue → écran dédié (sauf administrateurs plateforme)
      if (hasOrganization) {
        const { data: org } = await supabase
          .from('organizations')
          .select('is_active')
          .eq('id', profile!.organization_id!)
          .maybeSingle();

        if (cancelled) return;

        if (org && org.is_active === false) {
          const { data: isPlatformAdmin } = await supabase.rpc('is_platform_admin', { _min_role: 'support' } as any);
          if (cancelled) return;

          if (!isPlatformAdmin && !isSuspendedRoute) {
            navigate('/compte-suspendu', { replace: true });
            setLoading(false);
            return;
          }
        } else if (isSuspendedRoute) {
          navigate('/', { replace: true });
          setLoading(false);
          return;
        }
      }

      // Has organization but on onboarding → go to dashboard
      if (hasOrganization && isOnboardingRoute) {
        navigate('/', { replace: true });
        setLoading(false);
        return;
      }


      setAuthorized(true);
      setLoading(false);
    }

    void checkAuth('route-check');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        void checkAuth(`auth-${event}`);
      }
      if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [location.pathname, navigate]);

  if (loading) {
    return <Loading fullScreen message="Vérification de l'authentification..." />;
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
