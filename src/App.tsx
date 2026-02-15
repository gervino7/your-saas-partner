import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

import AuthGuard from '@/components/auth/AuthGuard';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import LandingPage from '@/pages/LandingPage';
import DashboardPage from '@/pages/DashboardPage';
import MissionsPage from '@/pages/MissionsPage';
import MissionDetailPage from '@/pages/MissionDetailPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import DocumentsPage from '@/pages/DocumentsPage';
import MessagesPage from '@/pages/MessagesPage';
import CalendarPage from '@/pages/CalendarPage';
import TimesheetsPage from '@/pages/TimesheetsPage';
import AdminPage from '@/pages/AdminPage';
import PerformanceReviewsPage from '@/pages/PerformanceReviewsPage';
import WorkspacePage from '@/pages/WorkspacePage';
import SettingsPage from '@/pages/SettingsPage';
import FinancePage from '@/pages/FinancePage';
import CRMPage from '@/pages/CRMPage';
import ClientDetailPage from '@/pages/ClientDetailPage';
import ClientPortalPage from '@/pages/ClientPortalPage';
import SatisfactionSurveyPage from '@/pages/SatisfactionSurveyPage';
import NotificationsPage from '@/pages/NotificationsPage';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          setTimeout(async () => {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            setProfile(data);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, setLoading]);

  return <>{children}</>;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/portal/:token" element={<ClientPortalPage />} />
              <Route path="/survey/:token" element={<SatisfactionSurveyPage />} />
              <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/missions" element={<MissionsPage />} />
                <Route path="/missions/:id" element={<MissionDetailPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/documents" element={<DocumentsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/timesheets" element={<TimesheetsPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/finance" element={<FinancePage />} />
                <Route path="/admin/reviews" element={<PerformanceReviewsPage />} />
                <Route path="/admin/clients" element={<CRMPage />} />
                <Route path="/admin/clients/:id" element={<ClientDetailPage />} />
                <Route path="/workspace" element={<WorkspacePage />} />
                <Route path="/workspace/:userId" element={<WorkspacePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
