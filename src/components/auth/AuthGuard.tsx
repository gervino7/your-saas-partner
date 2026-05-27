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
    let checkId = 0;

    async function checkAuth(reason: string) {
      const currentCheckId = ++checkId;
      setLoading(true);
      setAuthorized(false);

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (cancelled || currentCheckId !== checkId) return;

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

      if (cancelled || currentCheckId !== checkId) return;

      console.log('[AuthGuard]', {
        reason,
        userId: user.id,
        orgId: profile?.organization_id ?? null,
        profileError: profileError?.message ?? null,
        path: location.pathname,
      });

      // No organization → force onboarding
      if (!profile?.organization_id && location.pathname !== '/onboarding') {
        navigate('/onboarding', { replace: true });
        setLoading(false);
        return;
      }

      // Has organization but on onboarding → go to dashboard
      if (profile?.organization_id && location.pathname === '/onboarding') {
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
