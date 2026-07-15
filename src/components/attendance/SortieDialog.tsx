import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useCreateAttendanceEvent } from '@/hooks/useAttendance';

const NONE = '__none__';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function SortieDialog({ open, onOpenChange }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [missionId, setMissionId] = useState<string>(NONE);
  const [authorizedBy, setAuthorizedBy] = useState<string>(NONE);
  const create = useCreateAttendanceEvent();

  const { data: missions = [] } = useQuery({
    queryKey: ['my-missions-simple', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from('mission_members')
        .select('mission:missions(id, name)')
        .eq('user_id', profile.id);
      return (data ?? []).map((r: any) => r.mission).filter(Boolean);
    },
    enabled: !!profile?.id && open,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['org-leads', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, grade')
        .eq('organization_id', profile.organization_id)
        .lte('grade_level', 3)
        .order('full_name');
      return data ?? [];
    },
    enabled: !!profile?.organization_id && open,
  });

  const reset = () => {
    setReason(''); setDestination(''); setMissionId(NONE); setAuthorizedBy(NONE);
  };

  const submit = async () => {
    if (!reason.trim()) return;
    await create.mutateAsync({
      event_type: 'sortie_pro',
      reason: reason.trim(),
      destination: destination.trim() || null,
      mission_id: missionId === NONE ? null : missionId,
      authorized_by: authorizedBy === NONE ? null : authorizedBy,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Déclarer une sortie</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reason">Motif <span className="text-destructive">*</span></Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex : Rendez-vous client, dépôt de dossier…"
              rows={2}
              required
            />
            {!reason.trim() && (
              <p className="text-xs text-muted-foreground">Le motif est obligatoire</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ex : Banque Atlantique, Plateau"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mission concernée</Label>
            <Select value={missionId} onValueChange={setMissionId}>
              <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Aucune —</SelectItem>
                {missions.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Si la sortie concerne une mission précise</p>
          </div>
          <div className="space-y-1.5">
            <Label>Autorisée par</Label>
            <Select value={authorizedBy} onValueChange={setAuthorizedBy}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Aucun —</SelectItem>
                {leads.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.grade})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!reason.trim() || create.isPending}>
            {create.isPending ? 'Enregistrement…' : 'Confirmer la sortie'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
