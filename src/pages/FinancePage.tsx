import { useState } from 'react';
import { DollarSign, TrendingUp, Receipt, FileText, Plus, Check, X } from 'lucide-react';
import ExportMenu from '@/components/common/ExportMenu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMissionBudgetSummary, useDailyRates, useUpsertDailyRate, useExpenses, useApproveExpense, useCreateExpense, useInvoices, useCreateInvoice, useUpdateInvoice } from '@/hooks/useTimesheets';
import { useBudgetsDuCabinet, useSetMissionBudget, formatMontant, type BudgetDuCabinet } from '@/hooks/useMissionBudget';
import { toast } from 'sonner';
import { useMissions, useClients } from '@/hooks/useMissions';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmptyState from '@/components/common/EmptyState';
import { useTableSort } from '@/hooks/useTableSort';
import { SortableTableHead } from '@/components/ui/sortable-table-head';

const GRADES = ['DA', 'DM', 'MGR', 'SUP', 'AS', 'AUD', 'AJ', 'STG'];
const EXPENSE_CATEGORIES = ['Transport', 'Hébergement', 'Restauration', 'Fournitures', 'Communication', 'Autre'];

const RATES_RESERVED = 'Les taux journaliers sont réservés à la direction.';
const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

function FixerBudgetDialog({ row }: { row: BudgetDuCabinet }) {
  const [open, setOpen] = useState(false);
  const [montant, setMontant] = useState(row.montant != null ? String(row.montant) : '');
  const [devise, setDevise] = useState(row.devise || 'XOF');
  const [notes, setNotes] = useState(row.notes ?? '');
  const setBudget = useSetMissionBudget();
  const valeur = Number(montant.replace(/\s/g, ''));
  const valide = montant.trim() !== '' && Number.isFinite(valeur) && valeur >= 0;

  const enregistrer = () => {
    setBudget.mutate({ missionId: row.mission_id, montant: valeur, devise, notes }, {
      onSuccess: () => { toast.success('Budget enregistré'); setOpen(false); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Fixer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Budget de {row.code}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{row.intitule}</p>
          <div className="grid grid-cols-3 gap-2">
            <Input className="col-span-2 tabular-nums" inputMode="numeric" placeholder="Montant" value={montant} onChange={(e) => setMontant(e.target.value)} />
            <Select value={devise} onValueChange={setDevise}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['XOF', 'XAF', 'EUR', 'USD'].map((d) => <SelectItem key={d} value={d}>{d === 'XOF' ? 'FCFA' : d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Notes (facultatif)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button className="w-full" disabled={!valide || setBudget.isPending} onClick={enregistrer}>Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BudgetTab() {
  const { data: budgets = [], isLoading } = useBudgetsDuCabinet();
  const { data: summary } = useMissionBudgetSummary();
  const ratesAvailable = summary?.ratesAvailable ?? false;
  const conso = new Map((summary?.rows ?? []).map((r) => [r.id, r]));
  const rows = budgets.map((b) => {
    const c = conso.get(b.mission_id);
    const montant = b.montant != null ? Number(b.montant) : null;
    return {
      ...b, montant,
      total_hours: c?.total_hours ?? 0,
      total_cost: montant != null ? (c?.total_cost ?? null) : null,
      consumed_pct: montant != null ? (c?.consumed_pct ?? null) : null,
    };
  });
  const { sorted, sort, handleSort } = useTableSort(rows);
  const montantDe = (m: number | null, d: string | null) => (m == null ? '—' : formatMontant(m, d || 'XOF'));

  const getBarColor = (pct: number) => {
    if (pct < 70) return 'bg-success';
    if (pct < 90) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Seules apparaissent les missions dont vous êtes associé ou directeur de mission.
        </p>
        <ExportMenu
          data={rows.map((m) => ({
            mission: m.intitule,
            code: m.code,
            budget: m.montant ?? '',
            heures: m.total_hours.toFixed(1),
            cout_reel: m.total_cost ?? '',
            marge: m.total_cost !== null && m.montant != null ? m.montant - m.total_cost : '',
            consomme_pct: m.consumed_pct !== null ? `${m.consumed_pct}%` : '',
          }))}
          filename="budget-missions"
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'mission', label: 'Mission' },
            { key: 'budget', label: 'Budget (FCFA)' },
            { key: 'heures', label: 'Heures' },
            { key: 'cout_reel', label: 'Coût réel (FCFA)' },
            { key: 'marge', label: 'Marge (FCFA)' },
            { key: 'consomme_pct', label: '% Consommé' },
          ]}
          title="Budget des missions"
        />
      </div>
      {!isLoading && !ratesAvailable && (
        <p className="text-sm text-muted-foreground">{RATES_RESERVED}</p>
      )}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="intitule" currentSort={sort} onSort={handleSort}>Mission</SortableTableHead>
                <SortableTableHead sortKey="montant" currentSort={sort} onSort={handleSort} className="text-right">Budget</SortableTableHead>
                <SortableTableHead sortKey="total_hours" currentSort={sort} onSort={handleSort} className="text-right">Heures</SortableTableHead>
                {ratesAvailable && (
                  <>
                    <SortableTableHead sortKey="total_cost" currentSort={sort} onSort={handleSort} className="text-right">Coût réel</SortableTableHead>
                    <TableHead className="text-right">Marge</TableHead>
                    <SortableTableHead sortKey="consumed_pct" currentSort={sort} onSort={handleSort} className="w-[180px]">Consommé</SortableTableHead>
                  </>
                )}
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && sorted.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Aucun budget de mission visible</TableCell></TableRow>
              )}
              {sorted.map((m) => (
                <TableRow key={m.mission_id}>
                  <TableCell>
                    <div className="font-medium text-sm">{m.intitule}</div>
                    <div className="text-xs text-muted-foreground">{m.code}{m.fixe_par ? ` · fixé par ${m.fixe_par}` : ''}</div>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{montantDe(m.montant, m.devise)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{m.total_hours.toFixed(1)} h</TableCell>
                  {ratesAvailable && (
                    <>
                      <TableCell className="text-right text-sm tabular-nums">{m.total_cost !== null ? fcfa(m.total_cost) : '—'}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{m.total_cost !== null && m.montant != null ? fcfa(m.montant - m.total_cost) : '—'}</TableCell>
                      <TableCell>
                        {m.consumed_pct !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                              <div className={cn('h-full rounded-full', getBarColor(m.consumed_pct))} style={{ width: `${Math.min(m.consumed_pct, 100)}%` }} />
                            </div>
                            <span className="text-xs font-medium w-10 text-right tabular-nums">{m.consumed_pct}%</span>
                          </div>
                        ) : <span className="text-sm text-muted-foreground">—</span>}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right">{m.peut_le_fixer && <FixerBudgetDialog row={m} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DailyRatesTab() {
  const { data: rates = [], isLoading } = useDailyRates();
  const upsert = useUpsertDailyRate();
  const [editing, setEditing] = useState<Record<string, number>>({});

  const rateMap: Record<string, { id: string; daily_rate: number }> = {};
  for (const r of rates) {
    rateMap[r.grade] = { id: r.id, daily_rate: Number(r.daily_rate) };
  }

  const handleSave = (grade: string) => {
    const val = editing[grade];
    if (val === undefined || !(val > 0)) return;
    const existing = rateMap[grade];
    upsert.mutate({ id: existing?.id, grade, daily_rate: val });
    setEditing((p) => { const n = { ...p }; delete n[grade]; return n; });
  };

  if (isLoading) return null;
  // Zero rows is the RLS rule for grades below 2, not an error.
  if (rates.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">{RATES_RESERVED}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grade</TableHead>
              <TableHead className="text-right">Taux journalier (FCFA)</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {GRADES.map((g) => {
              const current = rateMap[g];
              const isEditing = editing[g] !== undefined;
              return (
                <TableRow key={g}>
                  <TableCell className="font-medium">{g}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {isEditing ? (
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-40 ml-auto text-right"
                        value={editing[g] || ''}
                        onChange={(e) => setEditing((p) => ({ ...p, [g]: Number(e.target.value) }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave(g)}
                      />
                    ) : (
                      <span>{current ? fcfa(current.daily_rate) : '—'}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Button size="sm" variant="ghost" aria-label="Enregistrer" onClick={() => handleSave(g)}><Check className="h-4 w-4" /></Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setEditing((p) => ({ ...p, [g]: current?.daily_rate ?? 0 }))}>
                        Modifier
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ExpensesTab() {
  const profile = useAuthStore((s) => s.profile);
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: expenses = [] } = useExpenses({ status: statusFilter });
  const { sorted: sortedExpenses, sort: expSort, handleSort: handleExpSort } = useTableSort(expenses);
  const approveExpense = useApproveExpense();
  const createExpense = useCreateExpense();
  const { data: missions = [] } = useMissions();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), category: '', description: '', mission_id: '' });

  const isSuperior = (profile?.grade_level ?? 99) <= 4;

  const handleCreate = () => {
    createExpense.mutate({
      amount: Number(form.amount),
      date: form.date,
      category: form.category,
      description: form.description,
      mission_id: form.mission_id || undefined,
    });
    setAddOpen(false);
    setForm({ amount: '', date: format(new Date(), 'yyyy-MM-dd'), category: '', description: '', mission_id: '' });
  };

  const statusLabel: Record<string, string> = { draft: 'Brouillon', submitted: 'Soumis', approved: 'Approuvé', rejected: 'Rejeté' };
  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary', submitted: 'outline', approved: 'default', rejected: 'destructive',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="submitted">Soumis</SelectItem>
            <SelectItem value="approved">Approuvé</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <ExportMenu
          data={expenses.map((exp: any) => ({
            date: format(new Date(exp.date), 'dd/MM/yyyy'),
            employe: exp.user?.full_name ?? '',
            categorie: exp.category ?? '',
            mission: exp.mission?.name ?? '',
            montant: Number(exp.amount),
            statut: statusLabel[exp.status] ?? exp.status,
          }))}
          filename="notes-de-frais"
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'employe', label: 'Employé' },
            { key: 'categorie', label: 'Catégorie' },
            { key: 'mission', label: 'Mission' },
            { key: 'montant', label: 'Montant (FCFA)' },
            { key: 'statut', label: 'Statut' },
          ]}
          title="Notes de frais"
        />
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle note</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle note de frais</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Montant *</label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Catégorie</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Mission</label>
                <Select value={form.mission_id} onValueChange={(v) => setForm({ ...form, mission_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    {missions.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <Button onClick={handleCreate} disabled={!form.amount} className="w-full">Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="date" currentSort={expSort} onSort={handleExpSort}>Date</SortableTableHead>
                <SortableTableHead sortKey="user.full_name" currentSort={expSort} onSort={handleExpSort}>Employé</SortableTableHead>
                <SortableTableHead sortKey="category" currentSort={expSort} onSort={handleExpSort}>Catégorie</SortableTableHead>
                <SortableTableHead sortKey="mission.name" currentSort={expSort} onSort={handleExpSort}>Mission</SortableTableHead>
                <SortableTableHead sortKey="amount" currentSort={expSort} onSort={handleExpSort} className="text-right">Montant</SortableTableHead>
                <SortableTableHead sortKey="status" currentSort={expSort} onSort={handleExpSort}>Statut</SortableTableHead>
                {isSuperior && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedExpenses.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Aucune note de frais</TableCell></TableRow>
              )}
              {sortedExpenses.map((exp: any) => (
                <TableRow key={exp.id}>
                  <TableCell className="text-sm">{format(new Date(exp.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-sm">{exp.user?.full_name || '-'}</TableCell>
                  <TableCell className="text-sm">{exp.category || '-'}</TableCell>
                  <TableCell className="text-sm">{exp.mission?.name || '-'}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{Number(exp.amount).toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell><Badge variant={statusVariant[exp.status] || 'secondary'}>{statusLabel[exp.status] || exp.status}</Badge></TableCell>
                  {isSuperior && (
                    <TableCell>
                      {exp.status === 'draft' || exp.status === 'submitted' ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => approveExpense.mutate({ id: exp.id, action: 'approved' })}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => approveExpense.mutate({ id: exp.id, action: 'rejected' })}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoicesTab() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: invoices = [] } = useInvoices({ status: statusFilter });
  const { sorted: sortedInvoices, sort: invSort, handleSort: handleInvSort } = useTableSort(invoices);
  const { data: missions = [] } = useMissions();
  const { data: clients = [] } = useClients();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: '', mission_id: '', type: 'standard', amount: '', tax_pct: '18', notes: '', due_date: '',
  });

  const handleCreate = () => {
    const amount = Number(form.amount);
    const taxPct = Number(form.tax_pct) / 100;
    const taxAmount = Math.round(amount * taxPct);
    createInvoice.mutate({
      client_id: form.client_id,
      mission_id: form.mission_id || undefined,
      type: form.type,
      amount,
      tax_amount: taxAmount,
      total_amount: amount + taxAmount,
      notes: form.notes,
      due_date: form.due_date || undefined,
    });
    setAddOpen(false);
    setForm({ client_id: '', mission_id: '', type: 'standard', amount: '', tax_pct: '18', notes: '', due_date: '' });
  };

  const statusLabel: Record<string, string> = { draft: 'Brouillon', sent: 'Envoyée', paid: 'Payée', overdue: 'En retard', cancelled: 'Annulée' };
  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary', sent: 'outline', paid: 'default', overdue: 'destructive', cancelled: 'secondary',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="sent">Envoyée</SelectItem>
            <SelectItem value="paid">Payée</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
          </SelectContent>
        </Select>
        <ExportMenu
          data={invoices.map((inv: any) => ({
            numero: inv.invoice_number,
            client: inv.client?.name ?? '',
            mission: inv.mission?.name ?? '',
            type: inv.type,
            montant_ttc: Number(inv.total_amount),
            echeance: inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yyyy') : '',
            statut: statusLabel[inv.status] ?? inv.status,
          }))}
          filename="factures"
          columns={[
            { key: 'numero', label: 'N° Facture' },
            { key: 'client', label: 'Client' },
            { key: 'mission', label: 'Mission' },
            { key: 'type', label: 'Type' },
            { key: 'montant_ttc', label: 'Montant TTC (FCFA)' },
            { key: 'echeance', label: 'Échéance' },
            { key: 'statut', label: 'Statut' },
          ]}
          title="Factures"
        />
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle facture</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nouvelle facture</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Client *</label>
                <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Mission</label>
                <Select value={form.mission_id} onValueChange={(v) => setForm({ ...form, mission_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>{missions.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="proforma">Proforma</SelectItem>
                      <SelectItem value="avoir">Avoir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Échéance</label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Montant HT *</label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">TVA (%)</label>
                  <Input type="number" value={form.tax_pct} onChange={(e) => setForm({ ...form, tax_pct: e.target.value })} />
                </div>
              </div>
              {form.amount && (
                <div className="text-sm text-right text-muted-foreground">
                  Total TTC : <span className="font-semibold text-foreground">{(Number(form.amount) * (1 + Number(form.tax_pct) / 100)).toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <Button onClick={handleCreate} disabled={!form.client_id || !form.amount} className="w-full">Créer la facture</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="invoice_number" currentSort={invSort} onSort={handleInvSort}>N° Facture</SortableTableHead>
                <SortableTableHead sortKey="client.name" currentSort={invSort} onSort={handleInvSort}>Client</SortableTableHead>
                <SortableTableHead sortKey="mission.name" currentSort={invSort} onSort={handleInvSort}>Mission</SortableTableHead>
                <SortableTableHead sortKey="type" currentSort={invSort} onSort={handleInvSort}>Type</SortableTableHead>
                <SortableTableHead sortKey="total_amount" currentSort={invSort} onSort={handleInvSort} className="text-right">Montant TTC</SortableTableHead>
                <SortableTableHead sortKey="due_date" currentSort={invSort} onSort={handleInvSort}>Échéance</SortableTableHead>
                <SortableTableHead sortKey="status" currentSort={invSort} onSort={handleInvSort}>Statut</SortableTableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Aucune facture</TableCell></TableRow>
              )}
              {sortedInvoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="tabular-nums text-sm">{inv.invoice_number}</TableCell>
                  <TableCell className="text-sm">{inv.client?.name || '-'}</TableCell>
                  <TableCell className="text-sm">{inv.mission?.name || '-'}</TableCell>
                  <TableCell className="text-sm capitalize">{inv.type}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{Number(inv.total_amount).toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell className="text-sm">{inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell><Badge variant={statusVariant[inv.status] || 'secondary'}>{statusLabel[inv.status] || inv.status}</Badge></TableCell>
                  <TableCell>
                    {inv.status === 'draft' && (
                      <Button size="sm" variant="ghost" onClick={() => updateInvoice.mutate({ id: inv.id, status: 'sent' })}>
                        Envoyer
                      </Button>
                    )}
                    {inv.status === 'sent' && (
                      <Button size="sm" variant="ghost" onClick={() => updateInvoice.mutate({ id: inv.id, status: 'paid', paid_at: new Date().toISOString() })}>
                        Payée
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

const FinancePage = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-3">
      <DollarSign className="h-6 w-6 text-primary" />
      <h1 className="text-2xl font-semibold ">Suivi financier</h1>
    </div>

    <Tabs defaultValue="budget" className="space-y-4">
      <TabsList>
        <TabsTrigger value="budget"><TrendingUp className="h-4 w-4 mr-1" /> Budget</TabsTrigger>
        <TabsTrigger value="rates"><DollarSign className="h-4 w-4 mr-1" /> Taux</TabsTrigger>
        <TabsTrigger value="expenses"><Receipt className="h-4 w-4 mr-1" /> Notes de frais</TabsTrigger>
        <TabsTrigger value="invoices"><FileText className="h-4 w-4 mr-1" /> Facturation</TabsTrigger>
      </TabsList>
      <TabsContent value="budget"><BudgetTab /></TabsContent>
      <TabsContent value="rates"><DailyRatesTab /></TabsContent>
      <TabsContent value="expenses"><ExpensesTab /></TabsContent>
      <TabsContent value="invoices"><InvoicesTab /></TabsContent>
    </Tabs>
  </div>
);

export default FinancePage;
