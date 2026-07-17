import { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, addWeeks, startOfWeek, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, Clock, MessageSquareQuote, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import {
  useMyAssignments,
  useStaffingAssignments,
  useCancelAssignment,
  useRespondToAssignment,
  useWorkload,
  usePendingAdjustments,
  type StaffingAssignment,
  type StaffingPeriod,
  type PendingAdjustment,
} from '@/hooks/useStaffing';
import { usePlannableMissions } from '@/hooks/usePlanning';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  STAFFING_ROLES, STAFFING_STATUS, ROLE_BADGE_CLASSES, STATUS_BADGE_CLASSES,
  type StaffingStatus,
} from '@/lib/staffing';
import AssignmentDialog from '@/components/staffing/AssignmentDialog';
import AdjustmentDialog from '@/components/staffing/AdjustmentDialog';
import ArbitrationDialog, { type ArbitrationMode } from '@/components/staffing/ArbitrationDialog';

const fmtDate = (d: string | null) => (d ? format(new Date(d), 'dd/MM/yy') : '∞');
const fmtPeriod = (a: { start_date: string; end_date: string | null }) => {
  if (!a.end_date) return `${fmtDate(a.start_date)} → Jusqu'à nouvel ordre`;
  return `${fmtDate(a.start_date)} → ${fmtDate(a.end_date)}`;
};
const loadColor = (h: number) => (h > 45 ? 'text-red-600' : h >= 35 ? 'text-amber-600' : 'text-green-600');

function MyAssignmentsTab() {
  const { data: assignments = [], isLoading } = useMyAssignments();
  const respond = useRespondToAssignment();
  const [adjustFor, setAdjustFor] = useState<string | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (assignments.length === 0) {
    return <Card><CardContent className="py-10 text-center text-muted-foreground">Aucune mission ne vous est affectée pour le moment.</CardContent></Card>;
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {assignments.map((a) => {
          const proposed = a.status === 'proposed';
          const adjusting = a.status === 'adjustment_requested';
          const hasResponse = proposed && a.chef_response;
          const cancelledWithResponse = a.status === 'cancelled' && a.chef_response;
          const revision = a.revision_count ?? 0;

          const borderClass = cancelledWithResponse
            ? 'border-muted'
            : hasResponse
            ? 'border-[#E67433] border-2'
            : adjusting
            ? 'border-amber-400 border-2'
            : proposed
            ? 'border-[#16519C]/40 border-2'
            : '';

          return (
            <Card key={a.id} className={cn(borderClass, cancelledWithResponse && 'opacity-80')}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{a.mission?.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {a.mission?.code}{a.project ? ` · ${a.project.name}` : ''}
                    </p>
                  </div>
                  <Badge className={cn('border', STATUS_BADGE_CLASSES[a.status])} variant="outline">
                    {STAFFING_STATUS[a.status].label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className={cn('border', ROLE_BADGE_CLASSES[a.role])} variant="outline">
                    {STAFFING_ROLES[a.role].label}
                  </Badge>
                  <span className="text-muted-foreground">{a.weekly_hours}h/semaine</span>
                </div>
                <div className="text-muted-foreground">{fmtPeriod(a)}</div>

                {adjusting && a.collaborator_note && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-xs space-y-1">
                    <p className="font-medium text-amber-900">Votre demande :</p>
                    <p className="text-amber-800 whitespace-pre-wrap">{a.collaborator_note}</p>
                    <p className="flex items-center gap-1 text-amber-700 italic pt-1">
                      <Clock className="h-3 w-3" />
                      En attente de la réponse de votre responsable
                      {a.adjustment_requested_at && (
                        <> · {formatDistanceToNow(new Date(a.adjustment_requested_at), { locale: fr, addSuffix: true })}</>
                      )}
                    </p>
                  </div>
                )}

                {hasResponse && (
                  <div className="rounded-md border border-[#E67433]/40 bg-[#E67433]/5 p-3 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-medium text-[#E67433]">
                      <MessageSquareQuote className="h-4 w-4" />
                      Réponse de votre responsable
                      {a.responder?.full_name && <span className="text-muted-foreground font-normal">· {a.responder.full_name}</span>}
                      {a.responded_at && (
                        <span className="text-muted-foreground font-normal ml-auto">
                          {formatDistanceToNow(new Date(a.responded_at), { locale: fr, addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground whitespace-pre-wrap border-l-2 border-[#E67433]/50 pl-2">{a.chef_response}</p>
                    <div className="pt-1 flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-[10px]">Volume révisé : {a.weekly_hours}h/sem</Badge>
                      <Badge variant="outline" className="text-[10px]">{fmtPeriod(a)}</Badge>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-[#16519C] hover:bg-[#16519C]/90"
                        onClick={() => respond.mutate({ id: a.id, status: 'accepted' })}
                        disabled={respond.isPending}
                      >
                        Accepter
                      </Button>
                      {revision >= 2 ? (
                        <p className="flex-1 text-[11px] text-muted-foreground italic self-center">
                          Plusieurs échanges ont eu lieu — contactez directement votre responsable si un désaccord persiste.
                        </p>
                      ) : (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setAdjustFor(a.id)}>
                          Demander un nouvel ajustement
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {proposed && !hasResponse && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-[#16519C] hover:bg-[#16519C]/90"
                      onClick={() => respond.mutate({ id: a.id, status: 'accepted' })}
                      disabled={respond.isPending}
                    >
                      Accepter
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setAdjustFor(a.id)}>
                      Demander un ajustement
                    </Button>
                  </div>
                )}

                {cancelledWithResponse && (
                  <div className="rounded-md bg-muted border p-2 text-xs">
                    <p className="font-medium mb-1">Motif de l'annulation :</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{a.chef_response}</p>
                  </div>
                )}

                {a.status === 'accepted' && (
                  <Link to={`/missions/${a.mission_id}`} className="inline-block text-sm text-[#16519C] hover:underline pt-1">
                    Ouvrir la mission →
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <AdjustmentDialog open={!!adjustFor} onOpenChange={(v) => !v && setAdjustFor(null)} assignmentId={adjustFor} />
    </>
  );
}

function PendingAdjustmentsTab() {
  const { data: pending = [], isLoading } = usePendingAdjustments();
  const [selected, setSelected] = useState<PendingAdjustment | null>(null);
  const [mode, setMode] = useState<ArbitrationMode>('revise');
  const [open, setOpen] = useState(false);

  const openWith = (req: PendingAdjustment, m: ArbitrationMode) => {
    setSelected(req);
    setMode(m);
    setOpen(true);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  if (pending.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <p>Aucune demande d'ajustement en attente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {pending.map((r) => {
          const total = Number(r.current_total_hours);
          const revision = Number(r.revision_count ?? 0);
          return (
            <Card key={r.id} className="border-amber-300 border-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {r.collaborator_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{r.collaborator_name}</CardTitle>
                      <Badge variant="outline" className="text-[10px] py-0">{r.collaborator_grade}</Badge>
                      <span className="text-sm text-muted-foreground">demande un ajustement</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.adjustment_requested_at), { locale: fr, addSuffix: true })}
                    </p>
                  </div>
                </div>
                {revision >= 2 && (
                  <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 flex items-start gap-2">
                    <RefreshCw className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{revision} allers-retours sur cette affectation. Un échange direct sera peut-être plus efficace.</span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Left: current proposed assignment */}
                  <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
                    <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Affectation proposée</p>
                    <div>
                      <div className="font-medium">{r.mission_name}</div>
                      {r.project_name && <div className="text-xs text-muted-foreground">{r.project_name}</div>}
                    </div>
                    <div>
                      <Badge className={cn('border', ROLE_BADGE_CLASSES[r.role])} variant="outline">
                        {STAFFING_ROLES[r.role].label}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Période : {fmtPeriod({ start_date: r.start_date, end_date: r.end_date })}
                    </div>
                    <div className="text-xs">
                      Volume : <span className="font-medium">{r.weekly_hours}h/semaine</span>
                    </div>
                    <div className="text-xs">
                      Charge totale actuelle : <span className={cn('font-semibold', loadColor(total))}>{total}h/sem</span>
                    </div>
                  </div>

                  {/* Right: collaborator note */}
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                    <p className="font-semibold text-xs uppercase tracking-wide text-amber-900 mb-2 flex items-center gap-1">
                      <MessageSquareQuote className="h-3.5 w-3.5" /> Demande du collaborateur
                    </p>
                    <p className="text-amber-900 whitespace-pre-wrap">{r.collaborator_note}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button className="bg-[#16519C] hover:bg-[#16519C]/90" onClick={() => openWith(r, 'revise')}>
                    Réviser l'affectation
                  </Button>
                  <Button variant="outline" onClick={() => openWith(r, 'maintain')}>
                    Maintenir
                  </Button>
                  <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => openWith(r, 'cancel')}>
                    Annuler l'affectation
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ArbitrationDialog open={open} onOpenChange={setOpen} request={selected} mode={mode} />
    </>
  );
}

function TeamAssignmentsTab() {
  const [missionFilter, setMissionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [period, setPeriod] = useState<StaffingPeriod>('current');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffingAssignment | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const profile = useAuthStore((s) => s.profile);
  const { data: missions = [] } = usePlannableMissions();
  const { data: members = [] } = useQuery({
    queryKey: ['org-members-list', profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name')
        .eq('organization_id', profile!.organization_id!).order('full_name');
      return data ?? [];
    },
  });

  const { data: allAssignments = [], isLoading } = useStaffingAssignments({
    missionId: missionFilter !== 'all' ? missionFilter : null,
    userId: userFilter !== 'all' ? userFilter : null,
    status: statusFilter !== 'all' ? (statusFilter as StaffingStatus) : null,
    period,
  });

  const cancel = useCancelAssignment();

  const sorted = useMemo(() => {
    return [...allAssignments].sort((a, b) => {
      if (a.status === 'adjustment_requested' && b.status !== 'adjustment_requested') return -1;
      if (b.status === 'adjustment_requested' && a.status !== 'adjustment_requested') return 1;
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
  }, [allAssignments]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={missionFilter} onValueChange={setMissionFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Mission" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les missions</SelectItem>
            {(missions as any[]).map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Collaborateur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les collaborateurs</SelectItem>
            {(members as any[]).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.entries(STAFFING_STATUS) as [StaffingStatus, { label: string }][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border">
          {(['current', 'upcoming', 'past', 'all'] as StaffingPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 text-sm',
                period === p ? 'bg-[#16519C] text-white' : 'hover:bg-muted',
              )}
            >
              {p === 'current' ? 'En cours' : p === 'upcoming' ? 'À venir' : p === 'past' ? 'Terminées' : 'Toutes'}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button
            className="bg-[#E67433] hover:bg-[#E67433]/90"
            onClick={() => { setEditing(null); setDialogOpen(true); }}
          >
            <Plus className="mr-2 h-4 w-4" /> Affecter un collaborateur
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : sorted.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Aucune affectation. Commencez par affecter un collaborateur à une mission.
        </CardContent></Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collaborateur</TableHead>
                <TableHead>Mission</TableHead>
                <TableHead>Projet</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TooltipProvider>
                {sorted.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                          {a.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <div className="text-sm">{a.profile?.full_name}</div>
                          <Badge variant="outline" className="text-[10px] py-0">{a.profile?.grade}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{a.mission?.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.project?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={cn('border', ROLE_BADGE_CLASSES[a.role])} variant="outline">
                        {STAFFING_ROLES[a.role].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtPeriod(a)}</TableCell>
                    <TableCell className="text-sm">{a.weekly_hours}h/sem</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge className={cn('border', STATUS_BADGE_CLASSES[a.status])} variant="outline">
                          {STAFFING_STATUS[a.status].label}
                        </Badge>
                        {a.status === 'adjustment_requested' && a.collaborator_note && (
                          <Tooltip>
                            <TooltipTrigger>
                              <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">{a.collaborator_note}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(a); setDialogOpen(true); }}>Modifier</Button>
                      {a.status !== 'cancelled' && (
                        <Button variant="ghost" size="sm" onClick={() => setCancelId(a.id)}>Annuler</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TooltipProvider>
            </TableBody>
          </Table>
        </div>
      )}

      <AssignmentDialog open={dialogOpen} onOpenChange={setDialogOpen} assignment={editing} />

      <AlertDialog open={!!cancelId} onOpenChange={(v) => !v && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette affectation ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'affectation sera marquée comme annulée mais restera dans l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (cancelId) { cancel.mutate(cancelId); setCancelId(null); } }}>
              Annuler l'affectation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TeamWorkloadTab() {
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = useMemo(() => addWeeks(weekStart, 1), [weekStart]);
  const weekEndStr = format(new Date(weekEnd.getTime() - 1), 'yyyy-MM-dd');
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');

  const { data: workload = [] } = useWorkload(weekStart);
  const { data: assignments = [] } = useStaffingAssignments({ period: 'all' });

  const rows = useMemo(() => {
    const alloc = new Map<string, number>();
    for (const a of assignments) {
      if (a.status === 'cancelled') continue;
      if (a.start_date > weekEndStr) continue;
      if (a.end_date && a.end_date < weekStartStr) continue;
      alloc.set(a.user_id, (alloc.get(a.user_id) ?? 0) + Number(a.weekly_hours ?? 0));
    }
    return workload.map((w) => ({ ...w, allocated: alloc.get(w.user_id) ?? 0 }))
      .sort((a, b) => Number(b.load_rate) - Number(a.load_rate));
  }, [workload, assignments, weekStartStr, weekEndStr]);

  const barColor = (rate: number) => (rate > 100 ? 'bg-red-500' : rate >= 85 ? 'bg-amber-500' : 'bg-green-500');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          Cette semaine
        </Button>
        <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">Semaine du {format(weekStart, 'd MMMM yyyy', { locale: fr })}</span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Collaborateur</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Alloué</TableHead>
              <TableHead>Planifié</TableHead>
              <TableHead>Capacité</TableHead>
              <TableHead className="w-64">Taux</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const rate = Number(r.load_rate ?? 0);
              return (
                <TableRow key={r.user_id}>
                  <TableCell className="text-sm">{r.full_name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] py-0">{r.grade}</Badge></TableCell>
                  <TableCell className="text-sm">{r.allocated}h</TableCell>
                  <TableCell className="text-sm">{Number(r.planned_hours ?? 0)}h</TableCell>
                  <TableCell className="text-sm">{Number(r.capacity_hours ?? 0)}h</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full transition-all', barColor(rate))} style={{ width: `${Math.min(rate, 150)}%` }} />
                      </div>
                      <span className="text-xs w-10 text-right">{rate}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.is_overloaded ? (
                      <Badge className="bg-red-100 text-red-800 border-red-300" variant="outline">Surcharge</Badge>
                    ) : rate < 50 && r.allocated > 0 ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300" variant="outline">Sous-charge</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">Aucune donnée pour cette semaine.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          <strong>Alloué</strong> = volume décidé par le responsable. <strong>Planifié</strong> = ce que le collaborateur a détaillé dans son planning.
          Un écart important signale un planning incomplet ou une affectation irréaliste.
        </span>
      </p>
    </div>
  );
}

export default function StaffingPage() {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;
  const isManager = gradeLevel <= 3;
  const { data: pending = [] } = usePendingAdjustments();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<string>(() => {
    if (initialTab === 'pending' && isManager) return 'pending';
    if (initialTab === 'mine') return 'mine';
    if (initialTab === 'team' && isManager) return 'team';
    if (initialTab === 'workload' && isManager) return 'workload';
    return isManager && pending.length > 0 ? 'pending' : 'mine';
  });

  useEffect(() => {
    const q = searchParams.get('tab');
    if (q && q !== tab) setTab(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const onTabChange = (v: string) => {
    setTab(v);
    setSearchParams((sp) => {
      const next = new URLSearchParams(sp);
      next.set('tab', v);
      return next;
    }, { replace: true });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Staffing</h1>
        <p className="text-sm text-muted-foreground">Affectation des collaborateurs aux missions et pilotage de la charge.</p>
      </div>

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          {isManager && (
            <TabsTrigger value="pending" className="relative">
              Demandes d'ajustement
              {pending.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] h-5 min-w-[20px] px-1.5">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="mine">Mes affectations</TabsTrigger>
          {isManager && <TabsTrigger value="team">Affectations équipe</TabsTrigger>}
          {isManager && <TabsTrigger value="workload">Charge d'équipe</TabsTrigger>}
        </TabsList>
        {isManager && <TabsContent value="pending" className="mt-4"><PendingAdjustmentsTab /></TabsContent>}
        <TabsContent value="mine" className="mt-4"><MyAssignmentsTab /></TabsContent>
        {isManager && <TabsContent value="team" className="mt-4"><TeamAssignmentsTab /></TabsContent>}
        {isManager && <TabsContent value="workload" className="mt-4"><TeamWorkloadTab /></TabsContent>}
      </Tabs>
    </div>
  );
}
