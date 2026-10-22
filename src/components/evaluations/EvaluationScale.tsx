import { numberFR } from '@/lib/evaluation';

export function EvaluationScale({ score, scale }: { score: number | null; scale: { label: string; min: number; max: number }[] }) {
  const sorted = [...scale].sort((a, b) => Number(a.min) - Number(b.min));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return null;
  const min = Number(first.min), max = Number(last.max), span = Math.max(1, max - min);
  const position = (n: number) => Math.max(0, Math.min(1000, (n - min) / span * 1000));
  return <div className="space-y-2" aria-label="Échelle d’appréciation du cabinet">
    <svg viewBox="-2 0 1004 58" className="w-full" role="img" aria-label={score == null ? 'Score non disponible' : `Score ${numberFR(score)} sur l’échelle du cabinet`}>
      {sorted.map((s, i) => <g key={`${s.label}-${i}`}><title>{s.label} : {numberFR(s.min)} - {numberFR(s.max)}</title>
        <rect x={position(Number(s.min))} y={10} width={Math.max(1, position(Number(s.max)) - position(Number(s.min)) - 3)} height={15} className={score != null && score >= Number(s.min) ? 'fill-primary' : 'fill-muted'} />
        <text x={(position(Number(s.min)) + position(Number(s.max))) / 2} y={50} textAnchor="middle" className="fill-muted-foreground text-[28px]">{i + 1}</text>
      </g>)}
      {score != null && <rect x={position(score) - 2} y={3} width={4} height={29} className="fill-accent" />}
    </svg>
    <ol className="space-y-1 text-xs text-muted-foreground">{sorted.map((s, i) => <li key={`${s.label}-${i}`} className="flex justify-between gap-2"><span>{i + 1}. {s.label}</span><span className="shrink-0 tabular-nums">{numberFR(s.min)} - {numberFR(s.max)}</span></li>)}</ol>
  </div>;
}