import { Target, CheckSquare, FileText, Clock, AlertTriangle, CalendarClock, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useDashboardData } from '@/hooks/useDashboardData';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const priorityColors: Record<string, string> = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  medium: 'bg-info text-info-foreground',
  low: 'bg-muted text-muted-foreground',
};

const actionLabels: Record<string, string> = {
  login: 'Connexion',
  logout: 'Déconnexion',
  task_start: 'Tâche démarrée',
  task_complete: 'Tâche terminée',
  document_view: 'Document consulté',
  document_upload: 'Document uploadé',
  message_sent: 'Message envoyé',
};

const DashboardPage = () => {
  const { profile } = useAuthStore();
  const {
    activeMissions,
    myTasks,
    weeklyDocuments,
    weeklyHours,
    urgentTasks,
    upcomingMeetings,
    recentActivity,
    isLoading,
  } = useDashboardData();

  const firstName = profile?.full_name?.split(' ')[0] || 'Utilisateur';

  const stats = [
    { label: 'Missions actives', value: activeMissions, icon: Target, color: 'text-primary' },
    { label: 'Tâches en cours', value: myTasks, icon: CheckSquare, color: 'text-warning' },
    { label: 'Documents cette semaine', value: weeklyDocuments, icon: FileText, color: 'text-info' },
    { label: 'Heures cette semaine', value: `${weeklyHours}h`, icon: Clock, color: 'text-success' },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold font-display">
          Bonjour, {firstName} 👋
        </h1>
        <p className="text-muted-foreground">Voici votre tableau de bord</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold font-display">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <CardTitle className="text-base font-display">Mes tâches urgentes</CardTitle>
          </CardHeader>
          <CardContent>
            {urgentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucune tâche urgente 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {urgentTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.projects?.name ?? 'Sans projet'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className={priorityColors[task.priority] ?? ''}>
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(task.due_date), 'dd MMM', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <CalendarClock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-display">Prochaines réunions</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucune réunion prévue
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting: any) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(meeting.scheduled_at), "EEEE dd MMM 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                    {meeting.meeting_link && (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline shrink-0 ml-2"
                      >
                        Rejoindre
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Activity className="h-4 w-4 text-accent" />
            <CardTitle className="text-base font-display">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucune activité récente
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{actionLabels[log.action] ?? log.action}</span>
                        {log.entity_type && (
                          <span className="text-muted-foreground"> — {log.entity_type}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
