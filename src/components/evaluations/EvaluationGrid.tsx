import { Fragment } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RatingButtons } from './EvaluationUI';
import { computeScore, categoryDisplay, numberFR } from '@/lib/evaluation';

type Props = {
  rows: ReturnType<typeof computeScore>['rows'];
  score: number;
  editable: boolean;
  expanded: Record<string, boolean>;
  onToggleComment: (id: string) => void;
  onChange: (id: string, patch: { score?: number; comment?: string }) => void;
};

export function EvaluationGrid({ rows, score, editable, expanded, onToggleComment, onChange }: Props) {
  const cell = 'px-3 py-2.5 align-middle';
  const numeric = `${cell} text-right tabular-nums`;
  return <section aria-label="Grille d’évaluation" className="space-y-3">
    <p className="text-xs text-muted-foreground">Note = moyenne des sous-critères · Score catégorie = note ÷ 5 · Contribution = score catégorie × pondération × 100.</p>
    <div className="max-h-[65vh] overflow-auto">
      <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0 text-sm">
        <colgroup><col /><col className="w-[100px]" /><col className="w-[190px]" /><col className="w-[120px]" /><col className="w-[110px]" /><col className="w-[100px]" /></colgroup>
        <thead className="sticky top-0 z-10 bg-background"><tr>
          {['CRITÈRES', 'PONDÉRATION', 'NOTE (1-5)', 'SCORE CATÉGORIE', 'CONTRIBUTION', 'COMMENTAIRES'].map((label, i) => <th key={label} className={`border-b border-border px-3 py-3 text-[10px] font-semibold text-muted-foreground ${i === 0 ? 'text-left' : 'text-right'}`}>{label}</th>)}
        </tr></thead>
        <tbody>{rows.map(c => {
          const values = categoryDisplay(c);
          return <Fragment key={c.id}>
            <tr className="bg-muted/50 font-semibold">
              <td className={`${cell} pr-8`}>{c.code}. {c.label}</td>
              <td className={numeric}>{numberFR(c.weight * 100, 1)} %</td>
              <td className={`${numeric} ${c.complete ? '' : 'text-muted-foreground'}`}>{values.note}</td>
              <td className={`${numeric} ${c.complete ? '' : 'text-muted-foreground'}`}>{values.categoryScore}</td>
              <td className={numeric}>{values.contribution}</td><td />
            </tr>
            {c.subcriteria.map((s, i) => <Fragment key={s.id}>
              <tr className={i % 2 ? 'bg-muted/30' : ''}>
                <td className={`${cell} pl-6 pr-8`}>{s.label}</td><td />
                <td className={cell}><div className="flex justify-end"><RatingButtons score={s.score} readOnly={!editable} onChange={n => onChange(s.id, { score: n })} /></div></td>
                <td /><td /><td className={`${cell} text-right`}><Button variant="ghost" size="icon" className="h-8 w-8" title="Commentaire du sous-critère" aria-label={`Commentaire - ${s.label}`} aria-expanded={!!expanded[s.id]} onClick={() => onToggleComment(s.id)}><MessageSquare className="h-4 w-4" /></Button></td>
              </tr>
              {expanded[s.id] && <tr><td colSpan={6} className={cell}><Textarea aria-label={`Commentaire - ${s.label}`} readOnly={!editable} value={s.comment ?? ''} onChange={ev => onChange(s.id, { comment: ev.target.value })} /></td></tr>}
            </Fragment>)}
          </Fragment>;
        })}</tbody>
        <tfoot><tr className="font-semibold text-primary [&>td]:border-t [&>td]:border-primary">
          <td className={cell}>ÉVALUATION GLOBALE PONDÉRÉE</td><td className={numeric}>{numberFR(rows.reduce((sum, c) => sum + c.weight * 100, 0))} %</td><td /><td /><td className={numeric}>{score.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td />
        </tr></tfoot>
      </table>
    </div>
  </section>;
}
