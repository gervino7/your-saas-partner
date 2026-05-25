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

  const showInvitationCard = !!invitationToken;

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
  const signUpBlocked = isSignUp && invitationToken && !invitation;

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden" style={{ background: 'linear-gradient(160deg, hsl(218 35% 6%) 0%, hsl(218 32% 14%) 40%, hsl(215 55% 22%) 100%)' }}>
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, hsl(22 78% 55%), transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, hsl(215 75% 50%), transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, hsl(0 0% 100%), transparent 60%)' }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-14 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, hsl(22 78% 55%), hsl(22 78% 45%))' }}>
              <img src={logoImg} alt="Mission-DGC" className="h-8 w-8 rounded-lg object-contain" />
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight">Mission-DGC</span>
              <p className="text-[11px] text-white/40 -mt-0.5">by D&G CONSEIL</p>
            </div>
          </div>

          {/* Hero content */}
          <div className="space-y-8 max-w-lg">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium tracking-wide uppercase" style={{ background: 'hsl(22 78% 55% / 0.15)', color: 'hsl(22 78% 65%)' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                Plateforme SaaS
              </div>
              <h2 className="font-display text-[2.5rem] font-extrabold leading-[1.1] tracking-tight">
                Gérez vos missions
                <br />
                <span style={{ color: 'hsl(22 78% 58%)' }}>avec excellence</span>
              </h2>
              <p className="text-white/50 text-base leading-relaxed max-w-sm">
                La plateforme tout-en-un pour les cabinets d'audit et de conseil en Afrique francophone.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: '📊', text: 'Suivi des missions en temps réel' },
                { icon: '🏛️', text: 'Gouvernance COPIL intégrée' },
                { icon: '📁', text: 'Gestion documentaire avancée' },
                { icon: '👥', text: 'Collaboration d\'équipe fluide' },
              ].map((feature) => (
                <div key={feature.text} className="flex items-center gap-3 group">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm transition-transform group-hover:scale-110" style={{ background: 'hsl(0 0% 100% / 0.06)' }}>
                    {feature.icon}
                  </div>
                  <span className="text-sm text-white/65 group-hover:text-white/85 transition-colors">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-white/25 text-xs">© {new Date().getFullYear()} D&G CONSEIL — Tous droits réservés</p>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === 1 ? '24px' : '6px', background: i === 1 ? 'hsl(22 78% 55%)' : 'hsl(0 0% 100% / 0.15)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-8 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(hsl(215 75% 35%) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 w-full max-w-[420px] space-y-8">
          {/* Mobile logo */}
          <div className="text-center lg:hidden">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg mb-3" style={{ background: 'var(--gradient-primary)' }}>
              <img src={logoImg} alt="Mission-DGC" className="h-9 w-9 rounded-lg object-contain" />
            </div>
            <h1 className="text-xl font-bold font-display">Mission-DGC</h1>
            <p className="text-sm text-muted-foreground">Plateforme de gestion de missions</p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block space-y-2">
            <h1 className="text-[1.75rem] font-extrabold font-display tracking-tight text-foreground">
              {isSignUp ? 'Créer un compte' : 'Bon retour !'}
            </h1>
            <p className="text-muted-foreground text-[15px]">
              {invitationToken
                ? 'Complétez votre inscription pour rejoindre l\'équipe'
                : isSignUp
                  ? 'Inscription uniquement via un lien d\'invitation'
                  : 'Connectez-vous à votre espace de travail'}
            </p>
          </div>

          <Card className="shadow-elevated border-border/40 rounded-2xl overflow-hidden">
            <CardHeader className="lg:hidden pb-2">
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
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-sm font-medium">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jean Dupont" required maxLength={255}
                          className="pl-10 h-11 bg-muted/30 border-border/50 focus:bg-background transition-colors rounded-xl"
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">Adresse email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        placeholder="jean@cabinet.com" required disabled={isSignUp && !!invitationToken}
                        className="pl-10 h-11 bg-muted/30 border-border/50 focus:bg-background transition-colors rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => navigate('/forgot-password')}
                          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          Mot de passe oublié ?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="password" type="password" value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="••••••••" required minLength={8}
                        className="pl-10 h-11 bg-muted/30 border-border/50 focus:bg-background transition-colors rounded-xl"
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

                  <Button type="submit" className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all" disabled={loading || isLocked || signUpBlocked} style={{ background: 'var(--gradient-primary)' }}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Chargement...
                      </span>
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
                <div className="mt-6 pt-6 border-t border-border/40 text-center text-sm">
                  <span className="text-muted-foreground">
                    {isSignUp ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
                  </span>{' '}
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setPasswordErrors([]); }}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    {isSignUp ? 'Se connecter' : "S'inscrire"}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 text-muted-foreground/40">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Shield className="h-3.5 w-3.5" />
              <span>Chiffré SSL</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-[11px]">
              <Lock className="h-3.5 w-3.5" />
              <span>Données sécurisées</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
