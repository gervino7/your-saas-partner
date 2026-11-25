/** Lit le code d'erreur renvoyé par une fonction serveur (corps JSON { error }). */
export async function codeErreurFonction(error: unknown): Promise<{ code: string; regles?: string[] }> {
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json();
      return { code: typeof body?.error === 'string' ? body.error : 'inconnu', regles: Array.isArray(body?.regles) ? body.regles : undefined };
    } catch { /* corps illisible */ }
  }
  return { code: 'inconnu' };
}
