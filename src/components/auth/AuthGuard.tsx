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

    async function checkAuth() {
      setLoading(true);
      setAuthorized(false);

      const { data: { session } } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        navigate('/login', { replace: true });
        setLoading(false);
        return;
      }

      // Always fetch fresh profile from DB (no cache) to get up-to-date organization_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      console.log('[AuthGuard]', {
        userId: session.user.id,
        orgId: profile?.organization_id ?? null,
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

    void checkAuth();

    return () => {
      cancelled = true;
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
