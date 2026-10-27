import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { evaluationRpc, type EvaluationData, useOpenDossierEvaluations } from '@/hooks/useEvaluations';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { EvaluationStatus, QueryState } from './EvaluationUI';
import { numberFR, PRACTICES } from '@/lib/evaluation';

export default function DossierEvaluations({ dossierId, clientName, canOpen }: {
  dossierId: string; clientName?: string; canOpen: boolean;
}) {
  const p = useAuthStore(s => s.profile);
  const start = useOpenDossierEvaluations();
  const nav = useNavigate();
  const q = useQuery({
    queryKey: ['dossier-evaluations', dossierId, p?.id],
    enabled: !!p?.id && canOpen,
    queryFn: () => evaluationRpc<EvaluationData[]>('get_dossier_evaluations', { _dossier_id: dossierId }),
  });
  if (!canOpen) return null;
  return <section className="border-t pt-5 space-y-4">
    <div className="flex gap-3 flex-wrap justify-between items-start">
      <h3 className="font-semibold">Évaluations du dossier comptable</h3>
      <div className="flex flex-col gap-2 items-end max-w-full">
        <p className="text-xs text-muted-foreground">La grille appliquée sera celle de la practice déduite des obligations du dossier.</p>
        <Button variant="outline" className="whitespace-normal h-auto min-h-10 text-left" disabled={start.isPending} onClick={() => start.mutate({ _dossier_id: dossierId }, {
          onSuccess: r => toast.success(`${r.created ?? 0} affectation(s) créée(s) sur ${r.dossier ?? clientName ?? 'le dossier'} - exercice ${r.periode ?? '-'}${r.practice ? ` - ${PRACTICES[r.practice as keyof typeof PRACTICES] ?? r.practice}` : ''}${r.profils_incomplets > 0 ? ` · ${r.profils_incomplets} collaborateur(s) sans practice ou échelon ne pourront pas être évalués.` : ''}`),
        })}>Ouvrir les évaluations du dossier</Button>
      </div>
    </div>
    <QueryState loading={q.isLoading} error={q.error} />
    <Table><TableHeader><TableRow><TableHead>Collaborateur</TableHead><TableHead>Évaluateur</TableHead><TableHead>Statut</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
      <TableBody>{q.data?.map(r => <TableRow key={r.id} className="h-11">
        <TableCell><Button variant="link" className="p-0 h-auto" onClick={() => nav(`/evaluations/${r.id}`)}>{r.evaluatee?.full_name}</Button></TableCell>
        <TableCell>{r.evaluator?.full_name}</TableCell><TableCell><EvaluationStatus status={r.status} /></TableCell><TableCell className="tabular-nums">{numberFR(r.weighted_score)}</TableCell>
      </TableRow>)}{q.data?.length === 0 && <TableRow><TableCell colSpan={4} className="py-5 text-muted-foreground">Aucune évaluation ouverte sur ce dossier.</TableCell></TableRow>}</TableBody>
    </Table>
  </section>;
}