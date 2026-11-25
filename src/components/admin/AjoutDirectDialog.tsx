import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check, KeyRound } from 'lucide-react';
import { GRADE_LABELS } from '@/types/database';
import type { Grade } from '@/types/database';
import { codeErreurFonction } from '@/lib/fonctionErreur';

const GRADES = Object.keys(GRADE_LABELS) as Grade[];

const MESSAGES: Record<string, string> = {
  interdit: 'Seul le directeur associé peut ajouter un membre directement.',
  adresse_deja_utilisee: 'Cette adresse a déjà un compte.',
  quota_atteint: "Le nombre d'utilisateurs de votre offre est atteint.",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Uniquement depuis l'espace super-administrateur. */
  organizationId?: string;
}

export default function AjoutDirectDialog({ open, onOpenChange, organizationId }: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState<Grade>('AUD');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<{ nom: string; mdp: string } | null>(null);
  const [copie, setCopie] = useState(false);

  const reinitialiser = () => {
    setEmail(''); setFullName(''); setGrade('AUD'); setErreur(null); setResultat(null); setCopie(false);
  };

  const soumettre = async () => {
    setErreur(null);
    setEnvoi(true);
    const { data, error } = await supabase.functions.invoke('ajouter-membre', {
      body: { email: email.trim(), full_name: fullName.trim(), grade, ...(organizationId ? { organization_id: organizationId } : {}) },
    });
    setEnvoi(false);
    if (error || !data?.mot_de_passe_provisoire) {
      const { code } = error ? await codeErreurFonction(error) : { code: 'inconnu' };
      setErreur(MESSAGES[code] ?? "L'ajout n'a pas abouti.");
      return;
    }
    setResultat({ nom: fullName.trim(), mdp: data.mot_de_passe_provisoire });
    qc.invalidateQueries();
  };

  const fermer = () => { reinitialiser(); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && resultat) return; if (!o) fermer(); else onOpenChange(o); }}>
      <DialogContent>
        {resultat ? (
          <>
            <DialogHeader>
              <DialogTitle>Compte créé</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border bg-muted p-4">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 select-all font-mono text-2xl font-semibold tracking-wider tabular-nums">{resultat.mdp}</span>
                <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(resultat.mdp); setCopie(true); }}>
                  {copie ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />} {copie ? 'Copié' : 'Copier'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Transmettez ce mot de passe à {resultat.nom} par un canal sûr (en main propre, téléphone). Il ne sera plus affiché. {resultat.nom} devra le changer à sa première connexion.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={fermer}>J'ai noté le mot de passe</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Ajouter un membre directement</DialogTitle>
              <DialogDescription>Un mot de passe provisoire sera créé et affiché une seule fois.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Nom complet</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>Grade</Label>
                <Select value={grade} onValueChange={(v) => setGrade(v as Grade)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{g} - {GRADE_LABELS[g]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {erreur && <p className="text-sm text-destructive">{erreur}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={fermer}>Annuler</Button>
              <Button onClick={soumettre} disabled={envoi || !email.trim() || fullName.trim().length < 2}>{envoi ? 'Création...' : 'Créer le compte'}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
