import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus } from 'lucide-react';
import logoImg from '@/assets/logo.png';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000; // 1 minute

const getAuthErrorMessage = (error: any, isSignUp: boolean): string => {
  if (isSignUp) {
    // Generic message for signup — never reveal if email exists
    return 'Impossible de créer le compte. Si cette adresse est déjà utilisée, connectez-vous directement.';
  }
  // Generic message for login — prevent user enumeration
  return 'Identifiants invalides. Veuillez vérifier votre email et mot de passe.';
};

const validatePassword = (pwd: string): string[] => {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push('Au moins 8 caractères');
  if (!/[A-Z]/.test(pwd)) errors.push('Une lettre majuscule');
  if (!/[a-z]/.test(pwd)) errors.push('Une lettre minuscule');
  if (!/[0-9]/.test(pwd)) errors.push('Un chiffre');
  return errors;
};

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    if (isSignUp) {
      setPasswordErrors(validatePassword(value));
    }
  }, [isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      toast({
        title: 'Trop de tentatives',
        description: `Veuillez patienter ${remaining} secondes avant de réessayer.`,
        variant: 'destructive',
      });
      return;
    }

    // Password validation for signup
    if (isSignUp) {
      const errors = validatePassword(password);
      if (errors.length > 0) {
        toast({
          title: 'Mot de passe trop faible',
          description: `Requis : ${errors.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setLoginAttempts(0);
        toast({
          title: 'Inscription réussie',
          description: 'Vérifiez votre email pour confirmer votre compte.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const newAttempts = loginAttempts + 1;
          setLoginAttempts(newAttempts);
          if (newAttempts >= MAX_ATTEMPTS) {
            setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
            setLoginAttempts(0);
          }
          throw error;
        }
        setLoginAttempts(0);
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      console.error('[Auth Error]', error?.message);
      toast({
        title: isSignUp ? "Erreur d'inscription" : "Erreur d'authentification",
        description: getAuthErrorMessage(error, isSignUp),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <img src={logoImg} alt="MissionFlow" className="mx-auto mb-0 h-14 w-14 rounded-xl object-contain" />
          <h1 className="text-2xl font-bold font-display">MissionFlow</h1>
          <p className="text-sm text-muted-foreground">Plateforme de gestion de missions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">
              {isSignUp ? 'Créer un compte' : 'Connexion'}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? 'Remplissez les informations pour créer votre compte'
                : 'Connectez-vous à votre espace de travail'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nom complet</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jean Dupont"
                    required
                    maxLength={255}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean@cabinet.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                {isSignUp && passwordErrors.length > 0 && password.length > 0 && (
                  <ul className="text-xs text-destructive space-y-0.5 mt-1">
                    {passwordErrors.map((err) => (
                      <li key={err}>• {err}</li>
                    ))}
                  </ul>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading || isLocked}>
                {loading ? (
                  'Chargement...'
                ) : isLocked ? (
                  'Veuillez patienter...'
                ) : isSignUp ? (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer un compte
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Se connecter
                  </>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setPasswordErrors([]);
                }}
                className="text-primary hover:underline"
              >
                {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
