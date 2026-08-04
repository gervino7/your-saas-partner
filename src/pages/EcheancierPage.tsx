import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle, Clock, FileClock, CheckCircle2, Send, ArrowRight,
  ArrowUp, ArrowDown, ChevronsUpDown, RotateCcw, Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEcheancier, useObligationsKpis, useBulkUpdateObligations, useOrgCollaborators, type EcheancierRow } from '@/hooks/useObligations';
import { useClientsFullList } from '@/hooks/useCRM';
import { useAuthStore } from '@/stores/authStore';
import { OBLIGATION_STATUS, statusBadgeClasses, statusLabel, nextStatus } from '@/lib/obligations';
import { useUpdateObligation } from '@/hooks/useObligations';
import { useTableSort } from '@/hooks/useTableSort';
import { usePeriodDocCounts } from '@/hooks/useObligationDocs';
import ObligationDetailDialog from '@/components/obligations/ObligationDetailDialog';
import RelanceDialog from '@/components/obligations/RelanceDialog';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

const today = () => format(new Date(), 'yyyy-MM-dd');
const DEFAULT_FROM = today();
const DEFAULT_TO = format(addDays(new Date(), 60), 'yyyy-MM-dd');

type Preset = 'late' | 'week' | 'month' | 'all';

const EcheancierPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;
  const isResponsable = gradeLevel <= 3;

  const [searchParams, setSearchParams] = useSearchParams();

  // --- URL-backed filter state
  const from = searchParams.get('from') ?? DEFAULT_FROM;
  const to = searchParams.get('to') ?? DEFAULT_TO;
  const search = searchParams.get('q') ?? '';
  const statuses = (searchParams.get('status') ?? '').split(',').filter(Boolean);
  const obligation = searchParams.get('obligation') ?? 'all';
  const assignee = searchParams.get('assignee') ?? 'all';
  const clientId = searchParams.get('client') ?? 'all';
  const preset = (searchParams.get('preset') ?? 'all') as Preset;
  const mineOnly = searchParams.get('mine') === '1';
  const sortKey = searchParams.get('sort') ?? 'due_date';
  const sortDir = (searchParams.get('dir') ?? 'asc') as 'asc' | 'desc';

  const setParams = (patch: Record<string, string | null>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === '') next.delete(k);
        else next.set(k, v);
      });
      return next;
    }, { replace: true });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const [selected, setSelected] = useState<string[]>([]);
  const [detailRow, setDetailRow] = useState<EcheancierRow | null>(null);
  const [relanceRow, setRelanceRow] = useState<EcheancierRow | null>(null);

  const { data: kpis } = useObligationsKpis();
  const { data: rows = [], isLoading } = useEcheancier({
    from, to,
    status: statuses.length === 1 ? statuses[0] : null,
    clientId: clientId === 'all' ? null : clientId,
  });
  const { data: clients = [] } = useClientsFullList();
  const { data: collabs = [] } = useOrgCollaborators();
  const update = useUpdateObligation();
  const bulk = useBulkUpdateObligations();

  const obligationOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.obligation_code, r.obligation_label));
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((x) => (x.client_name ?? '').toLowerCase().includes(q));
    }
    if (statuses.length > 0) r = r.filter((x) => statuses.includes(x.status));
    if (obligation !== 'all') r = r.filter((x) => x.obligation_code === obligation);
    if (assignee === 'none') r = r.filter((x) => !x.assigned_to);
    else if (assignee !== 'all') r = r.filter((x) => x.assigned_to === assignee);
    if (mineOnly) r = r.filter((x) => x.assigned_to === profile?.id);
    if (preset === 'late') r = r.filter((x) => x.is_late);
    return r;
  }, [rows, search, statuses, obligation, assignee, mineOnly, preset, profile?.id]);

  const { sorted, sort, handleSort } = useTableSort<EcheancierRow>(filtered, {
    key: sortKey,
    direction: sortDir,
  });

  // keep sort state mirrored into the URL
  useEffect(() => {
    if (sort.key === sortKey && sort.direction === sortDir) return;
    setParams({
      sort: sort.direction ? sort.key : null,
      dir: sort.direction ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort.key, sort.direction]);

  const applyPreset = (kind: Preset) => {
    const now = new Date();
    if (kind === 'month') {
      setParams({
        preset: 'month',
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd'),
      });
    } else if (kind === 'week') {
      setParams({
        preset: 'week',
        from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      });
    } else if (kind === 'late') {
      setParams({
        preset: 'late',
        from: format(addDays(now, -365), 'yyyy-MM-dd'),
        to: today(),
      });
    } else {
      setParams({ preset: null, from: null, to: null });
    }
  };

  const toggleStatus = (key: string, checked: boolean) => {
    const next = checked ? [...statuses, key] : statuses.filter((s) => s !== key);
    setParams({ status: next.join(',') || null });
  };

  const toggleAll = (checked: boolean) => setSelected(checked ? sorted.map((r) => r.id) : []);
  const toggleOne = (id: string, checked: boolean) => setSelected((prev) =>
    checked ? [...prev, id] : prev.filter((x) => x !== id));

  const SortHead = ({ label, sortKey: key, className }: { label: string; sortKey: string; className?: string }) => {
    const active = sort.key === key && sort.direction;
    const Icon = !active ? ChevronsUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => handleSort(key)}
          className={cn('inline-flex items-center gap-1 hover:text-foreground transition-colors', active ? 'text-foreground font-semibold' : 'text-muted-foreground')}
        >
          {label}
          <Icon className="h-3.5 w-3.5" />
        </button>
      </TableHead>
    );
  };

  const kpiCards = [
    { label: 'En cours', value: kpis?.total_en_cours ?? 0, icon: FileClock, tone: 'bg-primary/10 text-primary', onClick: () => applyPreset('all') },
    { label: 'En retard', value: kpis?.en_retard ?? 0, icon: AlertTriangle, tone: 'bg-destructive/10 text-destructive', onClick: () => applyPreset('late') },
    { label: 'Échéance ≤ 7 j', value: kpis?.echeance_7j ?? 0, icon: Clock, tone: 'bg-amber-100 text-amber-700', onClick: () => applyPreset('week') },
    { label: 'Pièces attendues', value: kpis?.pieces_attendues ?? 0, icon: Clock, tone: 'bg-amber-100 text-amber-700', onClick: () => setParams({ status: 'pieces_attendues' }) },
    { label: 'Déposées ce mois', value: kpis?.deposees_ce_mois ?? 0, icon: CheckCircle2, tone: 'bg-green-100 text-green-700', onClick: () => setParams({ status: 'depose', preset: 'month', from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  ];

  const hasFilters = searchParams.toString().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Échéancier</h1>
        <p className="text-muted-foreground text-sm">Ne rien rater — pilotage quotidien des dossiers.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {kpiCards.map((k) => (
          <Card
            key={k.label}
            className={cn('shadow-card cursor-pointer transition hover:shadow-card-hover', k.label === 'En retard' && (kpis?.en_retard ?? 0) > 0 && 'border-destructive/40')}
            onClick={k.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold font-display mt-1">{k.value}</p>
                </div>
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', k.tone)}>
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Presets */}
          <div className="flex flex-wrap gap-1">
            {([
              { key: 'late', label: 'En retard' },
              { key: 'week', label: 'Cette semaine' },
              { key: 'month', label: 'Ce mois' },
              { key: 'all', label: 'Tous' },
            ] as { key: Preset; label: string }[]).map((p) => (
              <Button
                key={p.key}
                size="sm"
                variant={preset === p.key ? 'default' : 'outline'}
                onClick={() => applyPreset(p.key)}
              >
                {p.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" className="ml-auto" onClick={resetFilters} disabled={!hasFilters}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Réinitialiser les filtres
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-end">
            <div className="min-w-[220px] flex-1">
              <label className="text-xs text-muted-foreground">Recherche client</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setParams({ q: e.target.value || null })}
                  placeholder="Nom du client…"
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Statut</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48 justify-between font-normal">
                    {statuses.length === 0 ? 'Tous' : `${statuses.length} sélectionné(s)`}
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 pointer-events-auto" align="start">
                  <div className="space-y-1">
                    <button
                      type="button"
                      className="w-full text-left text-sm px-2 py-1 rounded hover:bg-muted"
                      onClick={() => setParams({ status: null })}
                    >
                      Tous
                    </button>
                    {Object.entries(OBLIGATION_STATUS).map(([k, v]) => (
                      <label key={k} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer">
                        <Checkbox
                          checked={statuses.includes(k)}
                          onCheckedChange={(c) => toggleStatus(k, !!c)}
                        />
                        <span className="text-sm">{v.label}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Obligation</label>
              <Select value={obligation} onValueChange={(v) => setParams({ obligation: v === 'all' ? null : v })}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {obligationOptions.map(([code, label]) => (
                    <SelectItem key={code} value={code}>{code} — {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Collaborateur assigné</label>
              <Select value={assignee} onValueChange={(v) => setParams({ assignee: v === 'all' ? null : v })}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {collabs.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Client</label>
              <Select value={clientId} onValueChange={(v) => setParams({ client: v === 'all' ? null : v })}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Du</label>
              <Input type="date" value={from} onChange={(e) => setParams({ from: e.target.value, preset: null })} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Au</label>
              <Input type="date" value={to} onChange={(e) => setParams({ to: e.target.value, preset: null })} className="w-40" />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm">Mes dossiers</label>
              <Switch checked={mineOnly} onCheckedChange={(v) => setParams({ mine: v ? '1' : null })} />
            </div>
          </div>

          {isResponsable && selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <span className="text-sm font-medium">{selected.length} sélectionnée(s)</span>
              <Select onValueChange={(v) => bulk.mutate({ ids: selected, values: { assigned_to: v } }, { onSuccess: () => setSelected([]) })}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Affecter à…" /></SelectTrigger>
                <SelectContent>
                  {collabs.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => bulk.mutate({ ids: selected, values: { status: v } }, { onSuccess: () => setSelected([]) })}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Changer statut…" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(OBLIGATION_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Annuler</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement…</div>
          ) : sorted.length === 0 ? (
            <EmptyState icon={FileClock} title="Aucune échéance sur la période." description="Ajustez les filtres ou générez l'échéancier." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isResponsable && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selected.length === sorted.length && sorted.length > 0}
                        onCheckedChange={(v) => toggleAll(!!v)}
                      />
                    </TableHead>
                  )}
                  <SortHead label="Client" sortKey="client_name" />
                  <TableHead>Obligation</TableHead>
                  <TableHead>Période</TableHead>
                  <SortHead label="Échéance" sortKey="due_date" />
                  <SortHead label="J‑X" sortKey="days_left" />
                  <SortHead label="Statut" sortKey="status" />
                  <TableHead>Pièces</TableHead>
                  <TableHead>Assigné</TableHead>
                  <SortHead label="Dernière relance" sortKey="last_reminder_at" />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r) => {
                  const jxBadge = r.is_late
                    ? <Badge variant="destructive">Retard {Math.abs(r.days_left)}j</Badge>
                    : r.days_left <= 7
                      ? <Badge className="bg-amber-500 hover:bg-amber-500 text-white">J‑{r.days_left}</Badge>
                      : <Badge variant="secondary">J‑{r.days_left}</Badge>;
                  const staleRelance = r.status === 'pieces_attendues' && (!r.last_reminder_at ||
                    (Date.now() - new Date(r.last_reminder_at).getTime()) > 7 * 86400000);
                  const nxt = nextStatus(r.status);
                  return (
                    <TableRow
                      key={r.id}
                      className={cn('cursor-pointer hover:bg-muted/50', r.is_late && 'border-l-4 border-l-destructive')}
                      onClick={() => setDetailRow(r)}
                    >
                      {isResponsable && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.includes(r.id)}
                            onCheckedChange={(v) => toggleOne(r.id, !!v)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{r.client_name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{r.obligation_label}</span>
                          <span className="text-[11px] text-muted-foreground">{r.obligation_code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.period_label}</TableCell>
                      <TableCell className="text-sm">{format(new Date(r.due_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{jxBadge}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadgeClasses(r.status)}>{statusLabel(r.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const c = docCounts?.[r.id];
                          if (!c || c.total === 0) return <span className="text-xs text-muted-foreground">—</span>;
                          const done = c.received >= c.total;
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-[11px] border',
                                done
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : c.received === 0
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : 'bg-amber-100 text-amber-800 border-amber-200',
                              )}>
                                {c.received}/{c.total} pièces
                              </span>
                              {c.pending_validation > 0 && (
                                <span className="h-2 w-2 rounded-full bg-amber-500" title="Dépôts à valider" />
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-sm">{r.assigned_name ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          {r.last_reminder_at
                            ? formatDistanceToNow(new Date(r.last_reminder_at), { addSuffix: true, locale: fr })
                            : '—'}
                          {staleRelance && <span className="h-2 w-2 rounded-full bg-amber-500" title="Relance à effectuer" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {r.status === 'pieces_attendues' && (
                            <Button size="sm" variant="outline" onClick={() => setRelanceRow(r)}>
                              <Send className="h-3.5 w-3.5 mr-1" /> Relancer
                            </Button>
                          )}
                          {nxt && (
                            <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: r.id, status: nxt })}>
                              <ArrowRight className="h-3.5 w-3.5 mr-1" /> Étape suivante
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {detailRow && (
        <ObligationDetailDialog
          row={detailRow}
          open={!!detailRow}
          onOpenChange={(o) => !o && setDetailRow(null)}
          onRelance={(r) => setRelanceRow(r)}
        />
      )}
      {relanceRow && (
        <RelanceDialog
          row={relanceRow}
          open={!!relanceRow}
          onOpenChange={(o) => !o && setRelanceRow(null)}
        />
      )}
    </div>
  );
};

export default EcheancierPage;
