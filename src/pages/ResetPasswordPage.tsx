import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, CheckCircle } from 'lucide-react';
import logoImg from '@/assets/logo.png';

const validatePassword = (pwd: string): string[] => {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push('Au moins 8 caractères');
  if (!/[A-Z]/.test(pwd)) errors.push('Une lettre majuscule');
  if (!/[a-z]/.test(pwd)) errors.push('Une lettre minuscule');
  if (!/[0-9]/.test(pwd)) errors.push('Un chiffre');
  return errors;
};

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Check URL hash for recovery token
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    // Also check if we already have a session (redirected from App.tsx after PASSWORD_RECOVERY)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && window.location.hash.includes('type=recovery')) {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordErrors(validatePassword(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas.', variant: 'destructive' });
      return;
    }

    const errors = validatePassword(password);
    if (errors.length > 0) {
      toast({ title: 'Mot de passe trop faible', description: `Requis : ${errors.join(', ')}`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({ title: 'Mot de passe mis à jour', description: 'Votre mot de passe a été réinitialisé avec succès.' });
      // Portal clients are sent back to their own space, staff to the login page.
      const { data: isPortal } = await supabase.rpc('is_portal_user');
      setTimeout(() => navigate(isPortal ? '/espace-client' : '/login', { replace: true }), 2500);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le mot de passe.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery && !window.location.hash.includes('type=recovery')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-[420px] text-center space-y-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg" style={{ background: 'var(--gradient-primary)' }}>
            <img src={logoImg} alt="Mission-DGC" className="h-9 w-9 rounded-lg object-contain" />
          </div>
          <h1 className="text-xl font-bold">Lien invalide</h1>
          <p className="text-muted-foreground text-sm">
            Ce lien de réinitialisation est invalide ou a expiré.
          </p>
          <Button onClick={() => navigate('/login', { replace: true })} variant="outline">
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px] space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg mb-1" style={{ background: 'var(--gradient-primary)' }}>
            <img src={logoImg} alt="Mission-DGC" className="h-9 w-9 rounded-lg object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold font-display tracking-tight text-foreground">
            Nouveau mot de passe
          </h1>
          <p className="text-muted-foreground text-sm">
            Choisissez un nouveau mot de passe sécurisé.
          </p>
        </div>

        <Card className="shadow-elevated border-border/40 rounded-2xl overflow-hidden">
          <CardContent className="pt-6 p-8">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Mot de passe mis à jour !</h3>
                  <p className="text-sm text-muted-foreground">
                    Vous allez être redirigé vers la page de connexion...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="password" type="password" value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="••••••••" required minLength={8}
                      className="pl-10 h-11 bg-muted/30 border-border/50 focus:bg-background transition-colors rounded-xl"
                    />
                  </div>
                  {passwordErrors.length > 0 && password.length > 0 && (
                    <ul className="text-xs text-destructive space-y-0.5 mt-1.5 pl-1">
                      {passwordErrors.map((err) => (
                        <li key={err} className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-destructive shrink-0" />
                          {err}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="confirmPassword" type="password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••" required minLength={8}
                      className="pl-10 h-11 bg-muted/30 border-border/50 focus:bg-background transition-colors rounded-xl"
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20"
                  disabled={loading || passwordErrors.length > 0 || password !== confirmPassword}
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Mise à jour...
                    </span>
                  ) : (
                    'Mettre à jour le mot de passe'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
