import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface InvitationContext {
  email: string;
  full_name: string | null;
  client_name: string;
  organization_name: string;
}

const isPasswordValid = (pwd: string) => pwd.length >= 10 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd);

const strengthOf = (pwd: string) => {
  let score = 0;
  if (pwd.length >= 10) score++;
  if (pwd.length >= 14) score++;
  if (/[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  return score;
};

const STRENGTH_LABELS = ['Trop faible', 'Faible', 'Correct', 'Bon', 'Excellent'];

export default function PortalActivationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [context, setContext] = useState<InvitationContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError('Lien invalide');
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke('activate-portal-account', {
        body: { token, validate_only: true },
      });
      if (cancelled) return;
      const payload = data as (InvitationContext & { valid?: boolean; error?: string }) | null;
      if (error || !payload?.valid) {
        setLoadError(payload?.error ?? "Ce lien d'invitation est invalide ou a expiré.");
      } else {
        setContext(payload);
        setFullName(payload.full_name ?? '');
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const strength = useMemo(() => strengthOf(password), [password]);
  const matches = password.length > 0 && password === confirm;
  const canSubmit = isPasswordValid(password) && matches && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !token || !context) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-portal-account', {
        body: { token, password, full_name: fullName },
      });
      const payload = data as { success?: boolean; error?: string } | null;
      if (error || !payload?.success) {
        throw new Error(payload?.error ?? "L'activation a échoué.");
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: context.email,
        password,
      });
      if (signInError) throw signInError;
      toast.success('Votre accès est activé');
      navigate('/espace-client', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "L'activation a échoué.";
      toast.error(message, { description: 'Si le problème persiste, contactez votre cabinet.' });
      setLoadError(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !context) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <h1 className="text-xl font-semibold">{loadError ?? 'Lien invalide'}</h1>
            <p className="text-sm text-muted-foreground">
              Contactez votre cabinet pour recevoir une nouvelle invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <CardTitle className="text-xl">{context.organization_name}</CardTitle>
          <CardDescription>
            Espace client de <strong className="text-foreground">{context.client_name}</strong>
            <br />
            Créez votre mot de passe pour accéder à votre espace client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={context.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Votre nom" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all"
                    style={{ width: `${(strength / 4) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{STRENGTH_LABELS[strength]}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                10 caractères minimum, avec au moins une lettre et un chiffre.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              {confirm.length > 0 && !matches && (
                <p className="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activer mon accès
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
