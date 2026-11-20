import { supabase } from '@/integrations/supabase/client';

const DEFAULT_MESSAGE =
  "La modification n'a pas été appliquée : vous n'avez pas le droit de modifier cet élément.";

/**
 * Met à jour une ligne par son id et lève une erreur si aucune ligne n'a été
 * modifiée. Sans cette vérification, une politique de lecture qui masque la
 * ligne transforme un refus d'écriture en succès silencieux (0 ligne, 0 erreur).
 */
export async function updateByIdOrFail(
  table: string,
  id: string,
  values: Record<string, unknown>,
  message: string = DEFAULT_MESSAGE,
): Promise<void> {
  const { data, error } = await (supabase.from(table as never) as any)
    .update(values)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(message);
}

/**
 * Même précaution pour une mise à jour groupée par ids : toutes les lignes
 * demandées doivent être revenues, sinon certaines ont été masquées par la
 * politique de lecture et le refus serait passé inaperçu.
 */
export async function updateManyOrFail(
  table: string,
  ids: string[],
  values: Record<string, unknown>,
  message: string = DEFAULT_MESSAGE,
): Promise<void> {
  if (ids.length === 0) return;
  const { data, error } = await (supabase.from(table as never) as any)
    .update(values)
    .in('id', ids)
    .select('id');
  if (error) throw error;
  if (!data || data.length !== ids.length) throw new Error(message);
}
