import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, CalendarIcon, Info, MessageSquareQuote } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { STAFFING_ROLES, type StaffingRole } from '@/lib/staffing';
import { useArbitrateAssignment, type PendingAdjustment } from '@/hooks/useStaffing';

export type ArbitrationMode = 'revise' | 'maintain' | 'cancel';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: PendingAdjustment | null;
  mode: ArbitrationMode;
}

const loadColor = (h: number) => (h > 45 ? 'text-red-600' : h >= 35 ? 'text-amber-600' : 'text-green-600');

export default function ArbitrationDialog({ open, onOpenChange, request, mode }: Props) {
  const arbitrate = useArbitrateAssignment();

  const [weeklyHours, setWeeklyHours] = useState<string>('0');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [role, setRole] = useState<StaffingRole>('collaborateur');
  const [response, setResponse] = useState('');

  useEffect(() => {
    if (!open || !request) return;
    setWeeklyHours(String(request.weekly_hours));
    setStartDate(new Date(request.start_date));
    setEndDate(request.end_date ? new Date(request.end_date) : undefined);
    setRole(request.role);
    setResponse('');
  }, [open, request]);

  const newTotalLoad = useMemo(() => {
    if (!request) return 0;
    return Number(request.current_total_hours) - Number(request.weekly_hours) + (Number(weeklyHours) || 0);
  }, [request, weeklyHours]);

  if (!request) return null;

  const titles: Record<ArbitrationMode, string> = {
    revise: `Réviser l'affectation — ${request.collaborator_name}`,
    maintain: `Maintenir l'affectation — ${request.collaborator_name}`,
    cancel: `Annuler l'affectation — ${request.collaborator_name}`,
  };

  const submit = async () => {
    if (!response.trim()) {
      toast.error('Veuillez motiver votre décision');
      return;
    }
    try {
      if (mode === 'revise') {
        if (!startDate) return;
        await arbitrate.mutateAsync({
          id: request.id,
          chef_response: response,
          status: 'proposed',
          weekly_hours: Number(weeklyHours),
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
          role,
        });
        toast.success('Affectation révisée — le collaborateur a été notifié.');
      } else if (mode === 'maintain') {
        await arbitrate.mutateAsync({ id: request.id, chef_response: response, status: 'proposed' });
        toast.success('Réponse envoyée au collaborateur.');
      } else {
        await arbitrate.mutateAsync({ id: request.id, chef_response: response, status: 'cancelled' });
        toast.success('Affectation annulée.');
      }
      onOpenChange(false);
    } catch {
      /* handled by hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Collaborator note (always shown) */}
          {mode !== 'cancel' && request.collaborator_note && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="flex items-center gap-2 text-amber-900 font-medium mb-1">
                <MessageSquareQuote className="h-4 w-4" />
                Demande du collaborateur
              </div>
              <p className="text-amber-900 whitespace-pre-wrap">{request.collaborator_note}</p>
            </div>
          )}

          {mode === 'revise' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Volume hebdomadaire <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input type="number" min={0} max={80} step={0.5} value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h/sem</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Rôle</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as StaffingRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(STAFFING_ROLES) as [StaffingRole, { label: string }][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date de début</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'dd/MM/yyyy', { locale: fr }) : '—'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label>Date de fin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'dd/MM/yyyy', { locale: fr }) : 'Sans terme'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} className="p-3 pointer-events-auto" />
                      {endDate && (
                        <div className="p-2 border-t">
                          <Button variant="ghost" size="sm" className="w-full" onClick={() => setEndDate(undefined)}>Effacer</Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                Charge du collaborateur après révision :{' '}
                <span className={cn('font-semibold', loadColor(newTotalLoad))}>{newTotalLoad}h/sem</span>
              </div>
            </>
          )}

          {mode === 'maintain' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>L'affectation repassera en attente d'acceptation. Le collaborateur sera informé de votre motif.</span>
            </div>
          )}

          {mode === 'cancel' && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-900 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Le collaborateur sera retiré de cette mission. Cette action est tracée et réversible en créant une nouvelle affectation.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              {mode === 'revise' ? 'Votre réponse' : mode === 'maintain' ? 'Motif du maintien' : "Motif de l'annulation"}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
              placeholder={
                mode === 'revise'
                  ? 'Expliquez la révision retenue'
                  : mode === 'maintain'
                  ? "Expliquez pourquoi l'affectation est maintenue en l'état"
                  : "Expliquez pourquoi l'affectation est annulée"
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={submit}
            disabled={!response.trim() || arbitrate.isPending}
            className={mode === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#16519C] hover:bg-[#16519C]/90'}
          >
            {arbitrate.isPending ? 'Envoi…' : mode === 'revise' ? 'Envoyer la révision' : mode === 'maintain' ? 'Envoyer la réponse' : "Annuler l'affectation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
