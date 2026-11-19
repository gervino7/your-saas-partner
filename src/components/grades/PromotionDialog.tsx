import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

type Echelon = { echelon: string; grade: string; rang: number; sens: string };
const db = supabase as any;
const GROUPES: [string, string][] = [['promotion', 'Promotion'], ['premiere affectation', 'Première affectation'], ['retrogradation', 'Rétrogradation']];
const today = () => new Date().toISOString().slice(0, 10);

export default function PromotionDialog({ open, onOpenChange, userId, name }: { open: boolean; onOpenChange: (b: boolean) => void; userId: string; name?: string }) {
  const qc = useQueryClient();
  const [echelon, setEchelon] = useState('');
  const [date, setDate] = useState(today());
  const [motif, setMotif] = useState('');
  const [pending, setPending] = useState(false);
  const q = useQuery({ queryKey: ['echelons-promouvables', userId], enabled: open,
    queryFn: async () => { const { data, error } = await db.rpc('echelons_promouvables', { _user_id: userId }); if (error) throw new Error(error.message); return data as Echelon[]; } });
  const label = (e: Echelon) => `${e.echelon} - rang ${e.rang}, grade ${e.grade}`;

  const confirm = async () => {
    setPending(true);
    const { data, error } = await db.rpc('promouvoir_collaborateur', { _user_id: userId, _grade_echelon: echelon, _effective_from: date, _motif: motif.trim() || null });
    setPending(false);
    if (error) { toast.error(error.message); return; }
    const r = (Array.isArray(data) ? data[0] : data) ?? {};
    toast.success(r.echelon_avant
      ? `${r.collaborateur ?? name} passe de ${r.echelon_avant} (rang ${r.rang_avant}) à ${r.echelon_apres} (rang ${r.rang_apres}), exercice ${r.exercice}.`
      : `${r.collaborateur ?? name} est affecté à ${r.echelon_apres} (rang ${r.rang_apres}), exercice ${r.exercice}.`);
    ['grade-history', 'evaluation-profile', 'org-users', 'echelons-promouvables'].forEach(k => qc.invalidateQueries({ queryKey: [k] }));
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>Promouvoir {name}</DialogTitle></DialogHeader>
    <div className="space-y-4">
      <div className="space-y-1.5"><Label>Échelon visé</Label>
        <Select value={echelon || undefined} onValueChange={setEchelon}>
          <SelectTrigger><SelectValue placeholder={q.isLoading ? 'Chargement...' : 'Choisir un échelon'} /></SelectTrigger>
          <SelectContent>{GROUPES.map(([sens, titre]) => {
            const items = (q.data ?? []).filter(e => e.sens === sens);
            if (!items.length) return null;
            const warn = sens === 'retrogradation';
            return <SelectGroup key={sens}>{warn && <SelectSeparator />}<SelectLabel className={warn ? 'text-destructive' : ''}>{titre}</SelectLabel>
              {items.map(e => <SelectItem key={e.echelon} value={e.echelon} className={warn ? 'text-destructive' : ''}>{label(e)}</SelectItem>)}</SelectGroup>;
          })}</SelectContent>
        </Select>
        {q.error && <p className="text-xs text-destructive">{(q.error as Error).message}</p>}
        {q.data?.length === 0 && <p className="text-xs text-muted-foreground">Aucun échelon disponible pour la practice de ce collaborateur.</p>}
      </div>
      <div className="space-y-1.5"><Label>Date d'effet</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44 tabular-nums" /></div>
      <div className="space-y-1.5"><Label>Motif</Label><Textarea value={motif} onChange={e => setMotif(e.target.value)} placeholder="après évaluation annuelle 2026" rows={2} />
        <p className="text-xs text-muted-foreground">Facultatif mais conseillé : c'est ce qui restera lisible dans dix ans.</p></div>
    </div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Annuler</Button>
      <Button onClick={confirm} disabled={pending || !echelon || !date}>Promouvoir</Button></DialogFooter>
  </DialogContent></Dialog>;
}
