import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PointageCard from '@/components/attendance/PointageCard';
import AttendanceTimeline from '@/components/attendance/AttendanceTimeline';
import { useTodayAttendance, useWeekAttendance } from '@/hooks/useAttendance';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function formatAmplitude(seconds: number | null | undefined): string {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}`;
}

function formatT(iso: string | null | undefined) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function PointagePage() {
  const { events } = useTodayAttendance();
  const { data: week = [] } = useWeekAttendance();

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold ">Pointage</h1>
        <p className="text-sm text-muted-foreground">Déclarez vos arrivées, sorties et départ de la journée.</p>
      </div>

      <PointageCard />
      <AttendanceTimeline events={events} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ma semaine</CardTitle>
        </CardHeader>
        <CardContent>
          {week.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun pointage cette semaine.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Arrivée</TableHead>
                  <TableHead>Départ</TableHead>
                  <TableHead>Nb sorties</TableHead>
                  <TableHead>Amplitude</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {week.map((row: any) => (
                  <TableRow key={row.event_date}>
                    <TableCell>{format(new Date(row.event_date), 'EEE dd MMM', { locale: fr })}</TableCell>
                    <TableCell>{formatT(row.first_arrival)}</TableCell>
                    <TableCell>{formatT(row.last_departure)}</TableCell>
                    <TableCell>{row.sortie_count ?? 0}</TableCell>
                    <TableCell>{formatAmplitude(row.amplitude_seconds)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
