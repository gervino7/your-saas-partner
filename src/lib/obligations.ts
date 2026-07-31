export const OBLIGATION_STATUS = {
  a_faire:          { label: 'À faire',           color: 'slate'   },
  pieces_attendues: { label: 'Pièces attendues',  color: 'amber'   },
  pieces_recues:    { label: 'Pièces reçues',     color: 'sky'     },
  saisie:           { label: 'Saisie en cours',   color: 'blue'    },
  revision:         { label: 'En révision',       color: 'violet'  },
  pret:             { label: 'Prêt à déposer',    color: 'emerald' },
  depose:           { label: 'Déposé',            color: 'green'   },
  na:               { label: 'Non applicable',    color: 'gray'    },
} as const;

export type ObligationStatus = keyof typeof OBLIGATION_STATUS;

export const STATUS_FLOW: ObligationStatus[] = [
  'a_faire', 'pieces_attendues', 'pieces_recues', 'saisie', 'revision', 'pret', 'depose',
];

const CLASS_MAP: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  sky: 'bg-sky-100 text-sky-800 border-sky-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  violet: 'bg-violet-100 text-violet-800 border-violet-200',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function statusBadgeClasses(status: string): string {
  const s = OBLIGATION_STATUS[status as ObligationStatus];
  return CLASS_MAP[s?.color ?? 'gray'] ?? CLASS_MAP.gray;
}

export function statusLabel(status: string): string {
  return OBLIGATION_STATUS[status as ObligationStatus]?.label ?? status;
}

export function nextStatus(current: string): ObligationStatus | null {
  const idx = STATUS_FLOW.indexOf(current as ObligationStatus);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

export const PERIODICITE_LABELS: Record<string, string> = {
  mensuelle: 'Mensuelle',
  trimestrielle: 'Trimestrielle',
  semestrielle: 'Semestrielle',
  annuelle: 'Annuelle',
  ponctuelle: 'Ponctuelle',
};

export const CATEGORY_LABELS: Record<string, string> = {
  fiscal: 'Fiscal',
  social: 'Social',
  comptable: 'Comptable',
  juridique: 'Juridique',
};

export const REGIMES = [
  { value: 'reel_normal', label: 'Réel normal' },
  { value: 'reel_simplifie', label: 'Réel simplifié' },
  { value: 'micro_entreprise', label: 'Micro-entreprise' },
  { value: 'exonere', label: 'Exonéré' },
  { value: 'autre', label: 'Autre' },
];

export const TAXPAYER_CATEGORIES = [
  { value: 'DGE', label: 'DGE' },
  { value: 'CME', label: 'CME' },
  { value: 'CDI', label: 'CDI' },
  { value: 'autre', label: 'Autre' },
];

export function formatDeadline(t: {
  periodicite: string;
  deadline_day: number | null;
  deadline_month: number | null;
  deadline_offset_months: number | null;
}): string {
  const d = t.deadline_day ?? 15;
  if (t.periodicite === 'annuelle') {
    return `Le ${d}/${t.deadline_month ?? 6} de l'année suivante`;
  }
  const off = t.deadline_offset_months ?? 1;
  return off > 0 ? `Le ${d} du mois suivant` : `Le ${d} du mois`;
}
