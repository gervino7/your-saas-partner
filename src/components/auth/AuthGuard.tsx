import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import Loading from '@/components/common/Loading';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { session, loading } = useAuthStore();
  const [verified, setVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      navigate('/login', { replace: true });
      return;
    }

    // Server-side token verification
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        supabase.auth.signOut();
        navigate('/login', { replace: true });
      } else {
        setVerified(true);
      }
    });
  }, [session, loading, navigate]);

  if (loading || (!verified && session)) {
    return <Loading fullScreen message="Vérification de l'authentification..." />;
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
