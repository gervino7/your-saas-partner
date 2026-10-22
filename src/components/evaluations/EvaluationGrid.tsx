import { Fragment } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { RatingButtons } from './EvaluationUI';
import { computeScore, numberFR } from '@/lib/evaluation';

type Props = {
  rows: ReturnType<typeof computeScore>['rows'];
  editable: boolean;
  expanded: Record<string, boolean>;
  onToggleComment: (id: string) => void;
  onChange: (id: string, patch: { score?: number; comment?: string }) => void;
};

export function EvaluationGrid({ rows, editable, expanded, onToggleComment, onChange }: Props) {
  return <Table className="min-w-[760px] table-fixed">
    <colgroup><col /><col className="w-[100px]" /><col className="w-[190px]" /><col className="w-[100px]" /><col className="w-[130px]" /></colgroup>
    <TableHeader><TableRow>
      <TableHead>Critères</TableHead><TableHead className="text-right">Pondération</TableHead>
      <TableHead className="text-center">Note (1-5)</TableHead><TableHead className="text-right">Score catégorie</TableHead>
      <TableHead className="text-right">Contribution</TableHead>
    </TableRow></TableHeader>
    <TableBody>{rows.map(c => <Fragment key={c.id}>
      <TableRow className="bg-muted/50 font-semibold">
        <TableCell>{c.code}. {c.label}</TableCell>
        <TableCell className="text-right tabular-nums">{numberFR(c.weight * 100)} %</TableCell>
        <TableCell className="text-center tabular-nums">{c.note == null ? '-' : numberFR(c.note)} / 5</TableCell>
        <TableCell className="text-right tabular-nums">{c.note == null ? '-' : `${numberFR(c.note / 5 * 100)} %`}</TableCell>
        <TableCell className="text-right tabular-nums">{numberFR(c.contribution)} pts</TableCell>
      </TableRow>
      {c.subcriteria.map(s => <Fragment key={s.id}>
        <TableRow>
          <TableCell><div className="flex items-center gap-2"><span className="flex-1 min-w-0">{s.label}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Commentaire du sous-critère" aria-label={`Commentaire - ${s.label}`} aria-expanded={expanded[s.id] || !!s.comment} onClick={() => onToggleComment(s.id)}><MessageSquare className="h-4 w-4" /></Button>
          </div></TableCell>
          <TableCell />
          <TableCell><div className="flex justify-center"><RatingButtons score={s.score} readOnly={!editable} onChange={n => onChange(s.id, { score: n })} /></div></TableCell>
          <TableCell /><TableCell />
        </TableRow>
        {(expanded[s.id] || !!s.comment) && <TableRow><TableCell colSpan={5}><Textarea aria-label={`Commentaire - ${s.label}`} readOnly={!editable} value={s.comment ?? ''} onChange={ev => onChange(s.id, { comment: ev.target.value })} /></TableCell></TableRow>}
      </Fragment>)}
    </Fragment>)}</TableBody>
  </Table>;
}