import { useState, useCallback, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUploadDocument } from '@/hooks/useDocuments';
import { compressImage, computeChecksum, formatFileSize } from '@/lib/fileUtils';

interface UploadZoneProps {
  folderId?: string | null;
  missionId?: string;
  projectId?: string;
  activityId?: string;
  visibilityGrade?: number;
  onDone?: () => void;
}

interface FileEntry {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function UploadZone({ folderId, missionId, projectId, activityId, visibilityGrade, onDone }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();

  const addFiles = useCallback(async (fileList: FileList) => {
    const entries: FileEntry[] = Array.from(fileList).map((f) => ({ file: f, progress: 0, status: 'pending' as const }));
    setFiles((prev) => [...prev, ...entries]);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      setFiles((prev) => prev.map((f) => f.file === entry.file ? { ...f, status: 'uploading', progress: 30 } : f));

      try {
        const compressed = await compressImage(entry.file);
        setFiles((prev) => prev.map((f) => f.file === entry.file ? { ...f, progress: 60 } : f));

        const checksum = await computeChecksum(compressed);
        setFiles((prev) => prev.map((f) => f.file === entry.file ? { ...f, progress: 80 } : f));

        await upload.mutateAsync({
          file: compressed,
          folderId,
          missionId,
          projectId,
          activityId,
          visibilityGrade,
          checksum,
        });

        setFiles((prev) => prev.map((f) => f.file === entry.file ? { ...f, status: 'done', progress: 100 } : f));
      } catch (err: any) {
        setFiles((prev) => prev.map((f) => f.file === entry.file ? { ...f, status: 'error', error: err.message } : f));
      }
    }
    onDone?.();
  }, [upload, folderId, missionId, projectId, activityId, visibilityGrade, onDone]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const clearDone = () => setFiles((prev) => prev.filter((f) => f.status !== 'done'));

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Glissez vos fichiers ici ou <span className="text-accent font-medium">cliquez pour parcourir</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">Images compressées automatiquement au-delà de 2 Mo</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 bg-card rounded-md p-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{entry.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(entry.file.size)}</p>
              </div>
              {entry.status === 'uploading' && <Progress value={entry.progress} className="w-24 h-2" />}
              {entry.status === 'done' && <span className="text-xs text-success font-medium">✓</span>}
              {entry.status === 'error' && <span className="text-xs text-destructive">{entry.error}</span>}
            </div>
          ))}
          {files.some((f) => f.status === 'done') && (
            <Button variant="ghost" size="sm" onClick={clearDone}>
              <X className="h-3.5 w-3.5 mr-1" /> Effacer terminés
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
