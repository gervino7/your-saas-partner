import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEcheancier } from '@/hooks/useObligations';
import { useAuthStore } from '@/stores/authStore';

const EcheancesWidget = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const from = format(new Date(), 'yyyy-MM-dd');
  const to = format(addDays(new Date(), 30), 'yyyy-MM-dd');
  const { data: rows = [] } = useEcheancier({ from, to });

  const mine = rows
    .filter((r) => r.assigned_to === profile?.id)
    .sort((a, b) => (a.is_late === b.is_late ? a.days_left - b.days_left : a.is_late ? -1 : 1))
    .slice(0, 5);

  if (mine.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" /> Mes échéances
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/echeancier')}>
          Voir tout <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {mine.map((r) => (
          <div key={r.id} className="flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{r.client_name}</div>
              <div className="text-xs text-muted-foreground truncate">{r.obligation_label} · {r.period_label}</div>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(r.due_date), 'dd/MM', { locale: fr })}
            </span>
            {r.is_late
              ? <Badge variant="destructive">Retard {Math.abs(r.days_left)}j</Badge>
              : r.days_left <= 7
                ? <Badge className="bg-amber-500 hover:bg-amber-500 text-white">J‑{r.days_left}</Badge>
                : <Badge variant="secondary">J‑{r.days_left}</Badge>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default EcheancesWidget;
