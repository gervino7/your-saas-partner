import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle2, Download, FileText, Info, Plus, Send, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import PortalLayout from '@/components/portal/PortalLayout';
import { formatFileSize } from '@/lib/fileUtils';
import { ACCEPT_ATTR, DOC_CATEGORIES, categoryLabel, titleFromFileName, validateFile } from '@/lib/portalDocs';
import {
  useDownloadPortalDoc,
  useMyPortalDocuments,
  usePortalIdentity,
  useUploadPortalDoc,
} from '@/hooks/usePortalDocuments';

const fmt = (v: string | null) => (v ? format(new Date(v), 'dd MMM yyyy', { locale: fr }) : '-');

export default function PortalDocumentsPage() {
  const { data: identity } = usePortalIdentity();
  const { data, isLoading } = useMyPortalDocuments();
  const download = useDownloadPortalDoc();
  const upload = useUploadPortalDoc();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('autre');
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    const err = validateFile(f);
    if (err) { toast.error(err); return; }
    setFile(f);
    if (!title) setTitle(titleFromFileName(f.name));
  };

  const reset = () => { setFile(null); setTitle(''); setCategory('autre'); };

  const submit = async () => {
    if (!file || !title.trim()) return;
    await upload.mutateAsync({ file, title: title.trim(), category });
    reset();
    setOpen(false);
  };

  const received = data?.received ?? [];
  const sent = data?.sent ?? [];

  return (
    <PortalLayout clientName={identity?.full_name ?? null}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Mes documents</h1>
            <p className="text-sm text-muted-foreground">Documents échangés avec votre cabinet.</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Envoyer un document
          </Button>
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <Tabs defaultValue="received">
            <TabsList>
              <TabsTrigger value="received">Reçus du cabinet</TabsTrigger>
              <TabsTrigger value="sent">Envoyés au cabinet</TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="mt-4 space-y-4">
              {received.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Aucun document"
                  description="Votre cabinet n'a pas encore partagé de document avec vous."
                />
              ) : (
                received.map((d) => (
                  <Card key={d.id}>
                    <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {!d.first_downloaded_at && (
                            <span className="h-2 w-2 rounded-full bg-accent" aria-label="Nouveau" />
                          )}
                          {d.title}
                        </CardTitle>
                        <Badge variant="outline">{categoryLabel(d.category)}</Badge>
                      </div>
                      <Button onClick={() => download.mutate(d.id)} disabled={download.isPending}>
                        <Download className="mr-2 h-4 w-4" /> Télécharger
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      {d.description && <p>{d.description}</p>}
                      <p>{d.file_name} - {formatFileSize(d.file_size)}</p>
                      <p>Reçu le {fmt(d.uploaded_at)}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="sent" className="mt-4 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  Si votre comptable vous a demandé des pièces précises, indiquez-le dans le titre
                  pour faciliter le traitement.
                </p>
              </div>
              {sent.length === 0 ? (
                <EmptyState
                  icon={Upload}
                  title="Aucun envoi"
                  description="Vous n'avez encore transmis aucun document."
                />
              ) : (
                <Card>
                  <CardContent className="divide-y p-0">
                    {sent.map((d) => (
                      <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <p className="font-medium">{d.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {categoryLabel(d.category)} · {d.file_name} · {fmt(d.uploaded_at)}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 text-sm font-medium text-success">
                          <CheckCircle2 className="h-4 w-4" /> Transmis
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer un document</DialogTitle>
            <DialogDescription>Votre comptable sera informé de votre envoi.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 p-6 text-center text-sm"
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
              <input ref={inputRef} type="file" className="hidden" accept={ACCEPT_ATTR} onChange={(e) => pick(e.target.files?.[0])} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-doc-title">Titre *</Label>
              <Input id="portal-doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={!file || !title.trim() || upload.isPending}>
              <Send className="mr-2 h-4 w-4" /> {upload.isPending ? 'Envoi…' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
