import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, Building2, Shield, Mail, Lock, User } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { GRADE_LABELS } from '@/types/database';
import type { Grade } from '@/types/database';

const TOAST_ERROR = 'destructive' as const;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;
const INVITATION_TOKEN_KEYS = ['token', 'invitation_token', 'invite_token', 'invitation'] as const;

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

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const readTokenFromText = (value: string): string | null => {
  const tokenMatch = value.match(/[?&#](token|invitation_token|invite_token|invitation)=([^&#]+)/i);
  if (!tokenMatch?.[2]) return null;
  const decoded = safeDecode(tokenMatch[2]).trim();
  return decoded || null;
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
    const hashQueryIndex = normalizedHash.indexOf('?');
    if (hashQueryIndex >= 0) {
      const hashQuery = normalizedHash.slice(hashQueryIndex + 1);
      const fromHashQuery = readTokenFromParams(new URLSearchParams(hashQuery));
      if (fromHashQuery) return fromHashQuery;
    }
    const fromHashDirect = readTokenFromParams(new URLSearchParams(normalizedHash));
    if (fromHashDirect) return fromHashDirect;
  }

  if (href) {
    const fromHref = readTokenFromText(href);
    if (fromHref) return fromHref;
    const decodedHref = safeDecode(href);
    if (decodedHref !== href) {
      const fromDecodedHref = readTokenFromText(decodedHref);
      if (fromDecodedHref) return fromDecodedHref;
      const decodedTwiceHref = safeDecode(decodedHref);
      if (decodedTwiceHref !== decodedHref) {
        const fromDecodedTwiceHref = readTokenFromText(decodedTwiceHref);
        if (fromDecodedTwiceHref) return fromDecodedTwiceHref;
      }
    }
  }

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
  const isForcedSignUp = isRegisterRoute || Boolean(invitationToken);

  const [isSignUp, setIsSignUp] = useState(isForcedSignUp);
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
            email: inv.email, grade: inv.grade,
            organization_name: inv.organization_name, organization_id: inv.organization_id,
          });
          setEmail(inv.email);
        } else {
          setInvitation(null);
          toast({ title: 'Invitation invalide', description: 'Ce lien d\'invitation est expiré ou invalide.', variant: TOAST_ERROR });
        }
      } finally {
        if (isMounted) setLoadingInvitation(false);
      }
    };
    void fetchInvitation();
    return () => { isMounted = false; };
  }, [invitationToken, toast]);

  useEffect(() => {
    if (isForcedSignUp) setIsSignUp(true);
  }, [isForcedSignUp]);

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      if (isSignUp) setPasswordErrors(validatePassword(value));
    },
    [isSignUp],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      toast({ title: 'Trop de tentatives', description: `Veuillez patienter ${remaining} secondes.`, variant: TOAST_ERROR });
      return;
    }
    if (isSignUp && !invitationToken) {
      toast({ title: 'Invitation requise', description: 'Utilisez le lien d\'invitation reçu par email.', variant: TOAST_ERROR });
      return;
    }
    if (isSignUp && invitationToken && !invitation) {
      toast({ title: 'Invitation invalide', description: 'Ce lien est invalide ou expiré.', variant: TOAST_ERROR });
      return;
    }
    if (isSignUp) {
      const errors = validatePassword(password);
      if (errors.length > 0) {
        toast({ title: 'Mot de passe trop faible', description: `Requis : ${errors.join(', ')}`, variant: TOAST_ERROR });
        return;
      }
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, invitation_token: invitationToken }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setLoginAttempts(0);
        toast({ title: 'Inscription réussie', description: 'Vérifiez votre email pour confirmer votre compte.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const newAttempts = loginAttempts + 1;
          setLoginAttempts(newAttempts);
          if (newAttempts >= MAX_ATTEMPTS) { setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS); setLoginAttempts(0); }
          throw error;
        }
        setLoginAttempts(0);
        navigate('/', { replace: true });
      }
    } catch (error: unknown) {
      console.error('[Auth Error]', error);
      toast({ title: isSignUp ? "Erreur d'inscription" : "Erreur d'authentification", description: getAuthErrorMessage(error, isSignUp), variant: TOAST_ERROR });
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;
  const gradeLabel = invitation?.grade ? GRADE_LABELS[invitation.grade as Grade] || invitation.grade : null;
  const showInvitationFields = isSignUp || isForcedSignUp;
  const signUpBlocked = isSignUp && (!invitationToken || !invitation);

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-10 w-72 h-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Mission-DGC" className="h-10 w-10 rounded-xl object-contain" />
            <span className="font-display font-bold text-xl">Mission-DGC</span>
          </div>
          <div className="space-y-6 max-w-md">
            <h2 className="font-display text-3xl font-bold leading-tight">
              Gérez vos missions de conseil avec excellence
            </h2>
            <p className="text-white/70 text-lg leading-relaxed">
              La plateforme tout-en-un pour les cabinets d'audit et de conseil en Afrique francophone.
            </p>
            <div className="space-y-4 pt-4">
              {[
                'Suivi des missions en temps réel',
                'Gouvernance COPIL intégrée',
                'Gestion documentaire avancée',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-white/80">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/40 text-xs">© {new Date().getFullYear()} D&G CONSEIL</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-8">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Mobile logo */}
          <div className="text-center lg:hidden">
            <img src={logoImg} alt="Mission-DGC" className="mx-auto mb-2 h-12 w-12 rounded-xl object-contain" />
            <h1 className="text-xl font-bold font-display">Mission-DGC</h1>
            <p className="text-sm text-muted-foreground">Plateforme de gestion de missions</p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block space-y-2">
            <h1 className="text-2xl font-bold font-display tracking-tight">
              {isSignUp ? 'Créer un compte' : 'Bon retour !'}
            </h1>
            <p className="text-muted-foreground">
              {invitationToken
                ? 'Complétez votre inscription pour rejoindre l\'équipe'
                : isSignUp
                  ? 'Inscription uniquement via un lien d\'invitation'
                  : 'Connectez-vous à votre espace de travail'}
            </p>
          </div>

          <Card className="shadow-elevated border-border/50">
            <CardHeader className="lg:hidden">
              <CardTitle className="font-display text-lg">{isSignUp ? 'Créer un compte' : 'Connexion'}</CardTitle>
              <CardDescription>
                {invitationToken
                  ? 'Complétez votre inscription'
                  : isSignUp
                    ? 'Via lien d\'invitation uniquement'
                    : 'Accédez à votre espace'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 lg:p-8">
              {showInvitationFields && (
                <div className="mb-6 rounded-xl border border-primary/15 bg-primary/[0.04] p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Organisation</p>
                      <p className="text-sm font-medium">
                        {invitation?.organization_name || (loadingInvitation ? 'Chargement…' : 'Invitation invalide')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Grade attribué</p>
                      <p className="text-sm font-medium">
                        {invitation ? `${invitation.grade} — ${gradeLabel || invitation.grade}` : (loadingInvitation ? 'Chargement…' : '—')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {loadingInvitation ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Chargement de l'invitation…</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jean Dupont" required maxLength={255}
                          className="pl-10 h-11 bg-muted/30 border-border/60 focus:bg-background transition-colors"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Adresse email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="jean@cabinet.com" required disabled={isSignUp && !!invitationToken}
                        className="pl-10 h-11 bg-muted/30 border-border/60 focus:bg-background transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password" type="password" value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="••••••••" required minLength={8}
                        className="pl-10 h-11 bg-muted/30 border-border/60 focus:bg-background transition-colors"
                      />
                    </div>
                    {isSignUp && passwordErrors.length > 0 && password.length > 0 && (
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
                  <Button type="submit" className="w-full h-11 text-sm font-semibold gradient-primary hover:opacity-90 transition-opacity" disabled={loading || isLocked || signUpBlocked}>
                    {loading ? (
                      'Chargement...'
                    ) : isLocked ? (
                      'Veuillez patienter...'
                    ) : isSignUp ? (
                      <><UserPlus className="mr-2 h-4 w-4" />Créer un compte</>
                    ) : (
                      <><LogIn className="mr-2 h-4 w-4" />Se connecter</>
                    )}
                  </Button>
                </form>
              )}
              {!isForcedSignUp && (
                <div className="mt-6 text-center text-sm">
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setPasswordErrors([]); }}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
