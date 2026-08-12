export const DOC_CATEGORIES = {
  etats_financiers: 'États financiers',
  liasse: 'Liasse fiscale',
  attestation: 'Attestation',
  declaration: 'Déclaration',
  facture: 'Facture',
  courrier: 'Courrier',
  piece_justificative: 'Pièce justificative',
  autre: 'Autre',
} as const;

export type DocCategory = keyof typeof DOC_CATEGORIES;

export const categoryLabel = (c?: string | null) =>
  (c && DOC_CATEGORIES[c as DocCategory]) || 'Autre';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'xls', 'docx', 'csv', 'zip'];

export const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.xlsx,.xls,.docx,.csv,.zip';

export function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-120);
}

export function titleFromFileName(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

export function validateFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ACCEPTED_EXTENSIONS.includes(ext)) return 'Format de fichier non autorisé.';
  if (file.size > MAX_UPLOAD_BYTES) return 'Le fichier dépasse 25 Mo.';
  return null;
}

export const PORTAL_LOG_ACTIONS: Record<string, string> = {
  account_activated: 'Compte activé',
  document_downloaded: 'Document téléchargé',
  document_uploaded_by_client: 'Document déposé',
  document_shared_by_staff: 'Document partagé',
  access_revoked: 'Accès révoqué',
  access_restored: 'Accès rétabli',
};
