import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { usePlannableMissions } from '@/hooks/usePlanning';
import {
  useCreateAssignment,
  useUpdateAssignment,
  useStaffingAssignments,
  type StaffingAssignment,
} from '@/hooks/useStaffing';
import { STAFFING_ROLES, type StaffingRole } from '@/lib/staffing';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assignment?: StaffingAssignment | null;
}

export default function AssignmentDialog({ open, onOpenChange, assignment }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const { data: missions = [] } = usePlannableMissions();
  const create = useCreateAssignment();
  const update = useUpdateAssignment();

  const [missionId, setMissionId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<StaffingRole>('collaborateur');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [weeklyHours, setWeeklyHours] = useState<string>('35');

  useEffect(() => {
    if (!open) return;
    if (assignment) {
      setMissionId(assignment.mission_id);
      setProjectId(assignment.project_id);
      setUserId(assignment.user_id);
      setRole(assignment.role);
      setStartDate(new Date(assignment.start_date));
      setEndDate(assignment.end_date ? new Date(assignment.end_date) : undefined);
      setWeeklyHours(String(assignment.weekly_hours));
    } else {
      setMissionId(null);
      setProjectId(null);
      setUserId(null);
      setRole('collaborateur');
      setStartDate(new Date());
      setEndDate(undefined);
      setWeeklyHours('35');
    }
  }, [open, assignment]);

  // Projects for mission
  const { data: projects = [] } = useQuery({
    queryKey: ['assign-projects', missionId],
    enabled: !!missionId,
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name').eq('mission_id', missionId!).order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Team members
  const { data: members = [] } = useQuery({
    queryKey: ['org-members', profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, grade, grade_level, avatar_url')
        .eq('organization_id', profile!.organization_id!)
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Current load for selected user
  const { data: userAssignments = [] } = useStaffingAssignments({ userId });

  const overlap = (a1: string, a2: string | null, b1: string, b2: string | null) => {
    const a1d = new Date(a1).getTime();
    const a2d = a2 ? new Date(a2).getTime() : Infinity;
    const b1d = new Date(b1).getTime();
    const b2d = b2 ? new Date(b2).getTime() : Infinity;
    return a1d <= b2d && b1d <= a2d;
  };

  const loadInfo = useMemo(() => {
    if (!userId || !startDate) return null;
    const s = format(startDate, 'yyyy-MM-dd');
    const e = endDate ? format(endDate, 'yyyy-MM-dd') : null;
    const active = (userAssignments as StaffingAssignment[]).filter(
      (a) => a.status !== 'cancelled' && a.id !== assignment?.id && overlap(a.start_date, a.end_date, s, e),
    );
    const existing = active.reduce((sum, a) => sum + Number(a.weekly_hours ?? 0), 0);
    const withThis = existing + (Number(weeklyHours) || 0);
    return { existing, withThis, count: active.length };
  }, [userId, startDate, endDate, weeklyHours, userAssignments, assignment?.id]);

  const loadColor = (h: number) => (h > 45 ? 'text-red-600' : h > 35 ? 'text-amber-600' : 'text-green-600');

  const canSave =
    !!missionId &&
    !!userId &&
    !!role &&
    !!startDate &&
    (!endDate || endDate >= startDate) &&
    Number(weeklyHours) >= 0 &&
    Number(weeklyHours) <= 80;

  const submit = async () => {
    if (!canSave || !startDate) return;
    const payload = {
      mission_id: missionId!,
      project_id: projectId,
      user_id: userId!,
      role,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      weekly_hours: Number(weeklyHours),
    };
    if (assignment) {
      await update.mutateAsync({ id: assignment.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPilotRole = role === 'directeur_mission' || role === 'chef_projet';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{assignment ? 'Modifier l\'affectation' : 'Affecter un collaborateur'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Mission <span className="text-destructive">*</span></Label>
            <Select
              value={missionId ?? ''}
              onValueChange={(v) => {
                setMissionId(v || null);
                setProjectId(null);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Sélectionner une mission" /></SelectTrigger>
              <SelectContent>
                {(missions as any[]).map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Projet</Label>
            <Select value={projectId ?? ''} onValueChange={(v) => setProjectId(v || null)} disabled={!missionId}>
              <SelectTrigger>
                <SelectValue placeholder={!missionId ? 'Choisir d\'abord une mission' : 'Optionnel'} />
              </SelectTrigger>
              <SelectContent>
                {(projects as any[]).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Collaborateur <span className="text-destructive">*</span></Label>
            <Select value={userId ?? ''} onValueChange={(v) => setUserId(v || null)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un collaborateur" /></SelectTrigger>
              <SelectContent>
                {(members as any[]).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <span>{m.full_name}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{m.grade}</Badge>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Rôle <span className="text-destructive">*</span></Label>
            <Select value={role} onValueChange={(v) => setRole(v as StaffingRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(STAFFING_ROLES) as [StaffingRole, { label: string }][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPilotRole && (
              <p className="text-xs text-muted-foreground">
                Ce rôle confère le pilotage de la mission : validation des travaux et des plannings.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date de début <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: fr }) : '-'}
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
              <p className="text-xs text-muted-foreground">Laisser vide pour une affectation sans terme</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Volume hebdomadaire <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input type="number" min={0} max={80} step={0.5} value={weeklyHours} onChange={(e) => setWeeklyHours(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h/semaine</span>
            </div>
          </div>

          {loadInfo && userId && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <div>
                Charge actuelle : <span className={cn('font-semibold', loadColor(loadInfo.existing))}>{loadInfo.existing}h/sem</span>
                {' '}sur {loadInfo.count} mission{loadInfo.count > 1 ? 's' : ''}
              </div>
              <div>
                Avec cette affectation : <span className={cn('font-semibold', loadColor(loadInfo.withThis))}>{loadInfo.withThis}h/sem</span>
                {loadInfo.withThis > 45 && <span className="ml-2 text-red-600">⚠️ Surcharge</span>}
              </div>
            </div>
          )}

          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 flex gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>L'affectation donne automatiquement accès à la mission, à ses projets et à ses documents.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!canSave || create.isPending || update.isPending}>
            {(create.isPending || update.isPending) ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
