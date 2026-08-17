export const CLIENT_OBLIGATION_STATUS = {
  pieces_a_fournir: { label: 'Pièces à fournir', color: 'amber' },
  en_cours: { label: 'En cours de traitement', color: 'blue' },
  depose: { label: 'Déposé', color: 'green' },
  na: { label: 'Non applicable', color: 'gray' },
} as const;

export const CLIENT_DOC_STATUS = {
  a_fournir: { label: 'À fournir', color: 'amber' },
  en_verification: { label: 'En vérification', color: 'blue' },
  valide: { label: 'Validé', color: 'green' },
  a_renvoyer: { label: 'À renvoyer', color: 'red' },
} as const;

export type ClientObligationStatus = keyof typeof CLIENT_OBLIGATION_STATUS;
export type ClientDocStatus = keyof typeof CLIENT_DOC_STATUS;

const CHIP: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
  gray: 'bg-muted text-muted-foreground border-border',
};

export const statusChipClass = (color: string) => CHIP[color] ?? CHIP.gray;

export const obligationStatusInfo = (s?: string | null) =>
  CLIENT_OBLIGATION_STATUS[(s ?? 'na') as ClientObligationStatus] ?? CLIENT_OBLIGATION_STATUS.na;

export const docStatusInfo = (s?: string | null) =>
  CLIENT_DOC_STATUS[(s ?? 'a_fournir') as ClientDocStatus] ?? { label: 'Non applicable', color: 'gray' };

export const formatFcfa = (v: number | null | undefined) =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(v ?? 0)))} FCFA`;
