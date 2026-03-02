import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, Building2, Shield } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { GRADE_LABELS } from '@/types/database';
import type { Grade } from '@/types/database';

const TOAST_ERROR = 'destructive' as const;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;
const INVITATION_TOKEN_KEYS = ['token', 'invitation_token', 'invite_token'] as const;

const getAuthErrorMessage = (_error: unknown, isSignUp: boolean): string => {
  if (isSignUp) {
    return 'Impossible de créer le compte. Si cette adresse est déjà utilisée, connectez-vous directement.';
  }
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

const readTokenFromParams = (params: URLSearchParams): string | null => {
  for (const key of INVITATION_TOKEN_KEYS) {
    const value = params.get(key);
    if (value) return value;
  }
  return null;
};

const extractInvitationToken = (
  searchParams: URLSearchParams,
  pathname: string,
  hash: string,
  href?: string,
): string | null => {
  const fromSearch = readTokenFromParams(searchParams);
  if (fromSearch) return fromSearch;

  if (hash) {
    const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;

    // Handles links like /#/register?token=...
    const hashQueryIndex = normalizedHash.indexOf('?');
    if (hashQueryIndex >= 0) {
      const hashQuery = normalizedHash.slice(hashQueryIndex + 1);
      const fromHashQuery = readTokenFromParams(new URLSearchParams(hashQuery));
      if (fromHashQuery) return fromHashQuery;
    }

    // Handles links like /#token=...
    const fromHashDirect = readTokenFromParams(new URLSearchParams(normalizedHash));
    if (fromHashDirect) return fromHashDirect;
  }

  // Handles links where query/hash is transformed by gateways or clients
  if (href) {
    const fromHrefMatch = href.match(/[?&#](token|invitation_token|invite_token)=([^&#]+)/i);
    if (fromHrefMatch?.[2]) {
      try {
        return decodeURIComponent(fromHrefMatch[2]);
      } catch {
        return fromHrefMatch[2];
      }
    }
  }

  // Handles links like /register/<token>
  const pathMatch = pathname.match(/\/register\/([0-9a-fA-F-]{36})/);
  if (pathMatch?.[1]) return pathMatch[1];

  return null;
};

interface InvitationInfo {
  email: string;
  grade: string;
  organization_name: string;
  organization_id: string;
}

const LoginPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const invitationToken = useMemo(
    () => extractInvitationToken(
      searchParams,
      location.pathname,
      location.hash,
      typeof window !== 'undefined' ? window.location.href : undefined,
    ),
    [searchParams, location.pathname, location.hash, location.key],
  );
  const normalizedPathname = location.pathname.replace(/\/+$/, '') || '/';
  const isRegisterRoute = normalizedPathname === '/register';

  const [isSignUp, setIsSignUp] = useState(isRegisterRoute || !!invitationToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch invitation details when token is present
  useEffect(() => {
    if (!invitationToken) {
      setInvitation(null);
      setLoadingInvitation(false);
      return;
    }

    let isMounted = true;

    const fetchInvitation = async () => {
      setLoadingInvitation(true);
      try {
        const { data, error } = await supabase.rpc('get_invitation_by_token', { _token: invitationToken });

        if (!isMounted) return;

        if (!error && data && data.length > 0) {
          const inv = data[0];
          setInvitation({
            email: inv.email,
            grade: inv.grade,
            organization_name: inv.organization_name,
            organization_id: inv.organization_id,
          });
          setEmail(inv.email);
        } else {
          setInvitation(null);
          toast({
            title: 'Invitation invalide',
            description: 'Ce lien d\'invitation est expiré ou invalide.',
            variant: TOAST_ERROR,
          });
        }
      } finally {
        if (isMounted) {
          setLoadingInvitation(false);
        }
      }
    };

    void fetchInvitation();

    return () => {
      isMounted = false;
    };
  }, [invitationToken, toast]);

  useEffect(() => {
    if (isRegisterRoute || invitationToken) {
      setIsSignUp(true);
    }
  }, [isRegisterRoute, invitationToken]);

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      if (isSignUp) {
        setPasswordErrors(validatePassword(value));
      }
    },
    [isSignUp],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      toast({
        title: 'Trop de tentatives',
        description: `Veuillez patienter ${remaining} secondes avant de réessayer.`,
        variant: TOAST_ERROR,
      });
      return;
    }

    if (isSignUp && !invitationToken) {
      toast({
        title: 'Invitation requise',
        description: 'Utilisez le lien d’invitation reçu par email pour créer votre compte.',
        variant: TOAST_ERROR,
      });
      return;
    }

    if (isSignUp && invitationToken && !invitation) {
      toast({
        title: 'Invitation invalide',
        description: 'Ce lien est invalide ou expiré.',
        variant: TOAST_ERROR,
      });
      return;
    }

    if (isSignUp) {
      const errors = validatePassword(password);
      if (errors.length > 0) {
        toast({
          title: 'Mot de passe trop faible',
          description: `Requis : ${errors.join(', ')}`,
          variant: TOAST_ERROR,
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
            data: { full_name: fullName, invitation_token: invitationToken },
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
    } catch (error: unknown) {
      console.error('[Auth Error]', error);
      toast({
        title: isSignUp ? "Erreur d'inscription" : "Erreur d'authentification",
        description: getAuthErrorMessage(error, isSignUp),
        variant: TOAST_ERROR,
      });
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;
  const gradeLabel = invitation?.grade ? GRADE_LABELS[invitation.grade as Grade] || invitation.grade : null;
  const showInvitationFields = isSignUp;
  const signUpBlocked = isSignUp && (!invitationToken || !invitation);

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
            <CardTitle className="font-display">{isSignUp ? 'Créer un compte' : 'Connexion'}</CardTitle>
            <CardDescription>
              {invitationToken
                ? 'Créez votre compte pour accepter l\'invitation'
                : isSignUp
                  ? 'Inscription uniquement via un lien d\'invitation'
                  : 'Connectez-vous à votre espace de travail'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showInvitationFields && (
              <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Organisation</span>
                </div>
                <Input
                  value={
                    invitation?.organization_name ||
                    (loadingInvitation
                      ? 'Chargement…'
                      : invitationToken
                        ? 'Invitation invalide ou expirée'
                        : 'Lien d’invitation requis')
                  }
                  disabled
                  className="bg-muted text-muted-foreground"
                />
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Grade attribué</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={
                      invitation
                        ? `${invitation.grade} — ${gradeLabel || invitation.grade}`
                        : loadingInvitation
                          ? 'Chargement…'
                          : invitationToken
                            ? 'Invitation invalide ou expirée'
                            : 'Lien d’invitation requis'
                    }
                    disabled
                    className="bg-muted text-muted-foreground"
                  />
                </div>
              </div>
            )}

            {loadingInvitation ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Chargement de l'invitation…</div>
            ) : (
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
                    disabled={isSignUp && !!invitationToken}
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
                <Button type="submit" className="w-full" disabled={loading || isLocked || signUpBlocked}>
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
            )}
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
