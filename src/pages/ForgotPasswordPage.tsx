import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import logoImg from '@/assets/logo.png';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast({
        title: 'Email envoyé',
        description: 'Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'email de réinitialisation. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px] space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg mb-1" style={{ background: 'var(--gradient-primary)' }}>
            <img src={logoImg} alt="Mission-DGC" className="h-9 w-9 rounded-lg object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold font-display tracking-tight text-foreground">
            Mot de passe oublié
          </h1>
          <p className="text-muted-foreground text-sm">
            Entrez votre adresse email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <Card className="shadow-elevated border-border/40 rounded-2xl overflow-hidden">
          <CardContent className="pt-6 p-8">
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Send className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Email envoyé !</h3>
                  <p className="text-sm text-muted-foreground">
                    Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un lien de réinitialisation.
                  </p>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => { setSent(false); setEmail(''); }}>
                  Renvoyer l'email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="email" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jean@cabinet.com" required
                      className="pl-10 h-11 bg-muted/30 border-border/50 focus:bg-background transition-colors rounded-xl"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20"
                  disabled={loading || !email.trim()}
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi en cours...
                    </span>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
