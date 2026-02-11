import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Target, FolderKanban, FileText, MessageSquare,
  Calendar, Clock, Settings, HardDrive, Shield, LogOut,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';

const mainNav = [
  { label: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
  { label: 'Missions', icon: Target, path: '/missions' },
  { label: 'Documents', icon: FileText, path: '/documents' },
  { label: 'Messagerie', icon: MessageSquare, path: '/messages' },
  { label: 'Calendrier', icon: Calendar, path: '/calendar' },
  { label: 'Feuilles de temps', icon: Clock, path: '/timesheets' },
];

const secondaryNav = [
  { label: 'Bureau personnel', icon: HardDrive, path: '/workspace' },
  { label: 'Administration', icon: Shield, path: '/admin' },
  { label: 'Paramètres', icon: Settings, path: '/settings' },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-display font-bold text-sm">
            MF
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold font-display text-sidebar-foreground">MissionFlow</span>
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
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Espace de travail</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNav.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
            {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || 'Utilisateur'}
            </span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {profile?.grade || ''}
            </span>
          </div>
          <button onClick={handleLogout} className="text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
