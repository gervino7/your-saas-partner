import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import Loading from '@/components/common/Loading';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { session, profile, loading } = useAuthStore();
  const [verified, setVerified] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      navigate('/login', { replace: true });
      return;
    }

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        supabase.auth.signOut();
        navigate('/login', { replace: true });
      } else {
        setVerified(true);
      }
    });
  }, [session, loading, navigate]);

  // Redirect to onboarding if the profile has no organization yet
  useEffect(() => {
    if (!verified || !profile) return;
    if (!profile.organization_id && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
    }
  }, [verified, profile, location.pathname, navigate]);

  if (loading || (!verified && session)) {
    return <Loading fullScreen message="Vérification de l'authentification..." />;
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
