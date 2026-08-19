import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import PortalLayout from '@/components/portal/PortalLayout';
import Loading from '@/components/common/Loading';
import { cn } from '@/lib/utils';
import { ACCEPT_ATTR } from '@/lib/portalDocs';
import { docStatusInfo, obligationStatusInfo, statusChipClass } from '@/lib/portalStatus';
import {
  useDepositObligationDoc,
  usePortalObligationDocs,
  usePortalObligations,
  type PortalObligation,
} from '@/hooks/usePortalSpace';

const fmtDate = (v?: string | null) => (v ? format(new Date(v), 'dd MMMM yyyy', { locale: fr }) : '-');

function Chip({ status }: { status: string }) {
  const info = docStatusInfo(status);
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', statusChipClass(info.color))}>
      {info.label}
    </span>
  );
}

function DocRow({ doc, periodId }: { doc: any; periodId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const deposit = useDepositObligationDoc();
  const canUpload = doc.client_status === 'a_fournir' || doc.client_status === 'a_renvoyer';

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {doc.label} {doc.is_required && <span className="text-destructive">*</span>}
        </p>
        <Chip status={doc.client_status} />
      </div>

      {doc.client_status === 'a_renvoyer' && doc.reject_reason && (
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Motif : {doc.reject_reason}
        </p>
      )}

      {doc.client_status === 'en_verification' && (
        <p className="text-xs text-muted-foreground">
          {doc.file_name} - En cours de vérification par votre comptable
        </p>
      )}

      {doc.client_status === 'valide' && (
        <p className="flex items-center gap-1 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Reçu le {fmtDate(doc.deposited_at)}
        </p>
      )}

      {canUpload && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) deposit.mutate({ documentId: doc.id, file, periodId });
            }}
          />
          <Button size="sm" variant="outline" disabled={deposit.isPending} onClick={() => inputRef.current?.click()}>
            {deposit.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {doc.client_status === 'a_renvoyer' ? 'Renvoyer le document' : 'Déposer le document'}
          </Button>
        </>
      )}
    </div>
  );
}

function ObligationCard({ item }: { item: PortalObligation }) {
  const [open, setOpen] = useState(false);
  const { data: docs = [], isLoading } = usePortalObligationDocs(open ? item.id : undefined);
  const info = obligationStatusInfo(item.client_status);

  const required = docs.filter((d) => d.is_required);
  const provided = required.filter((d) => d.client_status !== 'a_fournir' && d.client_status !== 'a_renvoyer');

  return (
    <Card className={cn(item.is_late && 'border-l-4 border-l-destructive')}>
      <CardContent className="p-4">
        <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((o) => !o)}>
          <div className="space-y-1">
            <p className="font-semibold">{item.obligation}</p>
            <p className="text-sm text-muted-foreground">
              {item.period_label} - échéance {fmtDate(item.due_date)}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', statusChipClass(info.color))}>
                {info.label}
              </span>
              {item.is_late && (
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  En retard
                </span>
              )}
              {item.documents_pending > 0 && (
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  {item.documents_pending} pièce{item.documents_pending > 1 ? 's' : ''} à fournir
                </span>
              )}
            </div>
          </div>
          {open ? <ChevronDown className="h-5 w-5 shrink-0" /> : <ChevronRight className="h-5 w-5 shrink-0" />}
        </button>

        {open && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {isLoading && <Loading />}
            {!isLoading && docs.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune pièce demandée pour cette échéance.</p>
            )}
            {!isLoading && required.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {provided.length}/{required.length} pièces fournies
                </p>
                <Progress value={required.length ? (provided.length / required.length) * 100 : 0} className="h-1.5" />
              </div>
            )}
            {docs.map((d) => (
              <DocRow key={d.id} doc={d} periodId={item.id} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PortalObligationsPage() {
  const { data, isLoading } = usePortalObligations();

  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Mes échéances</h1>

        {isLoading && <Loading />}

        {!isLoading && (data?.upcoming.length ?? 0) === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Aucune échéance en cours. Votre cabinet vous informera des prochaines démarches.
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {(data?.upcoming ?? []).map((item) => (
            <ObligationCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
