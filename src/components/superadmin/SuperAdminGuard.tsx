import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsPlatformAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert } from 'lucide-react';

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, role, isLoading } = useIsPlatformAdmin();

  console.log('[SuperAdmin] guard:', { isAdmin, role, isLoading, path: location.pathname });

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      const t = setTimeout(() => navigate('/', { replace: true }), 2000);
      return () => clearTimeout(t);
    }
  }, [isLoading, isAdmin, navigate]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <ShieldAlert className="h-10 w-10 text-destructive" />
            <h1 className="text-xl font-semibold">Accès refusé</h1>
            <p className="text-sm text-muted-foreground">
              Vous n'avez pas les droits nécessaires. Redirection en cours…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
