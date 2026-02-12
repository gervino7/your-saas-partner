import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MissionStatusBadge from './MissionStatusBadge';
import PriorityBadge from './PriorityBadge';

interface MissionCardProps {
  mission: any;
}

function initials(name: string) {
  return name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

export default function MissionCard({ mission }: MissionCardProps) {
  return (
    <Link to={`/missions/${mission.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-mono">{mission.code}</p>
              <h3 className="font-semibold font-display text-sm mt-1 truncate">{mission.name}</h3>
            </div>
            <MissionStatusBadge status={mission.status ?? 'draft'} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {mission.client && (
            <p className="text-xs text-muted-foreground">Client : {mission.client.name}</p>
          )}

          <div className="flex items-center gap-2">
            {mission.director && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={mission.director.avatar_url ?? ''} />
                <AvatarFallback className="text-[10px]">{initials(mission.director.full_name)}</AvatarFallback>
              </Avatar>
            )}
            {mission.chief && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={mission.chief.avatar_url ?? ''} />
                <AvatarFallback className="text-[10px]">{initials(mission.chief.full_name)}</AvatarFallback>
              </Avatar>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progression</span>
              <span>{mission.progress ?? 0}%</span>
            </div>
            <Progress value={mission.progress ?? 0} className="h-1.5" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {mission.start_date ? format(new Date(mission.start_date), 'dd MMM', { locale: fr }) : '—'}
              {' — '}
              {mission.end_date ? format(new Date(mission.end_date), 'dd MMM yyyy', { locale: fr }) : '—'}
            </div>
            <PriorityBadge priority={mission.priority} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
