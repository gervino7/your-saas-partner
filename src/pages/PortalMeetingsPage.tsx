import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, Clock, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PortalLayout from '@/components/portal/PortalLayout';
import Loading from '@/components/common/Loading';
import { usePortalMeetings, type PortalMeeting } from '@/hooks/usePortalSpace';

const fmtDateTime = (v: string) => format(new Date(v), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });

function UpcomingCard({ m }: { m: PortalMeeting }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{m.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {m.description && <p className="text-muted-foreground">{m.description}</p>}
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" /> {fmtDateTime(m.scheduled_at)}
        </p>
        {m.duration_minutes && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" /> {m.duration_minutes} minutes
          </p>
        )}
        {m.meeting_link && (
          <Button onClick={() => window.open(m.meeting_link!, '_blank', 'noopener')}>
            <Video className="mr-2 h-4 w-4" /> Rejoindre la réunion
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PastCard({ m }: { m: PortalMeeting }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{m.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">{fmtDateTime(m.scheduled_at)}</p>
        {m.client_summary && (
          <div className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm">{m.client_summary}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PortalMeetingsPage() {
  const { data = [], isLoading } = usePortalMeetings();
  const upcoming = data.filter((m) => !m.is_past).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const past = data.filter((m) => m.is_past);

  return (
    <PortalLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Réunions</h1>

        {isLoading && <Loading />}

        {!isLoading && data.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Aucune réunion programmée.
            </CardContent>
          </Card>
        )}

        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">À venir</h2>
            {upcoming.map((m) => <UpcomingCard key={m.id} m={m} />)}
          </section>
        )}

        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Passées</h2>
            {past.map((m) => <PastCard key={m.id} m={m} />)}
          </section>
        )}
      </div>
    </PortalLayout>
  );
}
