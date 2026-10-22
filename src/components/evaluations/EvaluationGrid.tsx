import { Fragment } from 'react';
import { CheckCircle2, MessageSquare } from 'lucide-react';
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
  const th = `bg-card px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground ${'border-b border-border'}`;
  return <section aria-label="Grille d’évaluation" className="space-y-3">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Grille d’évaluation</h2>
      <p className="text-xs text-muted-foreground">Note = moyenne des sous-critères · Score catégorie = note ÷ 5 · Contribution = score catégorie × pondération × 100.</p>
    </div>
    <div className="max-h-[65vh] overflow-auto rounded-md border border-border bg-card shadow-card">
      <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0 text-sm">
        <colgroup><col /><col className="w-[100px]" /><col className="w-[190px]" /><col className="w-[120px]" /><col className="w-[110px]" /><col className="w-[100px]" /></colgroup>
        <thead><tr>
          {['CRITÈRES', 'PONDÉRATION', 'NOTE (1-5)', 'SCORE CATÉGORIE', 'CONTRIBUTION', 'COMMENTAIRES'].map((label, i) => <th key={label} className={`${th} ${i === 0 ? 'text-left' : 'text-right'}`}>{label}</th>)}
        </tr></thead>
        <tbody>{rows.map((c, ci) => {
          const values = categoryDisplay(c);
          const sep = ci === 0 ? '' : '[&>td]:border-t [&>td]:border-border';
          return <Fragment key={c.id}>
            <tr className={`bg-muted/60 font-semibold ${sep}`}>
              <td className={`${cell} border-l-2 border-primary pr-6`}>
                <span className="inline-flex items-center gap-2">
                  <span className="tabular-nums text-primary">{c.code}</span>
                  <span className="text-foreground">{c.label}</span>
                  {c.complete && <CheckCircle2 aria-label="Sous-critères tous notés" className="h-3.5 w-3.5 text-accent" />}
                </span>
              </td>
              <td className={numeric}>{numberFR(c.weight * 100, 1)} %</td>
              <td className={`${numeric} ${c.complete ? '' : 'text-muted-foreground'}`}>{values.note}</td>
              <td className={`${numeric} ${c.complete ? '' : 'text-muted-foreground'}`}>{values.categoryScore}</td>
              <td className={numeric}>{values.contribution}</td><td />
            </tr>
            {c.subcriteria.map((s, i) => <Fragment key={s.id}>
              <tr className={`${i % 2 ? 'bg-muted/25' : ''} transition-colors hover:bg-muted/50`}>
                <td className={`${cell} border-l-2 border-transparent pl-8 pr-8 text-foreground/90`}>{s.label}</td><td />
                <td className={cell}><div className="flex justify-end"><RatingButtons score={s.score} readOnly={!editable} onChange={n => onChange(s.id, { score: n })} /></div></td>
                <td /><td /><td className={`${cell} text-right`}>
                  <Button variant="ghost" size="icon" className="relative h-8 w-8" title="Commentaire du sous-critère" aria-label={`Commentaire - ${s.label}`} aria-expanded={!!expanded[s.id]} onClick={() => onToggleComment(s.id)}>
                    <MessageSquare className={`h-4 w-4 ${expanded[s.id] ? 'text-primary' : ''}`} />
                    {s.comment?.trim() ? <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                  </Button>
                </td>
              </tr>
              {expanded[s.id] && <tr className={i % 2 ? 'bg-muted/25' : ''}><td colSpan={6} className={`${cell} pl-8`}><Textarea aria-label={`Commentaire - ${s.label}`} readOnly={!editable} value={s.comment ?? ''} onChange={ev => onChange(s.id, { comment: ev.target.value })} /></td></tr>}
            </Fragment>)}
          </Fragment>;
        })}</tbody>
        <tfoot><tr className="bg-muted/60 font-semibold text-primary [&>td]:border-t-2 [&>td]:border-primary">
          <td className={`${cell} border-l-2 border-primary`}>ÉVALUATION GLOBALE PONDÉRÉE</td><td className={numeric}>{numberFR(rows.reduce((sum, c) => sum + c.weight * 100, 0))} %</td><td /><td /><td className={numeric}>{score.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td />
        </tr></tfoot>
      </table>
    </div>
  </section>;
}
