import { useState } from 'react';
import { DollarSign, TrendingUp, Receipt, FileText, Plus, Check, X } from 'lucide-react';
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
import { useMissions, useClients } from '@/hooks/useMissions';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmptyState from '@/components/common/EmptyState';

const DEFAULT_RATES: Record<string, number> = {
  DA: 750000, DM: 500000, CM: 400000, SUP: 300000,
  AS: 250000, AUD: 200000, AJ: 150000, STG: 75000,
};

const GRADES = ['DA', 'DM', 'CM', 'SUP', 'AS', 'AUD', 'AJ', 'STG'];
const EXPENSE_CATEGORIES = ['Transport', 'Hébergement', 'Restauration', 'Fournitures', 'Communication', 'Autre'];

function BudgetTab() {
  const { data: summaries = [], isLoading } = useMissionBudgetSummary();

  const getBarColor = (pct: number) => {
    if (pct < 70) return 'bg-green-500';
    if (pct < 90) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mission</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Heures</TableHead>
                <TableHead className="text-right">Coût réel</TableHead>
                <TableHead className="text-right">Marge</TableHead>
                <TableHead className="w-[180px]">Consommé</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Aucune mission active</TableCell></TableRow>
              )}
              {summaries.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.code}</div>
                  </TableCell>
                  <TableCell className="text-right text-sm">{m.budget ? `${m.budget.toLocaleString('fr-FR')} FCFA` : '—'}</TableCell>
                  <TableCell className="text-right text-sm">{m.total_hours.toFixed(1)}h</TableCell>
                  <TableCell className="text-right text-sm">{m.total_cost.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell className="text-right text-sm">
                    {m.budget ? `${(m.budget - m.total_cost).toLocaleString('fr-FR')} FCFA` : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", getBarColor(m.consumed_pct))} style={{ width: `${Math.min(m.consumed_pct, 100)}%` }} />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{m.consumed_pct}%</span>
                    </div>
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

function DailyRatesTab() {
  const { data: rates = [] } = useDailyRates();
  const upsert = useUpsertDailyRate();
  const [editing, setEditing] = useState<Record<string, number>>({});

  const rateMap: Record<string, { id: string; daily_rate: number }> = {};
  for (const r of rates) {
    rateMap[r.grade] = { id: r.id, daily_rate: Number(r.daily_rate) };
  }

  const handleSave = (grade: string) => {
    const val = editing[grade];
    if (val === undefined) return;
    const existing = rateMap[grade];
    upsert.mutate({ id: existing?.id, grade, daily_rate: val });
    setEditing((p) => { const n = { ...p }; delete n[grade]; return n; });
  };

  const handleInit = () => {
    GRADES.forEach((g) => {
      if (!rateMap[g]) {
        upsert.mutate({ grade: g, daily_rate: DEFAULT_RATES[g] });
      }
    });
  };

  return (
    <div className="space-y-4">
      {rates.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-3">Aucun taux configuré.</p>
            <Button onClick={handleInit}><Plus className="h-4 w-4 mr-1" /> Initialiser les taux par défaut</Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead className="text-right">Taux journalier (XOF / FCFA BCEAO)</TableHead>
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
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          className="h-8 w-40 ml-auto text-right"
                          value={editing[g]}
                          onChange={(e) => setEditing((p) => ({ ...p, [g]: Number(e.target.value) }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleSave(g)}
                        />
                      ) : (
                        <span>{current ? current.daily_rate.toLocaleString() : DEFAULT_RATES[g].toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Button size="sm" variant="ghost" onClick={() => handleSave(g)}><Check className="h-4 w-4" /></Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setEditing((p) => ({ ...p, [g]: current?.daily_rate || DEFAULT_RATES[g] }))}>
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
    </div>
  );
}

function ExpensesTab() {
  const profile = useAuthStore((s) => s.profile);
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: expenses = [] } = useExpenses({ status: statusFilter });
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
                <TableHead>Date</TableHead>
                <TableHead>Employé</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Mission</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Statut</TableHead>
                {isSuperior && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Aucune note de frais</TableCell></TableRow>
              )}
              {expenses.map((exp: any) => (
                <TableRow key={exp.id}>
                  <TableCell className="text-sm">{format(new Date(exp.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-sm">{exp.user?.full_name || '—'}</TableCell>
                  <TableCell className="text-sm">{exp.category || '—'}</TableCell>
                  <TableCell className="text-sm">{exp.mission?.name || '—'}</TableCell>
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
                  Total TTC : <span className="font-bold text-foreground">{(Number(form.amount) * (1 + Number(form.tax_pct) / 100)).toLocaleString('fr-FR')} FCFA</span>
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
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Mission</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Aucune facture</TableCell></TableRow>
              )}
              {invoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                  <TableCell className="text-sm">{inv.client?.name || '—'}</TableCell>
                  <TableCell className="text-sm">{inv.mission?.name || '—'}</TableCell>
                  <TableCell className="text-sm capitalize">{inv.type}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{Number(inv.total_amount).toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell className="text-sm">{inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yyyy') : '—'}</TableCell>
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
      <h1 className="text-2xl font-bold font-display">Suivi financier</h1>
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
