import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAccountType } from '@/hooks/useAccountType';
import Loading from '@/components/common/Loading';

export default function PortalGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        navigate('/login', { replace: true });
      } else {
        setHasSession(true);
      }
      setCheckingSession(false);
    });
    return () => { cancelled = true; };
  }, [navigate]);

  const { data, isLoading } = useAccountType();

  useEffect(() => {
    if (!hasSession || isLoading || !data) return;
    if (data.type !== 'portal_client') {
      navigate('/', { replace: true });
    }
  }, [hasSession, isLoading, data, navigate]);

  if (checkingSession || isLoading || !data) {
    return <Loading fullScreen message="Chargement de votre espace client..." />;
  }

  if (data.type !== 'portal_client') return null;

  return <>{children}</>;
}
