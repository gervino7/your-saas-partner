import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';
import { codeErreurFonction } from '@/lib/fonctionErreur';

const REGLES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'Au moins 8 caractères', test: (p) => p.length >= 8 },
  { label: 'Une lettre majuscule', test: (p) => /[A-Z]/.test(p) },
  { label: 'Une lettre minuscule', test: (p) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p) => /[0-9]/.test(p) },
];

export default function ChangerMotDePassePage() {
  const navigate = useNavigate();
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const valide = REGLES.every((r) => r.test(nouveau)) && nouveau === confirmation;

  const soumettre = async () => {
    setErreur(null);
    setEnvoi(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.functions.invoke('changer-mot-de-passe-provisoire', { body: { nouveau } });
    if (error) {
      const { code, regles } = await codeErreurFonction(error);
      setEnvoi(false);
      setErreur(code === 'mot_de_passe_faible' && regles?.length ? `Règles non respectées : ${regles.join(', ')}.` : "Le changement n'a pas abouti. Réessayez.");
      return;
    }
    if (user?.email) {
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: user.email, password: nouveau });
      if (signErr) { setEnvoi(false); navigate('/login', { replace: true }); return; }
    }
    setNouveau(''); setConfirmation('');
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6">
        <h1 className="text-lg font-semibold">Mot de passe personnel</h1>
        <p className="text-sm text-muted-foreground">Votre compte a été créé avec un mot de passe provisoire. Choisissez votre mot de passe personnel.</p>
        <div className="space-y-1.5"><Label>Nouveau mot de passe</Label><Input type="password" autoComplete="new-password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Confirmation</Label><Input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></div>
        <ul className="space-y-1 text-sm">
          {REGLES.map((r) => {
            const ok = r.test(nouveau);
            return <li key={r.label} className={ok ? 'flex items-center gap-2 text-success' : 'flex items-center gap-2 text-muted-foreground'}>{ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{r.label}</li>;
          })}
          <li className={confirmation && nouveau === confirmation ? 'flex items-center gap-2 text-success' : 'flex items-center gap-2 text-muted-foreground'}>
            {confirmation && nouveau === confirmation ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}Les deux saisies sont identiques
          </li>
        </ul>
        {erreur && <p className="text-sm text-destructive">{erreur}</p>}
        <Button className="w-full" disabled={!valide || envoi} onClick={soumettre}>{envoi ? 'Enregistrement...' : 'Enregistrer mon mot de passe'}</Button>
        <Button variant="ghost" className="w-full" onClick={() => void supabase.auth.signOut()}>Se déconnecter</Button>
      </div>
    </div>
  );
}
