import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ClipboardList, Clock, AlertTriangle, Send, RotateCcw, CheckCircle,
  Video, Bell, FileText, AtSign, MessageSquare, Mail, DollarSign,
  Star, UserPlus, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications, notificationLabels } from '@/hooks/useNotifications';
import EmptyState from '@/components/common/EmptyState';

const iconMap: Record<string, React.ElementType> = {
  ClipboardList, Clock, AlertTriangle, Send, RotateCcw, CheckCircle,
  Video, Bell, FileText, AtSign, MessageSquare, Mail, DollarSign,
  Star, UserPlus,
};

const typeToIcon: Record<string, string> = {
  task_assigned: 'ClipboardList', task_deadline_soon: 'Clock', task_overdue: 'AlertTriangle',
  submission_received: 'Send', correction_needed: 'RotateCcw', task_validated: 'CheckCircle',
  meeting_invite: 'Video', meeting_reminder: 'Bell', document_shared: 'FileText',
  message_mention: 'AtSign', new_message: 'MessageSquare', copil_report: 'Mail',
  budget_alert: 'DollarSign', new_evaluation: 'Star', timesheet_reminder: 'Clock',
  invitation_received: 'UserPlus',
};

const priorityColor: Record<string, string> = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  normal: 'bg-muted text-muted-foreground',
};

function groupByDay(notifications: any[]) {
  const groups: Record<string, any[]> = {};
  notifications.forEach((n) => {
    const date = parseISO(n.created_at);
    let label: string;
    if (isToday(date)) label = "Aujourd'hui";
    else if (isYesterday(date)) label = 'Hier';
    else label = format(date, 'EEEE d MMMM yyyy', { locale: fr });
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
}

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, getNavigationPath, unreadCount } = useNotifications(100);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');

  const filtered = notifications.filter((n) => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (readFilter === 'unread' && n.is_read) return false;
    if (readFilter === 'read' && !n.is_read) return false;
    return true;
  });

  const grouped = groupByDay(filtered);

  const handleClick = (n: any) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    const path = getNavigationPath(n);
    if (path) navigate(path);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Notifications</h1>
          <p className="text-muted-foreground">{unreadCount} non-lue{unreadCount > 1 ? 's' : ''}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(notificationLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="unread">Non lues</SelectItem>
            <SelectItem value="read">Lues</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bell} title="Aucune notification" description="Vous n'avez pas de notifications." />
      ) : (
        Object.entries(grouped).map(([day, items]) => (
          <div key={day} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground capitalize">{day}</h3>
            <div className="space-y-1">
              {items.map((n: any) => {
                const IconName = typeToIcon[n.type] || 'Bell';
                const Icon = iconMap[IconName] || Bell;
                return (
                  <Card
                    key={n.id}
                    className={`cursor-pointer transition-colors hover:bg-accent/50 ${!n.is_read ? 'border-primary/30 bg-primary/5' : ''}`}
                    onClick={() => handleClick(n)}
                  >
                    <CardContent className="flex items-start gap-3 p-3">
                      <div className={`mt-0.5 rounded-md p-1.5 ${!n.is_read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                          {n.priority && n.priority !== 'normal' && (
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${priorityColor[n.priority] || ''}`}>
                              {n.priority}
                            </Badge>
                          )}
                        </div>
                        {n.content && <p className="text-xs text-muted-foreground truncate mt-0.5">{n.content}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                      {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default NotificationsPage;
