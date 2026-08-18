import { Fragment, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PortalLayout from '@/components/portal/PortalLayout';
import Loading from '@/components/common/Loading';
import { cn } from '@/lib/utils';
import { formatFcfa, statusChipClass } from '@/lib/portalStatus';
import { usePortalInvoices, type PortalInvoice } from '@/hooks/usePortalSpace';

const fmtDate = (v?: string | null) => (v ? format(new Date(v), 'dd/MM/yyyy', { locale: fr }) : '-');

const INVOICE_TYPES: Record<string, string> = {
  fixed: 'Forfait',
  time_based: 'Régie',
  regie: 'Régie',
  forfait: 'Forfait',
};

function StatusBadge({ invoice }: { invoice: PortalInvoice }) {
  const { label, color } =
    invoice.status === 'paid'
      ? { label: `Payée${invoice.paid_at ? ` le ${fmtDate(invoice.paid_at)}` : ''}`, color: 'green' }
      : invoice.is_overdue
        ? { label: 'En retard', color: 'red' }
        : { label: 'À régler', color: 'blue' };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', statusChipClass(color))}>
      {label}
    </span>
  );
}

export default function PortalInvoicesPage() {
  const { data, isLoading } = usePortalInvoices();
  const [expanded, setExpanded] = useState<string | null>(null);

  const invoices = data?.invoices ?? [];
  const overdue = Number(data?.summary?.overdue_count ?? 0);

  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold">Mes factures</h1>

        {isLoading && <Loading />}

        {!isLoading && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Total dû</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatFcfa(data?.summary?.total_due)}</p>
                </CardContent>
              </Card>
              <Card className={cn(overdue > 0 && 'border-destructive')}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Factures en retard</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={cn('text-2xl font-bold', overdue > 0 && 'text-destructive')}>
                    {overdue} facture{overdue > 1 ? 's' : ''} en retard
                  </p>
                </CardContent>
              </Card>
            </div>

            {invoices.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  Aucune facture pour le moment.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N°</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead className="text-right">Montant TTC</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => {
                        const open = expanded === inv.id;
                        const lines = Array.isArray(inv.line_items) ? inv.line_items : [];
                        return (
                          <Fragment key={inv.id}>
                            <TableRow
                              className="cursor-pointer"
                              onClick={() => setExpanded(open ? null : inv.id)}
                            >
                              <TableCell className="font-medium">
                                <span className="inline-flex items-center gap-1">
                                  {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  {inv.invoice_number}
                                </span>
                              </TableCell>
                              <TableCell>{INVOICE_TYPES[inv.type ?? ''] ?? inv.type ?? '-'}</TableCell>
                              <TableCell>{fmtDate(inv.created_at)}</TableCell>
                              <TableCell>{fmtDate(inv.due_date)}</TableCell>
                              <TableCell className="text-right">{formatFcfa(inv.total_amount)}</TableCell>
                              <TableCell><StatusBadge invoice={inv} /></TableCell>
                            </TableRow>
                            {open && (
                              <TableRow>
                                <TableCell colSpan={6} className="bg-muted/40">
                                  {lines.length === 0 ? (
                                    <p className="py-2 text-sm text-muted-foreground">Aucun détail disponible.</p>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Désignation</TableHead>
                                          <TableHead className="text-right">Quantité</TableHead>
                                          <TableHead className="text-right">Prix unitaire</TableHead>
                                          <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {lines.map((l, i) => (
                                          <TableRow key={i}>
                                            <TableCell>{l.designation ?? l.description ?? '-'}</TableCell>
                                            <TableCell className="text-right">{l.quantity ?? '-'}</TableCell>
                                            <TableCell className="text-right">
                                              {l.unit_price != null ? formatFcfa(l.unit_price) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {l.total != null ? formatFcfa(l.total) : '-'}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  )}
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-muted-foreground">
              Pour toute question sur une facture, contactez votre cabinet.
            </p>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
