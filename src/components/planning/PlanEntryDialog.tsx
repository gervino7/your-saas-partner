import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useMyStaffing, usePlannableMissions, useUpsertPlanEntry, type PlanEntry, type PlanEntryType } from '@/hooks/usePlanning';

const TYPES: { value: PlanEntryType; label: string }[] = [
  { value: 'mission', label: 'Mission' },
  { value: 'rendez_vous', label: 'Rendez-vous' },
  { value: 'formation', label: 'Formation' },
  { value: 'admin', label: 'Admin' },
  { value: 'conge', label: 'Congé' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: Date;
  entry?: PlanEntry | null;
}

export default function PlanEntryDialog({ open, onOpenChange, defaultDate, entry }: Props) {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;
  const { data: staffing = [] } = useMyStaffing();
  const { data: plannableMissions = [], isLoading: missionsLoading } = usePlannableMissions();
  const upsert = useUpsertPlanEntry();

  const [type, setType] = useState<PlanEntryType>('mission');
  const [date, setDate] = useState<Date | undefined>(defaultDate ?? new Date());
  const [hours, setHours] = useState<string>('7');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [missionId, setMissionId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (entry) {
        setType(entry.entry_type);
        setDate(new Date(entry.plan_date));
        setHours(String(entry.planned_hours ?? 0));
        setStartTime(entry.start_time ?? '');
        setEndTime(entry.end_time ?? '');
        setTitle(entry.title ?? '');
        setLocation(entry.location ?? '');
        setMissionId(entry.mission_id);
        setProjectId(entry.project_id);
        setTaskId(entry.task_id);
      } else {
        setType('mission');
        setDate(defaultDate ?? new Date());
        setHours('7');
        setStartTime(''); setEndTime('');
        setTitle(''); setLocation('');
        setMissionId(null); setProjectId(null); setTaskId(null);
      }
    }
  }, [open, entry, defaultDate]);

  // Missions available for planning (RLS-scoped)
  const myMissions = useMemo(
    () => (plannableMissions as any[]).map((m) => ({ id: m.id, name: m.name })),
    [plannableMissions]
  );

  // Informational staffing lookup for the selected mission
  const staffingForMission = useMemo(() => {
    if (!missionId) return null;
    return (staffing as any[]).find((s) => (s.mission?.id ?? s.mission_id) === missionId) ?? null;
  }, [staffing, missionId]);

  // Projects for selected mission
  const { data: projects = [] } = useQuery({
    queryKey: ['plan-mission-projects', missionId],
    queryFn: async () => {
      if (!missionId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, mission_id')
        .eq('mission_id', missionId)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!missionId,
  });

  // Tasks for selected project (filtered by assignment if grade > 3)
  const { data: tasks = [] } = useQuery({
    queryKey: ['plan-project-tasks', projectId, profile?.id, gradeLevel],
    queryFn: async () => {
      if (!projectId || !profile?.id) return [];
      let query = supabase.from('tasks').select('id, title, project_id').eq('project_id', projectId);
      const { data, error } = await query.order('title');
      if (error) throw error;
      if (gradeLevel <= 3) return data ?? [];
      // Filter to tasks the user is assigned to
      const ids = (data ?? []).map((t: any) => t.id);
      if (!ids.length) return [];
      const { data: assigns } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', profile.id)
        .in('task_id', ids);
      const set = new Set((assigns ?? []).map((a: any) => a.task_id));
      return (data ?? []).filter((t: any) => set.has(t.id));
    },
    enabled: !!projectId,
  });

  // Cascade resets
  const handleMissionChange = (v: string) => {
    setMissionId(v || null);
    setProjectId(null);
    setTaskId(null);
  };
  const handleProjectChange = (v: string) => {
    setProjectId(v || null);
    setTaskId(null);
  };

  const requiresMission = type === 'mission';
  const requiresTimes = type === 'rendez_vous';
  const noStaffing =
    (type === 'mission' || type === 'rendez_vous') && !missionsLoading && myMissions.length === 0;
  const readOnly = entry?.status === 'submitted' || entry?.status === 'approved';

  const invalidTimes = requiresTimes && !!startTime && !!endTime && endTime <= startTime;

  const canSave = useMemo(() => {
    if (readOnly) return false;
    if (!date) return false;
    const h = Number(hours);
    if (isNaN(h) || h <= 0 || h > 24) return false;
    if (requiresMission && !missionId) return false;
    if (requiresTimes && (!startTime || !endTime)) return false;
    if (invalidTimes) return false;
    return true;
  }, [readOnly, date, hours, missionId, requiresMission, requiresTimes, startTime, endTime, invalidTimes]);

  const submit = async () => {
    if (!canSave || !date) return;
    try {
      await upsert.mutateAsync({
        id: entry?.id,
        entry_type: type,
        plan_date: format(date, 'yyyy-MM-dd'),
        planned_hours: Number(hours),
        start_time: startTime || null,
        end_time: endTime || null,
        title: title.trim() || null,
        location: location.trim() || null,
        mission_id: type === 'mission' || type === 'rendez_vous' ? missionId : null,
        project_id: type === 'mission' || type === 'rendez_vous' ? projectId : null,
        task_id: type === 'mission' ? taskId : null,
        status: entry?.status ?? 'draft',
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error('Enregistrement impossible', {
        description: e?.message ?? 'Une erreur est survenue.',
      });
    }
  };

  const missionPlaceholder = missionsLoading ? 'Chargement…' : 'Sélectionner une mission';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? 'Modifier une entrée de planning' : 'Nouvelle entrée de planning'}</DialogTitle>
          <DialogDescription>
            Planifiez une intervention sur une mission où vous êtes affecté.
          </DialogDescription>
        </DialogHeader>

        {readOnly && (
          <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
            Cette entrée a été soumise et ne peut plus être modifiée.
          </div>
        )}

        {/* Rattachement */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rattachement</p>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Type <span className="text-destructive">*</span></Label>
            <Select
              disabled={readOnly}
              value={type}
              onValueChange={(v) => { setType(v as PlanEntryType); setMissionId(null); setProjectId(null); setTaskId(null); }}
            >
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {(type === 'mission' || type === 'rendez_vous') && (
            <>
              {noStaffing ? (
                <div className="rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                  Aucune mission disponible. Créez une mission ou demandez à être ajouté à une équipe.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Mission {type === 'mission' && <span className="text-destructive">*</span>}
                  </Label>
                  <Select value={missionId ?? ''} onValueChange={handleMissionChange} disabled={missionsLoading || readOnly}>
                    <SelectTrigger className="h-10"><SelectValue placeholder={missionPlaceholder} /></SelectTrigger>
                    <SelectContent>
                      {myMissions.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {staffingForMission?.weekly_hours != null ? (
                    <p className="text-xs text-muted-foreground">
                      Affecté : {Number(staffingForMission.weekly_hours)} h/semaine sur cette mission
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Seules les missions en cours ou en planification sont proposées.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Projet</Label>
                <Select value={projectId ?? ''} onValueChange={handleProjectChange} disabled={!missionId || readOnly}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={!missionId ? "Choisir d'abord une mission" : 'Sélectionner un projet'} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {type === 'mission' && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Tâche</Label>
                  <Select value={taskId ?? ''} onValueChange={(v) => setTaskId(v || null)} disabled={!projectId || readOnly}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={!projectId ? "Choisir d'abord un projet" : 'Sélectionner une tâche'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(tasks as any[]).map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Facultatif : précise le travail prévu ce jour.</p>
                </div>
              )}
            </>
          )}
        </div>

        <Separator />

        {/* Planification */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Planification</p>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Date <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={readOnly}
                  className={cn('h-10 w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'dd/MM/yyyy', { locale: fr }) : 'Choisir une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {type === 'conge' ? "Heures d'absence" : 'Heures prévues'} <span className="text-destructive">*</span>
              </Label>
              <Input className="h-10" type="number" min={0} max={24} step={0.5} value={hours} disabled={readOnly} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Début {requiresTimes && <span className="text-destructive">*</span>}</Label>
              <Input className="h-10" type="time" value={startTime} disabled={readOnly} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Fin {requiresTimes && <span className="text-destructive">*</span>}</Label>
              <Input className="h-10" type="time" value={endTime} disabled={readOnly} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {invalidTimes ? (
            <p className="text-xs text-destructive">L'heure de fin doit être postérieure à l'heure de début.</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {type === 'conge'
                ? "Les heures d'absence ne sont pas comptées dans la charge planifiée."
                : 'Les horaires sont facultatifs, sauf pour un rendez-vous.'}
            </p>
          )}
        </div>

        <Separator />

        {/* Détails */}
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Détails</p>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Intitulé</Label>
            <Input className="h-10" value={title} disabled={readOnly} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Réunion de cadrage" />
          </div>

          {type === 'rendez_vous' && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Lieu</Label>
              <Input className="h-10" value={location} disabled={readOnly} onChange={(e) => setLocation(e.target.value)} placeholder="Ex : Siège client" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{readOnly ? 'Fermer' : 'Annuler'}</Button>
          {!readOnly && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button onClick={submit} disabled={!canSave || upsert.isPending}>
                      {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canSave && missingLabel && (
                  <TooltipContent side="top">{missingLabel}</TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
