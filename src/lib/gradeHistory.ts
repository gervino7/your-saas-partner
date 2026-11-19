export const ORIGINES: Record<string, string> = {
  promotion: 'Promotion', reprise: "Reprise d'historique", modification_fiche: 'Modification directe de la fiche',
};
/** Compare le rang d'une étape à l'étape précédente (plus ancienne). Rang plus élevé = montée. */
export function mouvement(rank?: number | null, precedent?: number | null): 'montee' | 'descente' | 'premiere' | 'stable' {
  if (precedent == null || rank == null) return 'premiere';
  return rank > precedent ? 'montee' : rank < precedent ? 'descente' : 'stable';
}
