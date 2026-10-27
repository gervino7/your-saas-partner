export const SCORE_LABELS: Record<number, string> = {
  1: 'Très en dessous des attentes',
  2: 'En dessous des attentes',
  3: 'Rencontre les attentes',
  4: 'Dépasse les attentes',
  5: 'Excellent / Dépasse largement les attentes',
};

export const EVAL_STATUS = {
  brouillon:           { label: 'Brouillon',           tone: 'slate'  },
  envoyee:             { label: 'Transmise',           tone: 'blue'   },
  observations_recues: { label: 'Observations reçues', tone: 'amber'  },
  revisee:             { label: 'Révisée',             tone: 'amber'  },
  validee:             { label: 'Validée',             tone: 'green'  },
  arbitrage:           { label: 'En arbitrage',        tone: 'red'    },
  cloturee:            { label: 'Clôturée',            tone: 'gray'   },
} as const;

export const EVAL_TYPES = {
  mission:   'Évaluation de mission',
  annuelle:  'Évaluation annuelle',
  fin_stage: 'Évaluation de fin de stage',
} as const;

export const PRACTICES = {
  comptable: 'Comptable',
  conseil:   'Conseil',
  juridique: 'Juridique & Fiscale',
} as const;

export const EXCHANGE_ACTIONS = {
  envoi:               'Transmission au collaborateur',
  observations:        'Observations du collaborateur',
  revision:            'Révision par l’évaluateur',
  approbation:         'Approbation du collaborateur',
  desaccord:           'Désaccord signalé',
  validation:          'Validation',
  arbitrage_demande:   'Arbitrage demandé',
  arbitrage_decision:  'Décision d’arbitrage',
} as const;

export const AGGREGATION_MODES = {
  simple: 'moyenne arithmétique',
  duree:  'pondérée par la durée des missions',
  charge: 'pondérée par la charge réelle',
} as const;

// Reproduit exactement compute_evaluation_score() côté serveur :
//   note catégorie = moyenne des sous-critères notés
//   contribution   = (note / 5) × pondération
//   score global   = somme des contributions × 100
export type SubCriterion = { id: string; label: string; score: number | null; comment: string | null };
export type Category = { id: string; code: string; label: string; weight: number; subcriteria: SubCriterion[] };

export function computeScore(categories: Category[]) {
  let total = 0, scored = 0, required = 0;
  const rows = categories.map((c) => {
    const notes = c.subcriteria.map((s) => s.score).filter((n): n is number => n != null);
    required += c.subcriteria.length;
    scored += notes.length;
    const note = notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null;
    const contribution = note == null ? 0 : (note / 5) * Number(c.weight);
    total += contribution;
    return {
      ...c,
      note,
      contribution: Math.round(contribution * 100 * 100) / 100,
      complete: notes.length === c.subcriteria.length && c.subcriteria.length > 0,
    };
  });
  return {
    rows,
    weightedScore: Math.round(total * 100 * 100) / 100,
    isComplete: required > 0 && scored === required,
    scored, required,
    progress: required ? Math.round((scored / required) * 100) : 0,
  };
}

// L'appréciation vient toujours de l'échelle du cabinet, jamais de
// seuils écrits dans le code : ils sont paramétrables par cabinet.
export function appreciationFor(score: number | null, scale: { label: string; min: number; max: number }[]) {
  if (score == null) return null;
  return scale.find((s) => score >= Number(s.min) && score <= Number(s.max)) ?? null;
}

export function exerciceLabel(ex: number, startMonth: number) {
  return startMonth === 1 ? String(ex) : `${ex}/${ex + 1}`;
}

export function currentExercice(startMonth: number, d = new Date()) {
  return d.getMonth() + 1 >= startMonth ? d.getFullYear() : d.getFullYear() - 1;
}

export const numberFR = (value: number | string | null | undefined, digits = 2) => value == null ? '-' : Number(value).toLocaleString('fr-FR', { maximumFractionDigits: digits });
export const dateFR = (value: string | null | undefined) => value ? new Date(value).toLocaleDateString('fr-FR') : '-';
export function categoryDisplay(row: { complete: boolean; note: number | null; contribution: number }) {
  const decimal = (n: number, digits: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return {
    note: row.complete && row.note != null ? decimal(row.note, 1) : '-',
    categoryScore: row.complete && row.note != null ? `${decimal(row.note / 5 * 100, 0)} %` : '-',
    contribution: decimal(row.contribution, 2),
  };
}
export function canEditEvaluation(e: { is_evaluator: boolean; is_evaluatee?: boolean; status: string }) { return e.is_evaluator && !e.is_evaluatee && ['brouillon', 'observations_recues', 'revisee'].includes(e.status); }
export function objectionValid(comment: string) { return comment.trim().length >= 10; }
export function canSignalDisagreement(round: number) { return round >= 2; }
export function objectiveStatus(rate: number) { return rate >= 100 ? 'atteint' : rate >= 50 ? 'partiellement_atteint' : 'non_atteint'; }
export function validateObjectives(rows: { title: string }[]) { return rows.length <= 5 && rows.every(r => r.title.trim().length > 0); }
export function validatePdfSelection(ids: string[]) { return ids.length > 0 && new Set(ids).size <= 25; }
export function csvCell(value: unknown) { const text = value == null ? '' : String(value); return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" : '') + text.replace(/"/g, '""') + '"'; }

// Affichage seulement : le serveur contrôle à nouveau l'ouverture du dossier.
export function canOpenDossierEvaluations(
  profile: { id: string; grade_level: number | null } | null | undefined,
  dossier: { collaborateur_id?: string | null } | null | undefined,
  obligations: { responsible_id?: string | null; is_active?: boolean | null }[],
) {
  if (!profile || !dossier) return false;
  return (profile.grade_level ?? 8) <= 2
    || dossier.collaborateur_id === profile.id
    || obligations.some(o => o.is_active !== false && o.responsible_id === profile.id);
}
