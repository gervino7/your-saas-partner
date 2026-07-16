import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, Clock, FileClock, CheckCircle2, Send, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEcheancier, useObligationsKpis, useBulkUpdateObligations, useOrgCollaborators, type EcheancierRow } from '@/hooks/useObligations';
import { useClientsFullList } from '@/hooks/useCRM';
import { useAuthStore } from '@/stores/authStore';
import { OBLIGATION_STATUS, STATUS_FLOW, statusBadgeClasses, statusLabel, nextStatus } from '@/lib/obligations';
import { useUpdateObligation } from '@/hooks/useObligations';
import ObligationDetailDialog from '@/components/obligations/ObligationDetailDialog';
import RelanceDialog from '@/components/obligations/RelanceDialog';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';

const today = () => format(new Date(), 'yyyy-MM-dd');

const EcheancierPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;
  const isResponsable = gradeLevel <= 3;
  const navigate = useNavigate();

  const [from, setFrom] = useState<string>(today());
  const [to, setTo] = useState<string>(format(addDays(new Date(), 60), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<string>('all');
  const [clientId, setClientId] = useState<string>('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailRow, setDetailRow] = useState<EcheancierRow | null>(null);
  const [relanceRow, setRelanceRow] = useState<EcheancierRow | null>(null);
  const [lateOnly, setLateOnly] = useState(false);

  const { data: kpis } = useObligationsKpis();
  const { data: rows = [], isLoading } = useEcheancier({
    from, to,
    status: status === 'all' ? null : status,
    clientId: clientId === 'all' ? null : clientId,
  });
  const { data: clients = [] } = useClientsFullList();
  const { data: collabs = [] } = useOrgCollaborators();
  const update = useUpdateObligation();
  const bulk = useBulkUpdateObligations();

  const filtered = useMemo(() => {
    let r = rows;
    if (mineOnly) r = r.filter((x) => x.assigned_to === profile?.id);
    if (lateOnly) r = r.filter((x) => x.is_late);
    return r;
  }, [rows, mineOnly, lateOnly, profile?.id]);

  const applyPreset = (kind: 'month' | '30d' | 'late') => {
    if (kind === 'month') {
      setFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
      setTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
      setLateOnly(false);
    } else if (kind === '30d') {
      setFrom(today());
      setTo(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
      setLateOnly(false);
    } else {
      setFrom(format(addDays(new Date(), -365), 'yyyy-MM-dd'));
      setTo(today());
      setLateOnly(true);
    }
  };

  const toggleAll = (checked: boolean) => setSelected(checked ? filtered.map((r) => r.id) : []);
  const toggleOne = (id: string, checked: boolean) => setSelected((prev) =>
    checked ? [...prev, id] : prev.filter((x) => x !== id));

  const kpiCards = [
    { label: 'En cours', value: kpis?.total_en_cours ?? 0, icon: FileClock, tone: 'bg-primary/10 text-primary', onClick: () => { setStatus('all'); setLateOnly(false); } },
    { label: 'En retard', value: kpis?.en_retard ?? 0, icon: AlertTriangle, tone: 'bg-destructive/10 text-destructive', onClick: () => { setLateOnly(true); applyPreset('late'); } },
    { label: 'Échéance ≤ 7 j', value: kpis?.echeance_7j ?? 0, icon: Clock, tone: 'bg-amber-100 text-amber-700' },
    { label: 'Pièces attendues', value: kpis?.pieces_attendues ?? 0, icon: Clock, tone: 'bg-amber-100 text-amber-700', onClick: () => setStatus('pieces_attendues') },
    { label: 'Déposées ce mois', value: kpis?.deposees_ce_mois ?? 0, icon: CheckCircle2, tone: 'bg-green-100 text-green-700' },
  ];

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
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Du</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Au</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => applyPreset('month')}>Ce mois</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('30d')}>30 jours</Button>
              <Button size="sm" variant="outline" onClick={() => applyPreset('late')}>En retard</Button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Statut</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {Object.entries(OBLIGATION_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Client</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les clients</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm">Mes dossiers</label>
              <Switch checked={mineOnly} onCheckedChange={setMineOnly} />
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
          ) : filtered.length === 0 ? (
            <EmptyState icon={FileClock} title="Aucune échéance sur la période." description="Ajustez les filtres ou générez l'échéancier." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isResponsable && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selected.length === filtered.length && filtered.length > 0}
                        onCheckedChange={(v) => toggleAll(!!v)}
                      />
                    </TableHead>
                  )}
                  <TableHead>Client</TableHead>
                  <TableHead>Obligation</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>J‑X</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Assigné</TableHead>
                  <TableHead>Dernière relance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
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
