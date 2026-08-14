import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Send, Ban } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useUpdateObligation, useOrgCollaborators, useObligationInteractions, type EcheancierRow } from '@/hooks/useObligations';
import { OBLIGATION_STATUS, STATUS_FLOW, statusBadgeClasses, statusLabel } from '@/lib/obligations';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DocumentChecklist from '@/components/obligations/DocumentChecklist';
import { usePeriodDocuments } from '@/hooks/useObligationDocs';
import { cn } from '@/lib/utils';

interface Props {
  row: EcheancierRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRelance?: (row: EcheancierRow) => void;
}

const ObligationDetailDialog = ({ row, open, onOpenChange, onRelance }: Props) => {
  const profile = useAuthStore((s) => s.profile);
  const isResponsable = (profile?.grade_level ?? 8) <= 3;
  const update = useUpdateObligation();
  const { data: collabs = [] } = useOrgCollaborators();
  const { data: interactions = [] } = useObligationInteractions(row.id);
  const { data: docsData } = usePeriodDocuments(row.id);
  const docProgress = docsData?.progress;
  const piecesComplete = !docProgress || docProgress.total_required === 0
    || docProgress.received_required >= docProgress.total_required;

  const { data: fullRow } = useQuery({
    queryKey: ['obligation-period', row.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obligation_periods')
        .select('*, deposed_by_profile:profiles!obligation_periods_deposed_by_fkey(full_name)')
        .eq('id', row.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [status, setStatus] = useState(row.status);
  const [assignedTo, setAssignedTo] = useState<string | null>(row.assigned_to);
  const [notes, setNotes] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [montant, setMontant] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);


  useEffect(() => {
    if (fullRow) {
      setStatus(fullRow.status);
      setAssignedTo(fullRow.assigned_to);
      setNotes(fullRow.notes ?? '');
      setReference(fullRow.reference_depot ?? '');
      setMontant(fullRow.montant != null ? String(fullRow.montant) : '');
    }
  }, [fullRow]);

  const save = () => {
    update.mutate({
      id: row.id,
      status,
      assigned_to: assignedTo,
      notes: notes || null,
      reference_depot: reference || null,
      montant: montant ? Number(montant) : null,
    }, { onSuccess: () => onOpenChange(false) });
  };

  const showDepotFields = status === 'pret' || status === 'depose';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{row.client_name}</span>
            <span className="text-muted-foreground">·</span>
            <span>{row.obligation_label}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm font-normal">{row.period_label}</span>
            <Badge variant={row.is_late ? 'destructive' : 'secondary'} className="ml-auto">
              Échéance {format(new Date(row.due_date), 'dd/MM/yyyy', { locale: fr })}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Stepper */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Avancement</Label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {STATUS_FLOW.map((s) => {
                const blocked = s === 'pieces_recues' && !piecesComplete;
                const btn = (
                  <button
                    key={s}
                    disabled={blocked}
                    onClick={() => setStatus(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-xs border transition',
                      blocked && 'opacity-40 cursor-not-allowed',
                      status === s
                        ? statusBadgeClasses(s) + ' ring-2 ring-primary/40'
                        : 'bg-background border-border hover:bg-muted'
                    )}
                  >
                    {OBLIGATION_STATUS[s].label}
                  </button>
                );
                if (!blocked) return btn;
                return (
                  <TooltipProvider key={s}>
                    <Tooltip>
                      <TooltipTrigger asChild><span>{btn}</span></TooltipTrigger>
                      <TooltipContent>Toutes les pièces requises doivent être reçues.</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
              <button
                onClick={() => setStatus('na')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs border transition inline-flex items-center gap-1',
                  status === 'na' ? statusBadgeClasses('na') : 'bg-background border-border hover:bg-muted'
                )}
              >
                <Ban className="h-3 w-3" /> Non applicable
              </button>
            </div>
          </div>

          {/* Checklist des pièces */}
          <DocumentChecklist periodId={row.id} />


          {/* Assignation */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Assigné à</Label>
            <Select
              value={assignedTo ?? 'none'}
              onValueChange={(v) => setAssignedTo(v === 'none' ? null : v)}
              disabled={!isResponsable}
            >
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non assigné</SelectItem>
                {collabs.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Dépôt */}
          {showDepotFields && (
            <div className="grid gap-3 md:grid-cols-2 p-3 rounded-lg bg-muted/30 border">
              <div>
                <Label className="text-xs">Référence dépôt</Label>
                <Input
                  className="mt-1"
                  placeholder="N° de récépissé / télédéclaration"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Montant (FCFA)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                />
              </div>
              {status === 'depose' && fullRow?.deposed_at && (
                <div className="md:col-span-2 text-xs text-muted-foreground">
                  Déposé le {format(new Date(fullRow.deposed_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  {fullRow.deposed_by_profile?.full_name && <> par <b>{fullRow.deposed_by_profile.full_name}</b></>}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes</Label>
            <Textarea className="mt-2" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Historique relances */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Historique des relances</Label>
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucune relance enregistrée.</p>
              ) : interactions.map((i) => {
                const meta = (i.metadata ?? {}) as { canal?: string; to_email?: string; sent?: boolean };
                const sent = meta.sent === true;
                const expanded = expandedId === i.id;
                return (
                  <div key={i.id} className="text-sm p-2 rounded border bg-background">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setExpandedId(expanded ? null : i.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{i.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(i.interaction_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {meta.canal && <Badge variant="outline" className="text-[10px]">{meta.canal}</Badge>}
                        <Badge
                          variant="outline"
                          className={cn('text-[10px]', sent
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200')}
                        >
                          {sent ? 'Envoyé' : 'Consigné'}
                        </Badge>
                        {meta.to_email && <span className="text-[11px] text-muted-foreground">{meta.to_email}</span>}
                      </div>
                    </button>
                    {expanded && i.description && (
                      <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-muted-foreground border-t pt-2">
                        {i.description}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        <DialogFooter>
          {row.status === 'pieces_attendues' && onRelance && (
            <Button variant="outline" onClick={() => { onRelance(row); onOpenChange(false); }}>
              <Send className="h-4 w-4 mr-2" /> Relancer
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={save} disabled={update.isPending}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ObligationDetailDialog;
