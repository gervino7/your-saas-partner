import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePlans } from '@/hooks/usePlans';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props { open: boolean; onOpenChange: (v: boolean) => void }

const VIDE = { nom: '', offre: '', email: '', nomDa: '', secteur: '', pays: '', ville: '' };

export default function CreateCabinetDialog({ open, onOpenChange }: Props) {
  const { data: plans = [] } = usePlans();
  const qc = useQueryClient();
  const [f, setF] = useState(VIDE);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof VIDE) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const valide = f.nom.trim().length >= 2 && !!f.offre && /\S+@\S+\.\S+/.test(f.email.trim());

  const submit = async () => {
    if (!valide) return;
    setSaving(true);
    try {
      const reglages: Record<string, string> = {};
      if (f.secteur.trim()) reglages.secteur = f.secteur.trim();
      if (f.pays.trim()) reglages.pays = f.pays.trim();
      if (f.ville.trim()) reglages.ville = f.ville.trim();
      const { data, error } = await supabase.rpc('super_admin_creer_cabinet', {
        _nom: f.nom.trim(),
        _offre: f.offre,
        _email_da: f.email.trim().toLowerCase(),
        _nom_da: f.nomDa.trim() || undefined,
        _reglages: reglages,
      });
      if (error) { toast.error(error.message); return; }
      const res = data as { jeton?: string; email_da?: string } | null;
      const { data: fn, error: fnErr } = await supabase.functions.invoke('send-invitation', { body: { token: res?.jeton } });
      qc.invalidateQueries({ queryKey: ['super-admin'] });
      qc.invalidateQueries();
      if (fnErr || fn?.error) {
        toast.error(`Cabinet créé, mais l'invitation n'a pas pu être envoyée à ${res?.email_da ?? f.email}.`);
      } else {
        toast.success(`Cabinet créé. Invitation envoyée à ${res?.email_da ?? f.email}.`);
      }
      setF(VIDE);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Créer un cabinet</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cab-nom">Nom du cabinet</Label>
            <Input id="cab-nom" value={f.nom} onChange={(e) => set('nom')(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Offre</Label>
            <Select value={f.offre} onValueChange={set('offre')}>
              <SelectTrigger><SelectValue placeholder="Choisir une offre" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.code} - {p.name} ({p.max_users} utilisateurs, {p.max_storage_gb} Go)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cab-email">E-mail du directeur associé</Label>
            <Input id="cab-email" type="email" value={f.email} onChange={(e) => set('email')(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cab-nomda">Nom du directeur associé (facultatif)</Label>
            <Input id="cab-nomda" value={f.nomDa} onChange={(e) => set('nomDa')(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="cab-sect">Secteur</Label><Input id="cab-sect" value={f.secteur} onChange={(e) => set('secteur')(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="cab-pays">Pays</Label><Input id="cab-pays" value={f.pays} onChange={(e) => set('pays')(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="cab-ville">Ville</Label><Input id="cab-ville" value={f.ville} onChange={(e) => set('ville')(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={!valide || saving}>{saving ? 'Création…' : 'Créer le cabinet'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
