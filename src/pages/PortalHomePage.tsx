import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarClock, FileText, Receipt, Video, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PortalLayout from '@/components/portal/PortalLayout';
import Loading from '@/components/common/Loading';
import { usePortalDashboard } from '@/hooks/usePortalSpace';
import { cn } from '@/lib/utils';

const fmtDate = (v?: string | null) => (v ? format(new Date(v), 'dd MMMM yyyy', { locale: fr }) : '-');
const fmtDateTime = (v?: string | null) =>
  v ? format(new Date(v), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr }) : '-';

export default function PortalHomePage() {
  const navigate = useNavigate();
  const { data, isLoading } = usePortalDashboard();

  if (isLoading) {
    return (
      <PortalLayout>
        <Loading />
      </PortalLayout>
    );
  }

  const pending = Number(data?.pending_documents ?? 0);
  const newDocs = Number(data?.new_documents ?? 0);
  const unpaid = Number(data?.unpaid_invoices ?? 0);
  const deadline = data?.next_deadline ?? null;
  const meeting = data?.next_meeting ?? null;
  const allClear = pending === 0 && newDocs === 0 && unpaid === 0 && !deadline;

  const cards = [
    pending > 0 && {
      key: 'pending',
      icon: CalendarClock,
      label: `${pending} pièce${pending > 1 ? 's' : ''} à fournir`,
      to: '/espace-client/obligations',
      cls: 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30',
    },
    newDocs > 0 && {
      key: 'docs',
      icon: FileText,
      label: `${newDocs} nouveau${newDocs > 1 ? 'x' : ''} document${newDocs > 1 ? 's' : ''}`,
      to: '/espace-client/documents',
      cls: 'border-[#E67433]/40 bg-[#E67433]/10 text-[#9c4514] dark:text-[#f0a06e]',
    },
    unpaid > 0 && {
      key: 'inv',
      icon: Receipt,
      label: `${unpaid} facture${unpaid > 1 ? 's' : ''} à régler`,
      to: '/espace-client/factures',
      cls: 'border-[#16519C]/40 bg-[#16519C]/10 text-[#16519C] dark:text-[#7fa8de]',
    },
  ].filter(Boolean) as { key: string; icon: typeof FileText; label: string; to: string; cls: string }[];

  return (
    <PortalLayout clientName={data?.client_name}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Bonjour, {data?.client_name ?? ''}</h1>
          {data?.organization_name && (
            <p className="text-sm text-muted-foreground">
              Votre espace ouvert par <strong className="text-foreground">{data.organization_name}</strong>
            </p>
          )}
        </div>

        {cards.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {cards.map((c) => (
              <button key={c.key} onClick={() => navigate(c.to)} className="text-left">
                <Card className={cn('h-full border transition hover:shadow-md', c.cls)}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <c.icon className="h-6 w-6 shrink-0" />
                    <span className="text-sm font-semibold">{c.label}</span>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}

        {deadline && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Prochaine échéance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold text-foreground">{deadline.obligation}</p>
              <p className="text-muted-foreground">
                {deadline.period_label} - {fmtDate(deadline.due_date)}
              </p>
              <p className={cn('font-medium', Number(deadline.days_left) < 0 ? 'text-destructive' : 'text-foreground')}>
                {Number(deadline.days_left) < 0
                  ? `En retard de ${Math.abs(Number(deadline.days_left))} jours`
                  : `dans ${deadline.days_left} jours`}
              </p>
            </CardContent>
          </Card>
        )}

        {meeting && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Video className="h-4 w-4" /> Prochaine réunion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold">{meeting.title}</p>
              <p className="text-muted-foreground">{fmtDateTime(meeting.scheduled_at)}</p>
              {meeting.meeting_link && (
                <Button size="sm" onClick={() => window.open(meeting.meeting_link!, '_blank', 'noopener')}>
                  Rejoindre
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {allClear && !meeting && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm text-muted-foreground">
                Vous êtes à jour. Votre cabinet vous contactera si besoin.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
}
