import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PRACTICES } from '@/lib/evaluation';
import { STAFFING_ROLES } from '@/lib/staffing';
import { evaluateursDeMission, evaluateursParGrade } from '@/lib/designation';
import { useOrganizationUsers } from '@/hooks/useMissions';
import { evaluationRpc, evaluationQuery } from '@/hooks/useEvaluations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { EvaluationDialog } from './EvaluationUI';

type Portee = 'mission' | 'dossier' | 'annuelle';
const db = supabase as any;
const roleLabel = (r: string) => STAFFING_ROLES[r as keyof typeof STAFFING_ROLES]?.label ?? r;
const dateFR = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function AssignEvaluatorDialog({ open, onOpenChange, missionId = null, dossierId = null, userId = '', exercice, type }: {
  open: boolean; onOpenChange: (b: boolean) => void; missionId?: string | null; dossierId?: string | null; userId?: string; exercice?: number; type?: string;
}) {
  const qc = useQueryClient();
  const users = useOrganizationUsers();
  const initial: Portee = type === 'annuelle' ? 'annuelle' : dossierId ? 'dossier' : 'mission';
  const [portee, setPortee] = useState<Portee>(initial);
  const [mission, setMission] = useState(missionId ?? '');
  const [dossier, setDossier] = useState(dossierId ?? '');
  const [ex, setEx] = useState(exercice ?? new Date().getFullYear());
  const [target, setTarget] = useState(userId);
  const [choisis, setChoisis] = useState<string[]>([]);
  const [due, setDue] = useState('');
  const [practice, setPractice] = useState('auto');
  const [pending, setPending] = useState(false);
  const byId = useMemo(() => new Map((users.data ?? []).map(u => [u.id, u])), [users.data]);

  const missions = useQuery({ queryKey: ['designation-missions'], enabled: open && portee === 'mission' && !missionId,
    queryFn: async () => { const { data, error } = await db.from('missions').select('id, code, name').order('created_at', { ascending: false }); if (error) throw error; return data as any[]; } });
  const dossiers = useQuery({ queryKey: ['designation-dossiers'], enabled: open && portee === 'dossier' && !dossierId,
    queryFn: async () => { const { data, error } = await db.from('client_fiscal_profile').select('id, client:clients(name)').eq('is_active', true); if (error) throw error; return data as any[]; } });
  const equipe = useQuery({ queryKey: ['designation-equipe', mission], enabled: open && portee === 'mission' && !!mission,
    queryFn: async () => { const { data, error } = await db.from('mission_members').select('user_id, role').eq('mission_id', mission); if (error) throw error; return data as { user_id: string; role: string }[]; } });
  const scopeReady = portee === 'mission' ? !!mission : portee === 'dossier' ? !!dossier : !!ex;
  const existantes = useQuery({ queryKey: ['evaluation-designations', portee, mission, dossier, ex], enabled: open && scopeReady,
    queryFn: async () => {
      let q = db.from('evaluation_assignments').select('id, evaluatee_id, evaluator_id, assigned_by, created_at, status, exercice').eq('eval_type', portee).neq('status', 'annulee');
      q = portee === 'mission' ? q.eq('mission_id', mission) : portee === 'dossier' ? q.eq('dossier_id', dossier) : q.eq('exercice', ex);
      const { data, error } = await q.order('created_at', { ascending: false }); if (error) throw error; return data as any[];
    } });

  const membres = (equipe.data ?? []).filter(m => byId.has(m.user_id));
  const collaborateurs = portee === 'mission' ? membres.map(m => ({ id: m.user_id, label: `${byId.get(m.user_id)!.full_name} - ${roleLabel(m.role)}` }))
    : (users.data ?? []).map(u => ({ id: u.id, label: `${u.full_name} - ${u.grade ?? ''}` }));
  const evalueMembre = membres.find(m => m.user_id === target);
  const candidats = portee === 'mission'
    ? evaluateursDeMission(membres, evalueMembre).map(m => ({ id: m.user_id, label: `${byId.get(m.user_id)!.full_name} - ${roleLabel(m.role)}` }))
    : evaluateursParGrade(users.data ?? [], byId.get(target)).map(u => ({ id: u.id, label: `${u.full_name} - ${u.grade ?? ''}` }));
  const multiple = portee !== 'annuelle';

  const changePortee = (p: Portee) => { setPortee(p); setTarget(userId); setChoisis([]); };
  const toggle = (id: string, on: boolean) => setChoisis(c => multiple ? (on ? [...c, id] : c.filter(x => x !== id)) : (on ? [id] : []));
  const refresh = () => { qc.invalidateQueries({ predicate: evaluationQuery }); qc.invalidateQueries({ queryKey: ['evaluation-designations'] }); };

  const confirm = async () => {
    setPending(true);
    let ok = 0; const refus: string[] = [];
    for (const ev of choisis) {
      try {
        await evaluationRpc('assign_evaluator', {
          _mission_id: portee === 'mission' ? mission : null, _dossier_id: portee === 'dossier' ? dossier : null,
          _evaluatee_id: target, _evaluator_id: ev, _eval_type: portee, _exercice: portee === 'mission' ? null : ex,
          _due_date: due || null, _practice: practice === 'auto' ? null : practice,
        });
        ok++;
      } catch (e) { refus.push((e as Error).message); }
    }
    setPending(false); refresh();
    const bilan = `${ok} évaluateur${ok > 1 ? 's' : ''} désigné${ok > 1 ? 's' : ''}.`;
    if (refus.length) toast.error(`${bilan} ${refus.length} refus : ${refus.join(' ')}`); else toast.success(bilan);
    if (!refus.length) onOpenChange(false); else setChoisis([]);
  };
  const retirer = async (id: string) => {
    try { await evaluationRpc('retirer_designation', { _assignment_id: id }); toast.success('Désignation retirée.'); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return <EvaluationDialog open={open} onOpenChange={onOpenChange} title="Désigner un évaluateur" confirm="Désigner" pending={pending}
    disabled={!scopeReady || !target || choisis.length === 0} onConfirm={confirm}>
    <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">
      <div className="space-y-1.5"><Label>Portée</Label>
        <Select value={portee} onValueChange={v => changePortee(v as Portee)} disabled={!!missionId || !!dossierId || type === 'annuelle'}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="mission">Mission</SelectItem><SelectItem value="dossier">Dossier comptable</SelectItem><SelectItem value="annuelle">Annuelle et globale</SelectItem></SelectContent>
        </Select></div>

      {portee === 'mission' && !missionId && <div className="space-y-1.5"><Label>Mission</Label>
        <Select value={mission || undefined} onValueChange={v => { setMission(v); setTarget(''); setChoisis([]); }}>
          <SelectTrigger><SelectValue placeholder="Choisir une mission" /></SelectTrigger>
          <SelectContent>{missions.data?.map(m => <SelectItem key={m.id} value={m.id}>{m.code} - {m.name}</SelectItem>)}</SelectContent>
        </Select></div>}
      {portee === 'dossier' && !dossierId && <div className="space-y-1.5"><Label>Dossier comptable</Label>
        <Select value={dossier || undefined} onValueChange={v => { setDossier(v); setChoisis([]); }}>
          <SelectTrigger><SelectValue placeholder="Choisir un dossier" /></SelectTrigger>
          <SelectContent>{dossiers.data?.map(d => <SelectItem key={d.id} value={d.id}>{d.client?.name ?? 'Dossier'}</SelectItem>)}</SelectContent>
        </Select></div>}
      {portee !== 'mission' && <div className="space-y-1.5"><Label>Exercice</Label>
        <Input type="number" className="w-28 tabular-nums" min={2000} max={2100} value={ex} disabled={!!exercice} onChange={e => setEx(Number(e.target.value))} /></div>}

      {scopeReady && <div className="space-y-1.5">
        <Label>Désignations existantes</Label>
        <div className="border rounded-md divide-y text-sm">
          {existantes.data?.map(a => <div key={a.id} className="flex items-center gap-2 px-3 min-h-11">
            <div className="flex-1 min-w-0"><span className="font-medium">{byId.get(a.evaluator_id)?.full_name ?? '-'}</span> évalue <span className="font-medium">{byId.get(a.evaluatee_id)?.full_name ?? '-'}</span>
              <div className="text-xs text-muted-foreground">Désigné par {byId.get(a.assigned_by)?.full_name ?? '-'} le {dateFR(a.created_at)}</div></div>
            {a.status === 'a_faire' && <Button size="icon" variant="ghost" aria-label="Retirer la désignation" onClick={() => retirer(a.id)}><X className="h-4 w-4" /></Button>}
          </div>)}
          {existantes.data?.length === 0 && <p className="px-3 py-3 text-muted-foreground">Aucune désignation pour cette portée.</p>}
        </div></div>}

      {scopeReady && <div className="space-y-1.5"><Label>Collaborateur évalué</Label>
        <Select value={target || undefined} disabled={!!userId} onValueChange={v => { setTarget(v); setChoisis([]); }}>
          <SelectTrigger><SelectValue placeholder="Choisir un collaborateur" /></SelectTrigger>
          <SelectContent>{collaborateurs.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
        </Select></div>}

      {target && <div className="space-y-1.5"><Label>{multiple ? 'Évaluateurs' : 'Évaluateur'}</Label>
        {candidats.length === 0 ? <p className="text-sm text-muted-foreground">{portee === 'mission' ? 'Personne dans cette équipe ne domine ce collaborateur par son rôle.' : 'Aucun collaborateur de grade supérieur.'}</p>
          : <div className="border rounded-md divide-y">{candidats.map(c => <label key={c.id} className="flex items-center gap-3 px-3 min-h-11 text-sm cursor-pointer">
            <Checkbox checked={choisis.includes(c.id)} onCheckedChange={v => toggle(c.id, !!v)} />{c.label}</label>)}</div>}
        {!multiple && <p className="text-xs text-muted-foreground">Un seul évaluateur annuel par collaborateur et par exercice.</p>}
      </div>}

      <div className="space-y-1.5"><Label>Échéance</Label><Input aria-label="Échéance" type="date" value={due} onChange={e => setDue(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Practice de l'évaluation</Label>
        <Select value={practice} onValueChange={setPractice}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="auto">Selon la mission ou le dossier</SelectItem>{Object.entries(PRACTICES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select></div>
    </div>
  </EvaluationDialog>;
}
