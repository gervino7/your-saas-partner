import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MISSION_TYPE_LABELS, CURRENCY_LABELS } from '@/types/database';
import MissionStatusBadge from './MissionStatusBadge';
import PriorityBadge from './PriorityBadge';
import { Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

function formatCurrency(amount: number | null, currency: string | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + (currency ?? 'XOF');
}

export default function MissionOverviewTab({ mission }: { mission: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Description */}
        <Card>
          <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {mission.description || 'Aucune description.'}
            </p>
          </CardContent>
        </Card>

        {/* Key Info */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Période</p>
                  <p className="text-sm font-medium">
                    {mission.start_date ? format(new Date(mission.start_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                    {' — '}
                    {mission.end_date ? format(new Date(mission.end_date), 'dd MMM yyyy', { locale: fr }) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="text-sm font-medium">{formatCurrency(mission.budget_amount, mission.budget_currency)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader><CardTitle className="text-base">Progression</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avancement global</span>
                <span className="font-medium">{mission.progress ?? 0}%</span>
              </div>
              <Progress value={mission.progress ?? 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Statut</p>
              <MissionStatusBadge status={mission.status ?? 'draft'} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priorité</p>
              <PriorityBadge priority={mission.priority} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <p className="text-sm">{mission.type ? MISSION_TYPE_LABELS[mission.type as keyof typeof MISSION_TYPE_LABELS] ?? mission.type : '—'}</p>
            </div>
            {mission.client && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Client</p>
                <p className="text-sm font-medium">{mission.client.name}</p>
                {mission.client.contact_name && (
                  <p className="text-xs text-muted-foreground">{mission.client.contact_name}</p>
                )}
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Code</p>
              <p className="text-sm font-mono">{mission.code ?? '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Direction</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {mission.director && (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={mission.director.avatar_url ?? ''} />
                  <AvatarFallback className="text-xs">{initials(mission.director.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{mission.director.full_name}</p>
                  <p className="text-xs text-muted-foreground">Directeur de Mission</p>
                </div>
              </div>
            )}
            {mission.chief && (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={mission.chief.avatar_url ?? ''} />
                  <AvatarFallback className="text-xs">{initials(mission.chief.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{mission.chief.full_name}</p>
                  <p className="text-xs text-muted-foreground">Chef de Mission</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
