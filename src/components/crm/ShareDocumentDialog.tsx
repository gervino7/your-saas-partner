import { useRef, useState } from 'react';
import { Info, Upload, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatFileSize } from '@/lib/fileUtils';
import { ACCEPT_ATTR, DOC_CATEGORIES, titleFromFileName, validateFile } from '@/lib/portalDocs';
import { useShareDocument } from '@/hooks/useClientDocuments';

interface Props {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareDocumentDialog({ clientId, open, onOpenChange }: Props) {
  const share = useShareDocument(clientId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('autre');
  const [description, setDescription] = useState('');
  const [dragging, setDragging] = useState(false);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const err = validateFile(f);
    if (err) { toast.error(err); return; }
    setFile(f);
    if (!title) setTitle(titleFromFileName(f.name));
  };

  const reset = () => { setFile(null); setTitle(''); setCategory('autre'); setDescription(''); };

  const submit = async () => {
    if (!file || !title.trim()) return;
    await share.mutateAsync({ file, title: title.trim(), category, description: description.trim() });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager un document</DialogTitle>
          <DialogDescription>Téléversez un document destiné spécifiquement à ce client.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm transition-colors ${dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}`}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            {file ? (
              <p className="font-medium">{file.name} <span className="text-muted-foreground">({formatFileSize(file.size)})</span></p>
            ) : (
              <>
                <p>Glissez un fichier ici ou cliquez pour parcourir</p>
                <p className="text-xs text-muted-foreground">PDF, images, Excel, Word, CSV, ZIP - 25 Mo max</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ACCEPT_ATTR}
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-title">Titre *</Label>
            <Input id="share-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DOC_CATEGORIES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-desc">Description</Label>
            <Textarea id="share-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optionnel" />
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Ce document sera visible et téléchargeable par les contacts disposant d'un accès à l'espace client.
              Vérifiez qu'il ne contient aucun élément de travail interne.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!file || !title.trim() || share.isPending}>
            <Send className="mr-2 h-4 w-4" /> {share.isPending ? 'Partage en cours…' : 'Partager'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
