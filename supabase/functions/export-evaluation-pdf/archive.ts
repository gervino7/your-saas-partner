// Archive variants come only from the authorized RPC response, never the request.
export function archiveVariant(data: { lecteur?: { role?: string } }): string {
  const role = data.lecteur?.role;
  if (role === 'collaborateur') return 'collaborateur';
  if (role === 'evaluateur' || role === 'direction') return 'interne';
  throw new Error('Accès refusé : rôle du lecteur absent');
}

export function evaluationArchivePath(data: any): string | null {
  const ev = data.evaluation;
  if (!ev || !['validee', 'cloturee'].includes(ev.statut) || !data.organization_id) return null;
  return `${data.organization_id}/${ev.exercice ?? 'sans-exercice'}/evaluation-${ev.id}-${archiveVariant(data)}-v2.enc`;
}

async function archiveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptArchive(bytes: Uint8Array, secret: string, path: string): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(path) },
    await archiveKey(secret), new Uint8Array(bytes),
  );
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}

export async function decryptArchive(bytes: Uint8Array, secret: string, path: string): Promise<Uint8Array> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: new TextEncoder().encode(path) },
    await archiveKey(secret), bytes.slice(12),
  );
  return new Uint8Array(decrypted);
}