import { Target, CheckSquare, FileText, Clock, AlertTriangle, CalendarClock, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PointageCard from "@/components/attendance/PointageCard";
import EcheancesWidget from "@/components/dashboard/EcheancesWidget";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useDashboardData } from "@/hooks/useDashboardData";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const priorityColors: Record<string, string> = {
  urgent: "bg-destructive text-destructive-foreground",
  high: "bg-warning text-warning-foreground",
  medium: "bg-info text-info-foreground",
  low: "bg-muted text-muted-foreground",
};

const actionLabels: Record<string, string> = {
  login: "Connexion",
  logout: "Déconnexion",
  task_start: "Tâche démarrée",
  task_complete: "Tâche terminée",
  document_view: "Document consulté",
  document_upload: "Document uploadé",
  message_sent: "Message envoyé",
};

const statConfig = [
  { label: "Missions actives", icon: Target, bgClass: "bg-primary/8", iconClass: "text-primary" },
  { label: "Tâches en cours", icon: CheckSquare, bgClass: "bg-warning/10", iconClass: "text-warning" },
  { label: "Documents cette semaine", icon: FileText, bgClass: "bg-info/10", iconClass: "text-info" },
  { label: "Heures cette semaine", icon: Clock, bgClass: "bg-success/10", iconClass: "text-success" },
];

const DashboardPage = () => {
  const { profile, organization } = useAuthStore();
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

  const firstName = profile?.full_name?.split(" ")[0] || "Utilisateur";
  const statValues = [activeMissions, myTasks, weeklyDocuments, `${weeklyHours}h`];
  const orgUrl = organization?.slug ? `${window.location.origin}/org/${organization.slug}` : null;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display tracking-tight">Bienvenue, {firstName}</h1>
        {organization && (
          <p className="text-muted-foreground text-sm">
            <span className="font-medium text-foreground">{organization.name}</span>
            {orgUrl && (
              <>
                {" · "}
                <a href={orgUrl} className="text-primary hover:underline">{orgUrl}</a>
              </>
            )}
          </p>
        )}
      </div>

      {/* Pointage compact */}
      <PointageCard compact />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statConfig.map((stat, i) => (
          <Card
            key={stat.label}
            className="shadow-card border-border/50 hover:shadow-card-hover transition-all duration-300"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold font-display">{statValues[i]}</p>
                  )}
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bgClass}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mes échéances comptables */}
      <EcheancesWidget />



      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Tasks */}
        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center gap-2.5 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <CardTitle className="text-base font-display">Mes tâches urgentes</CardTitle>
          </CardHeader>
          <CardContent>
            {urgentTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Aucune tâche urgente </p>
            ) : (
              <div className="space-y-2">
                {urgentTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 p-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.projects?.name ?? "Sans projet"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className={priorityColors[task.priority] ?? ""}>
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(task.due_date), "dd MMM", { locale: fr })}
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
        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center gap-2.5 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/8">
              <CalendarClock className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-display">Prochaines réunions</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Aucune réunion prévue</p>
            ) : (
              <div className="space-y-2">
                {upcomingMeetings.map((meeting: any) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 p-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(meeting.scheduled_at), "EEEE dd MMM 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                    {meeting.meeting_link && (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary font-medium hover:underline shrink-0 ml-2"
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
        <Card className="lg:col-span-2 shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center gap-2.5 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/8">
              <Activity className="h-4 w-4 text-accent" />
            </div>
            <CardTitle className="text-base font-display">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Aucune activité récente</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{actionLabels[log.action] ?? log.action}</span>
                        {log.entity_type && <span className="text-muted-foreground"> — {log.entity_type}</span>}
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
