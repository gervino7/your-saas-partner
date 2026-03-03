import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from 'next-themes';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { GRADE_LEVELS } from '@/types/database';
import type { Grade } from '@/types/database';

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

const INVITATION_META_KEYS = ['invitation_token', 'token', 'invite_token', 'invitation'] as const;
const FALLBACK_GRADE: Grade = 'AUD';

const getInvitationToken = (metadata: Record<string, unknown> | null | undefined): string | null => {
  if (!metadata) return null;

  for (const key of INVITATION_META_KEYS) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const resolveFullName = (user: User): string => {
  const metadata = user.user_metadata as Record<string, unknown> | null;
  const fromMetadata = typeof metadata?.full_name === 'string' ? metadata.full_name.trim() : '';
  if (fromMetadata) return fromMetadata;

  const fromEmail = user.email?.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  return fromEmail || 'Utilisateur';
};

const ensureUserProfile = async (user: User) => {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const needsHydration =
    !existingProfile ||
    !existingProfile.organization_id ||
    !existingProfile.grade ||
    !existingProfile.grade_level ||
    !existingProfile.full_name;

  if (!needsHydration) {
    return existingProfile;
  }

  const metadata = user.user_metadata as Record<string, unknown> | null;
  const invitationToken = getInvitationToken(metadata);

  let invitationOrgId: string | null = null;
  let invitationGrade: Grade | null = null;

  if (invitationToken) {
    const { data: invitationData } = await supabase.rpc('get_invitation_by_token', { _token: invitationToken });
    const invitation = invitationData?.[0];

    if (invitation?.organization_id) invitationOrgId = invitation.organization_id;
    if (invitation?.grade && invitation.grade in GRADE_LEVELS) {
      invitationGrade = invitation.grade as Grade;
    }
  }

  const nextGrade = ((existingProfile?.grade as Grade | null) ?? invitationGrade ?? FALLBACK_GRADE) as Grade;
  const nextEmail = existingProfile?.email || user.email;

  if (!nextEmail) return existingProfile ?? null;

  const { data: syncedProfile } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: nextEmail,
      full_name: existingProfile?.full_name || resolveFullName(user),
      organization_id: existingProfile?.organization_id ?? invitationOrgId,
      grade: nextGrade,
      grade_level: existingProfile?.grade_level ?? GRADE_LEVELS[nextGrade],
    })
    .select('*')
    .single();

  return syncedProfile ?? existingProfile ?? null;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let isMounted = true;

    const syncSessionState = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      setSession(session);

      if (!session?.user) {
        if (isMounted) setProfile(null);
        if (isMounted) setLoading(false);
        return;
      }

      const profile = await ensureUserProfile(session.user);
      if (isMounted) setProfile(profile);
      if (isMounted) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSessionState(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncSessionState(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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
              <Route path="/register" element={<LoginPage />} />
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
