import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, CircleDot, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QueryState } from '@/components/evaluations/EvaluationUI';
import { mouvement, ORIGINES } from '@/lib/gradeHistory';

const db = supabase as any;
const dateFR = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const ICONES = { montee: ArrowUp, descente: ArrowDown, premiere: CircleDot, stable: Minus };
const TEXTES = { montee: 'Montée', descente: 'Descente', premiere: 'Première affectation', stable: 'Sans changement de rang' };

export default function GradeHistory({ userId }: { userId: string }) {
  const q = useQuery({ queryKey: ['grade-history', userId], queryFn: async () => {
    const { data, error } = await db.from('grade_history').select('*, decideur:profiles!grade_history_decided_by_fkey(full_name)').eq('user_id', userId).order('effective_from', { ascending: false });
    if (error) throw new Error(error.message); return data as any[];
  } });
  const rows = q.data ?? [];
  return <div className="space-y-3">
    <QueryState loading={q.isLoading} error={q.error} />
    {q.data && rows.length === 0 && <p className="text-sm text-muted-foreground">Aucun parcours à afficher.</p>}
    <ol className="relative border-l border-border ml-3">
      {rows.map((r, i) => {
        const m = mouvement(r.rank, rows[i + 1]?.rank);
        const Icon = ICONES[m];
        return <li key={r.id} className="ml-6 pb-6">
          <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border bg-background ${m === 'descente' ? 'text-destructive border-destructive/40' : m === 'montee' ? 'text-accent border-accent/40' : 'text-primary border-primary/40'}`} title={TEXTES[m]}><Icon className="h-3.5 w-3.5" /></span>
          <p className="text-xl font-semibold text-primary tabular-nums">{r.exercice ?? '-'}</p>
          <p className="text-sm font-medium">{r.grade_echelon ?? '-'} - rang {r.rank ?? '-'}, grade {r.grade ?? '-'}</p>
          <p className="text-xs text-muted-foreground">Effet au {dateFR(r.effective_from)} - décidé par {r.decideur?.full_name ?? 'non renseigné'} - {ORIGINES[r.origine] ?? r.origine}</p>
          {r.motif && <blockquote className="mt-1 border-l-2 border-accent pl-3 text-sm italic text-muted-foreground">{r.motif}</blockquote>}
        </li>;
      })}
    </ol>
  </div>;
}
