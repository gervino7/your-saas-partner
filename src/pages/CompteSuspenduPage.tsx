import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function CompteSuspenduPage() {
  const navigate = useNavigate();
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();
      if (!profile?.organization_id) return;
      const { data: org } = await supabase
        .from('organizations')
        .select('suspension_reason, is_active')
        .eq('id', profile.organization_id)
        .maybeSingle();
      if (cancelled) return;
      if (org?.is_active) {
        navigate('/', { replace: true });
        return;
      }
      setReason(org?.suspension_reason ?? null);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Compte suspendu</CardTitle>
          <CardDescription>
            L'accès de votre organisation à Mission-DGC a été suspendu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {reason && (
            <div className="rounded-md border bg-muted/60 p-3 text-left text-sm">
              <p className="mb-1 font-medium text-muted-foreground">Motif</p>
              <p>{reason}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Pour rétablir l'accès, contactez le support :{' '}
            <a href="mailto:support@abodje.com" className="underline">support@abodje.com</a>
          </p>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
