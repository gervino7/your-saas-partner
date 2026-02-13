export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`;
}

export function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  return '📄';
}

export function getFileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : '';
}

export async function compressImage(file: File, maxSizeBytes = 2 * 1024 * 1024): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= maxSizeBytes) return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if needed
      const maxDim = 2048;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.8
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export async function computeChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const DOC_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-muted text-muted-foreground' },
  in_review: { label: 'En revue', color: 'bg-warning/20 text-warning' },
  approved: { label: 'Approuvé', color: 'bg-success/20 text-success' },
  published: { label: 'Publié', color: 'bg-info/20 text-info' },
  archived: { label: 'Archivé', color: 'bg-muted text-muted-foreground' },
};
