import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, Check, Eye, Paperclip, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useDepositsInbox, useReviewDeposits, getDepositUrl,
  type FreeUpload, type PendingDeposit,
} from '@/hooks/useDepositsInbox';
import RejectDepositDialog from '@/components/depots/RejectDepositDialog';
import AttachToObligationDialog from '@/components/depots/AttachToObligationDialog';
import { cn } from '@/lib/utils';

const DepotsPage = () => {
  const [onlyMine, setOnlyMine] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [rejectIds, setRejectIds] = useState<string[]>([]);
  const [rejectLabel, setRejectLabel] = useState<string | null>(null);
  const [attachUpload, setAttachUpload] = useState<FreeUpload | null>(null);

  const { data, isLoading } = useDepositsInbox(onlyMine);
  const review = useReviewDeposits();

  const pending = data?.pending ?? [];
  const freeUploads = data?.free_uploads ?? [];
  const pendingTotal = data?.counts.pending_total ?? 0;

  const groups = useMemo(() => {
    const map = new Map<string, { client_name: string; rows: PendingDeposit[] }>();
    pending.forEach((row) => {
      const entry = map.get(row.client_id) ?? { client_name: row.client_name, rows: [] };
      entry.rows.push(row);
      map.set(row.client_id, entry);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].client_name.localeCompare(b[1].client_name));
  }, [pending]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const openFile = async (path: string | null, source?: string | null) => {
    const url = await getDepositUrl(path, source);
    if (!url) { toast.error('Fichier introuvable dans le coffre documentaire.'); return; }
    window.open(url, '_blank', 'noopener');
  };

  const validate = async (ids: string[]) => {
    const periodIds = Array.from(
      new Set(pending.filter((p) => ids.includes(p.document_id)).map((p) => p.period_id)),
    );
    const { data: before } = await supabase
      .from('obligation_periods').select('id, status').in('id', periodIds);

    try {
      await review.mutateAsync({ documentIds: ids, action: 'validate' });
    } catch { return; }

    const { data: after } = await supabase
      .from('obligation_periods').select('id, status').in('id', periodIds);

    const completed = (after ?? []).find((p) => {
      const prev = (before ?? []).find((b) => b.id === p.id);
      return prev && prev.status !== p.status && p.status === 'pieces_recues';
    });

    let message = `${ids.length} pièce(s) validée(s).`;
    if (completed) {
      const row = pending.find((p) => p.period_id === completed.id);
      if (row) message += ` Toutes les pièces de ${row.obligation_code} ${row.period_label} sont réunies.`;
    }
    toast.success(message);
    setSelected((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const openReject = (ids: string[], label?: string | null) => {
    setRejectIds(ids);
    setRejectLabel(label ?? null);
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Dépôts clients</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {pendingTotal} pièce(s) en attente de validation
          </p>
        </div>
        <div className="inline-flex rounded-md border p-0.5">
          <Button
            variant={onlyMine ? 'default' : 'ghost'} size="sm" className="h-7 text-xs"
            onClick={() => setOnlyMine(true)}
          >
            Mes dossiers
          </Button>
          <Button
            variant={!onlyMine ? 'default' : 'ghost'} size="sm" className="h-7 text-xs"
            onClick={() => setOnlyMine(false)}
          >
            Tous
          </Button>
        </div>
      </header>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">À valider ({pending.length})</TabsTrigger>
          <TabsTrigger value="free">Envois libres ({freeUploads.length})</TabsTrigger>
        </TabsList>

        {/* ---------------- À valider ---------------- */}
        <TabsContent value="pending" className="mt-4 space-y-3">
          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-sm tabular-nums">{selected.length} sélectionnée(s)</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" className="h-8" onClick={() => validate(selected)}>
                  <Check className="mr-1.5 h-4 w-4" /> Valider
                </Button>
                <Button size="sm" variant="destructive" className="h-8" onClick={() => openReject(selected)}>
                  <X className="mr-1.5 h-4 w-4" /> Rejeter
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="h-11">
                  <TableHead className="w-9" />
                  <TableHead>Pièce</TableHead>
                  <TableHead>Déclaration</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead className="text-right">Échéance</TableHead>
                  <TableHead className="text-right">Déposé le</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead className="w-[150px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="h-11">
                    <TableCell colSpan={8} className="text-sm text-muted-foreground">Chargement…</TableCell>
                  </TableRow>
                ) : groups.length === 0 ? (
                  <TableRow className="h-11">
                    <TableCell colSpan={8} className="text-sm text-muted-foreground">
                      Aucune pièce en attente de validation.
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map(([clientId, group]) => (
                    <>
                      <TableRow key={`h-${clientId}`} className="sticky top-0 h-9 bg-muted/60 hover:bg-muted/60">
                        <TableCell colSpan={8} className="py-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {group.client_name} - {group.rows.length} pièce(s)
                        </TableCell>
                      </TableRow>
                      {group.rows.map((row) => (
                        <TableRow key={row.document_id} className="h-11">
                          <TableCell className="py-0">
                            <Checkbox
                              checked={selected.includes(row.document_id)}
                              onCheckedChange={() => toggle(row.document_id)}
                              aria-label={`Sélectionner ${row.label}`}
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="text-sm">{row.label}</div>
                            {row.file_name && (
                              <div className="text-[13px] text-muted-foreground">{row.file_name}</div>
                            )}
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-[11px]">{row.obligation_code}</Badge>
                              <span className="text-[13px] text-muted-foreground">{row.obligation_label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1 text-sm">{row.period_label}</TableCell>
                          <TableCell className="py-1 text-right text-sm tabular-nums">
                            {row.due_date && (
                              <span className={cn('inline-flex items-center justify-end gap-1', row.is_late && 'text-destructive')}>
                                {row.is_late && <AlertCircle className="h-4 w-4" />}
                                {format(new Date(row.due_date), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-1 text-right text-sm text-muted-foreground">
                            {row.deposited_at && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>{formatDistanceToNow(new Date(row.deposited_at), { addSuffix: true, locale: fr })}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {format(new Date(row.deposited_at), 'dd/MM/yyyy HH:mm')}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                          <TableCell className="py-1 text-[13px] text-muted-foreground">
                            {row.deposited_by ?? '-'}
                          </TableCell>
                          <TableCell className="py-1">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" className="h-8 px-2"
                                onClick={() => openFile(row.file_path, row.source)}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Voir</span>
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 px-2"
                                onClick={() => validate([row.document_id])}>
                                <Check className="h-4 w-4" />
                                <span className="sr-only">Valider</span>
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive"
                                onClick={() => openReject([row.document_id], row.label)}>
                                <X className="h-4 w-4" />
                                <span className="sr-only">Rejeter</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ---------------- Envois libres ---------------- */}
        <TabsContent value="free" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Ces documents ont été envoyés hors d'une déclaration précise. Rattachez-les pour qu'ils apparaissent
            dans le dossier concerné.
          </p>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="h-11">
                  <TableHead>Titre</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead className="text-right">Envoyé le</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="w-[220px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {freeUploads.length === 0 ? (
                  <TableRow className="h-11">
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      Aucun envoi libre sur les 30 derniers jours.
                    </TableCell>
                  </TableRow>
                ) : (
                  freeUploads.map((u) => (
                    <TableRow key={u.document_id} className="h-11">
                      <TableCell className="py-1 text-sm">
                        <span className="inline-flex items-center gap-2">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          {u.title || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-1 text-[13px] text-muted-foreground">{u.category ?? '-'}</TableCell>
                      <TableCell className="py-1 text-[13px] text-muted-foreground">{u.file_name ?? '-'}</TableCell>
                      <TableCell className="py-1 text-right text-sm tabular-nums">
                        {u.uploaded_at ? format(new Date(u.uploaded_at), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell className="py-1 text-sm">{u.client_name}</TableCell>
                      <TableCell className="py-1">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 px-2"
                            onClick={() => openFile(u.file_path, 'portail')}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Voir</span>
                          </Button>
                          <Button size="sm" variant="outline" className="h-8"
                            onClick={() => setAttachUpload(u)}>
                            <Paperclip className="mr-1.5 h-4 w-4" />
                            Rattacher à une déclaration
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <RejectDepositDialog
        open={rejectIds.length > 0}
        onOpenChange={(o) => { if (!o) { setRejectIds([]); setRejectLabel(null); } }}
        documentIds={rejectIds}
        singleLabel={rejectLabel}
        onDone={() => setSelected((prev) => prev.filter((id) => !rejectIds.includes(id)))}
      />

      <AttachToObligationDialog
        open={!!attachUpload}
        onOpenChange={(o) => { if (!o) setAttachUpload(null); }}
        upload={attachUpload}
      />
    </div>
  );
};

export default DepotsPage;
