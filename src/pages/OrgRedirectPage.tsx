import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

/**
 * /org/:slug — URL personnalisée de l'organisation.
 * - Si l'utilisateur est connecté et appartient à l'org (slug), redirige vers /.
 * - Sinon redirige vers /login avec ?org=<slug> (mémorisé après login).
 */
const OrgRedirectPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();

  useEffect(() => {
    const run = async () => {
      if (!slug) {
        navigate('/', { replace: true });
        return;
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('id, slug')
        .eq('slug', slug)
        .maybeSingle();

      if (!org) {
        navigate('/login', { replace: true });
        return;
      }

      if (!user) {
        sessionStorage.setItem('intended_org_slug', slug);
        navigate('/login', { replace: true });
        return;
      }

      if (profile?.organization_id === org.id) {
        navigate('/', { replace: true });
      } else {
        // Connecté mais pas membre de cette org
        navigate('/', { replace: true });
      }
    };
    run();
  }, [slug, user, profile, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default OrgRedirectPage;
