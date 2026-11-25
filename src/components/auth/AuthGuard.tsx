import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Loading from '@/components/common/Loading';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [noOrganization, setNoOrganization] = useState(false);

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
      const isSuspendedRoute = location.pathname === '/compte-suspendu';


      // Aucun cabinet : écran bloquant, aucune autre action
      if (!hasOrganization) {
        setNoOrganization(true);
        setLoading(false);
        return;
      }
      setNoOrganization(false);

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


      // Mot de passe provisoire : changement obligatoire avant toute autre page
      const isChangeRoute = location.pathname === '/changer-mot-de-passe';
      const { data: provisoire } = await supabase.rpc('mon_mot_de_passe_est_provisoire' as any);
      if (cancelled) return;
      if (provisoire === true && !isChangeRoute) {
        navigate('/changer-mot-de-passe', { replace: true });
        setLoading(false);
        return;
      }
      if (provisoire !== true && isChangeRoute) {
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

  if (noOrganization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-foreground">
            Votre compte n'est rattaché à aucun cabinet. Contactez l'administrateur de votre cabinet.
          </p>
          <Button variant="outline" className="w-full" onClick={() => void supabase.auth.signOut()}>
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
}
