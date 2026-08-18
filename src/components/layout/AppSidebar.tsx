import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, FolderKanban, FileText, MessageSquare,
  Calendar, Clock, Monitor, Settings, LogOut, ChevronDown, Eye,
  ClipboardCheck, CalendarRange, LineChart, CalendarClock, FolderOpen, Building2, UsersRound, Upload,
} from 'lucide-react';

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import logoImg from '@/assets/logo.png';
import { useIsPlatformAdmin } from '@/hooks/useSuperAdmin';
import { usePendingDepositsCount } from '@/hooks/useDepositsInbox';


const mainNav = [
  { label: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
  { label: 'Missions', icon: Briefcase, path: '/missions' },
  { label: 'Documents', icon: FileText, path: '/documents' },
  { label: 'Messagerie', icon: MessageSquare, path: '/messages' },
  { label: 'Calendrier', icon: Calendar, path: '/calendar' },
];

const timeNav = [
  { label: 'Pointage', icon: ClipboardCheck, path: '/pointage' },
  { label: 'Planning', icon: CalendarRange, path: '/planning' },
  { label: 'Staffing', icon: UsersRound, path: '/staffing' },
  { label: 'Feuilles de temps', icon: Clock, path: '/timesheets' },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const gradeLevel = profile?.grade_level ?? 8;
  const showAdmin = gradeLevel <= 2; // DA or DM
  const { isAdmin: isSuperAdmin } = useIsPlatformAdmin();
  const depotsCount = usePendingDepositsCount();


  // Unread message count
  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['unreadMessages', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      // Count conversations where last_read_at < latest message
      const { data } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);
      // Simplified: return count of conversations (real implementation would compare dates)
      return 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Late obligations count for badge
  const { data: enRetardCount = 0 } = useQuery({
    queryKey: ['obligations-kpis-badge', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_obligations_kpis');
      return Number(data?.[0]?.en_retard ?? 0);
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Staffing badge: proposed assignments for the user, or adjustment_requested if manager
  const gradeLevelForBadge = profile?.grade_level ?? 8;
  const { data: staffingBadge = 0 } = useQuery({
    queryKey: ['staffing-badge', user?.id, gradeLevelForBadge],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () => {
      if (gradeLevelForBadge <= 3) {
        const { count } = await supabase
          .from('staffing_assignments')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'adjustment_requested');
        return count ?? 0;
      }
      const { count } = await supabase
        .from('staffing_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'proposed');
      return count ?? 0;
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Mission-DGC" className="h-9 w-9 rounded-lg object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold font-display text-sidebar-foreground">Mission-DGC</span>
            <span className="text-xs text-sidebar-foreground/60">Gestion de missions</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.path === '/messages' && unreadMessages > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Temps & Planning</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {timeNav.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {item.path === '/staffing' && staffingBadge > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                        {staffingBadge > 99 ? '99+' : staffingBadge}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {gradeLevel <= 3 && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive('/suivi-execution')}
                    onClick={() => navigate('/suivi-execution')}
                    tooltip="Suivi d'exécution"
                  >
                    <LineChart className="h-4 w-4" />
                    <span className="flex-1">Suivi d'exécution</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Dossiers clients</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive('/echeancier')}
                  onClick={() => navigate('/echeancier')}
                  tooltip="Échéancier"
                >
                  <CalendarClock className="h-4 w-4" />
                  <span className="flex-1">Échéancier</span>
                  {enRetardCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                      {enRetardCount > 99 ? '99+' : enRetardCount}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive('/depots')}
                  onClick={() => navigate('/depots')}
                  tooltip="Dépôts clients"
                >
                  <Upload className="h-4 w-4" />
                  <span className="flex-1">Dépôts clients</span>
                  {depotsCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {depotsCount > 99 ? '99+' : depotsCount}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {gradeLevel <= 3 && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive('/dossiers')}
                    onClick={() => navigate('/dossiers')}
                    tooltip="Dossiers"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>Dossiers</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {showAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive('/admin/clients')}
                    onClick={() => navigate('/admin/clients')}
                    tooltip="Clients (CRM)"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Clients (CRM)</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>




        <SidebarGroup>
          <SidebarGroupLabel>Espace de travail</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive('/workspace')}
                  onClick={() => navigate('/workspace')}
                  tooltip="Bureau personnel"
                >
                  <Monitor className="h-4 w-4" />
                  <span>Bureau personnel</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {showAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive('/supervision')}
                    onClick={() => navigate('/supervision')}
                    tooltip="Supervision"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Supervision</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {showAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={isActive('/admin')}
                    onClick={() => navigate('/admin')}
                    tooltip="Administration"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Administration</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {profile?.is_online && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar-background bg-success" />
            )}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || 'Utilisateur'}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {profile?.grade || ''}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            title="Déconnexion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => navigate('/super-admin')}
            className="mt-2 text-[10px] text-sidebar-foreground/40 hover:text-sidebar-foreground/80 transition-colors text-left"
          >
            ⚙ Super Admin
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
