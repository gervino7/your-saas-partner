import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CURRENCY_LABELS } from '@/types/database';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

function formatAmount(amount: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

export default function MissionBudgetTab({ mission }: { mission: any }) {
  const budget = mission.budget_amount ?? 0;
  const consumed = 0; // TODO: compute from timesheets
  const remaining = budget - consumed;
  const consumedPct = budget > 0 ? Math.round((consumed / budget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget initial</p>
                <p className="text-lg font-semibold">{formatAmount(budget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Consommé</p>
                <p className="text-lg font-semibold">{formatAmount(consumed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${remaining >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                {remaining >= 0
                  ? <TrendingDown className="h-5 w-5 text-success" />
                  : <AlertTriangle className="h-5 w-5 text-destructive" />
                }
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Restant</p>
                <p className="text-lg font-semibold">{formatAmount(remaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Consommation budgétaire</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Utilisé</span>
              <span className="font-medium">{consumedPct}%</span>
            </div>
            <Progress value={consumedPct} className="h-3" />
          </div>
          {consumedPct >= 80 && (
            <div className="mt-4 flex items-center gap-2 text-warning text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Attention : plus de 80% du budget consommé</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
