import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, Ban, X, Eye, Plus, Loader2, Upload, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import {
  usePeriodDocuments, useGenerateChecklist, useUpdateDocument, useAddManualDocument,
  getObligationDocUrl, type PeriodDocument,
} from '@/hooks/useObligationDocs';
import { docStatusBadgeClasses, docStatusLabel, DOC_SOURCE_LABELS } from '@/lib/obligations';
import { cn } from '@/lib/utils';

const openFile = async (doc: PeriodDocument) => {
  if (!doc.file_path) {
    toast.error('Aucun fichier associé');
    return;
  }
  const url = await getObligationDocUrl(doc.file_path);
  if (!url) {
    toast.error('Impossible d’ouvrir le fichier');
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

// ── Dialog : marquer une pièce reçue (hors portail) ──
const ReceiveDocDialog = ({ doc, periodId, open, onOpenChange }: {
  doc: PeriodDocument;
  periodId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const profile = useAuthStore((s) => s.profile);
  const update = useUpdateDocument();
  const [source, setSource] = useState<string>('email');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      let file_path: string | null = doc.file_path ?? null;
      let file_name: string | null = doc.file_name ?? null;
      if (file) {
        const path = `${profile?.organization_id}/obligations/${periodId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('documents').upload(path, file);
        if (error) throw error;
        file_path = path;
        file_name = file.name;
      }
      await update.mutateAsync({
        id: doc.id,
        periodId,
        status: 'recue',
        source,
        file_path,
        file_name,
        reject_reason: null,
        validated_at: new Date().toISOString(),
        validated_by: profile?.id ?? null,
      });
      toast.success('Pièce marquée reçue');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Réception de « {doc.label} »</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Source *</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="physique">Physique</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Fichier (optionnel)</Label>
            <Input className="mt-1" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-[11px] text-muted-foreground mt-1">
              Une pièce physique peut être marquée reçue sans fichier.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={confirm} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Confirmer la réception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Dialog : rejeter un dépôt ──
const RejectDocDialog = ({ doc, periodId, open, onOpenChange }: {
  doc: PeriodDocument;
  periodId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) => {
  const update = useUpdateDocument();
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Rejeter « {doc.label} »</DialogTitle></DialogHeader>
        <div>
          <Label className="text-xs">Motif du rejet *</Label>
          <Textarea
            className="mt-1"
            rows={3}
            placeholder="Document illisible, incomplet, mauvaise période…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground mt-1">Le client sera invité à redéposer la pièce.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || update.isPending}
            onClick={() => update.mutate(
              { id: doc.id, periodId, status: 'rejetee', reject_reason: reason.trim() },
              { onSuccess: () => { toast.success('Pièce rejetée'); onOpenChange(false); } },
            )}
          >
            Rejeter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface Props { periodId: string }

const DocumentChecklist = ({ periodId }: Props) => {
  const profile = useAuthStore((s) => s.profile);
  const { data, isLoading, refetch } = usePeriodDocuments(periodId);
  const generate = useGenerateChecklist();
  const update = useUpdateDocument();
  const addManual = useAddManualDocument();
  const generatedFor = useRef<string | null>(null);

  const [receiveDoc, setReceiveDoc] = useState<PeriodDocument | null>(null);
  const [rejectDoc, setRejectDoc] = useState<PeriodDocument | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newRequired, setNewRequired] = useState(true);

  const docs = data?.documents ?? [];
  const progress = data?.progress ?? { total_required: 0, received_required: 0, pending_validation: 0 };

  useEffect(() => {
    console.log('[Pieces] period:', periodId, 'docs:', docs.length, 'loading:', isLoading);
  }, [periodId, docs.length, isLoading]);

  useEffect(() => {
    if (isLoading || !data) return;
    if (generatedFor.current === periodId) return;
    generatedFor.current = periodId;

    const documents = docs;
    console.log('[Pieces] periodId:', periodId, 'existing docs:', documents.length, '→ generating:', documents.length === 0);
    if (documents.length > 0) return;

    generate.mutate(periodId, {
      onSuccess: async (count) => {
        console.log('[Pieces] generate_period_documents created', count, 'rows');
        const res = await refetch();
        console.log('[Pieces] after refetch docs:', res.data?.documents.length ?? 0);
      },
      onError: (e) => {
        console.error('[Pieces] generate_period_documents failed:', e);
        generatedFor.current = null;
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, data, periodId]);


  const pct = progress.total_required > 0
    ? Math.round((progress.received_required / progress.total_required) * 100)
    : 0;
  const complete = progress.total_required > 0 && progress.received_required === progress.total_required;

  const validate = (d: PeriodDocument) => update.mutate({
    id: d.id, periodId, status: 'recue', reject_reason: null,
    validated_at: new Date().toISOString(), validated_by: profile?.id ?? null,
  }, { onSuccess: () => toast.success('Pièce validée') });

  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Pièces justificatives</Label>

      {(isLoading || generate.isPending) && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Préparation de la checklist…
        </div>
      )}

      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span>Pièces reçues : <b>{progress.received_required}</b> / {progress.total_required}</span>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
        <Progress value={pct} className={cn(complete && '[&>div]:bg-green-600')} />
        {progress.pending_validation > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {progress.pending_validation} pièce(s) déposée(s) en attente de validation
          </p>
        )}
      </div>

      <div className="mt-3 rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Statut</TableHead>
              <TableHead>Pièce</TableHead>
              <TableHead className="w-24">Source</TableHead>
              <TableHead className="w-24">Fichier</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 && !isLoading && !generate.isPending && (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground italic text-center py-4">
                  Aucune pièce définie pour cette échéance.
                </TableCell>
              </TableRow>
            )}
            {docs.map((d) => (
              <TableRow key={d.id} className={cn(d.status === 'non_applicable' && 'opacity-50')}>
                <TableCell>
                  <Badge variant="outline" className={docStatusBadgeClasses(d.status)}>
                    {docStatusLabel(d.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {d.label}
                    {d.is_required && <span className="text-destructive ml-0.5">*</span>}
                  </div>
                  {d.status === 'recue' && d.validated_at && (
                    <div className="text-[11px] text-muted-foreground">
                      Validée le {format(new Date(d.validated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      {d.validated_by_name && <> par {d.validated_by_name}</>}
                    </div>
                  )}
                  {d.status === 'rejetee' && d.reject_reason && (
                    <div className="text-[11px] text-destructive">Motif : {d.reject_reason}</div>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {d.source ? <Badge variant="secondary">{DOC_SOURCE_LABELS[d.source] ?? d.source}</Badge> : '-'}
                </TableCell>
                <TableCell>
                  {(d.file_path || d.document_id) ? (
                    <Button size="sm" variant="link" className="px-0" onClick={() => openFile(d)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Voir
                    </Button>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 flex-wrap">
                    {(d.status === 'attendue' || d.status === 'rejetee') && (
                      <Button size="sm" variant="outline" className="text-green-700 border-green-300"
                        onClick={() => setReceiveDoc(d)}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Cocher reçue
                      </Button>
                    )}
                    {d.status === 'attendue' && (
                      <Button size="sm" variant="ghost"
                        onClick={() => update.mutate({ id: d.id, periodId, status: 'non_applicable' })}>
                        <Ban className="h-3.5 w-3.5 mr-1" /> N/A
                      </Button>
                    )}
                    {d.status === 'deposee' && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-700 border-green-300"
                          onClick={() => validate(d)}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Valider
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectDoc(d)}>
                          <X className="h-3.5 w-3.5 mr-1" /> Rejeter
                        </Button>
                      </>
                    )}
                    {(d.status === 'recue' || d.status === 'non_applicable') && (
                      <Button size="sm" variant="ghost"
                        onClick={() => update.mutate({
                          id: d.id, periodId, status: 'attendue',
                          validated_at: null, validated_by: null,
                        })}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Dévalider
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {adding ? (
        <div className="mt-2 flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/30">
          <div className="flex-1 min-w-52">
            <Label className="text-xs">Libellé de la pièce</Label>
            <Input className="mt-1" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={newRequired} onCheckedChange={setNewRequired} />
            <Label className="text-xs">Requise</Label>
          </div>
          <Button
            size="sm"
            disabled={!newLabel.trim() || addManual.isPending}
            onClick={() => addManual.mutate(
              { periodId, label: newLabel.trim(), is_required: newRequired },
              { onSuccess: () => { setNewLabel(''); setAdding(false); } },
            )}
          >
            Ajouter
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuler</Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter une pièce
        </Button>
      )}

      {receiveDoc && (
        <ReceiveDocDialog
          doc={receiveDoc}
          periodId={periodId}
          open={!!receiveDoc}
          onOpenChange={(o) => !o && setReceiveDoc(null)}
        />
      )}
      {rejectDoc && (
        <RejectDocDialog
          doc={rejectDoc}
          periodId={periodId}
          open={!!rejectDoc}
          onOpenChange={(o) => !o && setRejectDoc(null)}
        />
      )}
    </div>
  );
};

export default DocumentChecklist;
