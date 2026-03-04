# 📖 DOCUMENTATION TECHNIQUE COMPLÈTE — MissionFlow
## Guide complet avec code source et explications

**Version** : 2.0  
**Date** : 4 Mars 2026  
**Stack** : React 18 + TypeScript + Tailwind CSS + Shadcn/UI + Supabase (Lovable Cloud)

---

## TABLE DES MATIÈRES

1. [Architecture générale](#1-architecture-générale)
2. [Point d'entrée — App.tsx](#2-point-dentrée--apptsx)
3. [Store global — authStore.ts](#3-store-global--authstorets)
4. [Authentification — LoginPage.tsx](#4-authentification--loginpagetsx)
5. [Garde d'authentification — AuthGuard.tsx](#5-garde-dauthentification--authguardtsx)
6. [Layout — AppLayout, AppSidebar, Header](#6-layout--applayout-appsidebar-header)
7. [Dashboard — DashboardPage.tsx + useDashboardData.ts](#7-dashboard--dashboardpagetsx--usedashboarddatats)
8. [Missions — MissionsPage.tsx + useMissions.ts](#8-missions--missionspagetsx--usemissionsts)
9. [Projets et Tâches — useProject.ts](#9-projets-et-tâches--useprojectts)
10. [Workflow de validation — useTaskSubmissions.ts](#10-workflow-de-validation--usetasksubmissionsts)
11. [Documents (GED) — useDocuments.ts](#11-documents-ged--usedocumentsts)
12. [Messagerie temps réel — useMessages.ts](#12-messagerie-temps-réel--usemessagests)
13. [Timesheets et Finance — useTimesheets.ts](#13-timesheets-et-finance--usetimesheetsts)
14. [COPIL / CODIR / Mailing — useCommittees.ts](#14-copil--codir--mailing--usecommitteests)
15. [CRM et Portail client — useCRM.ts](#15-crm-et-portail-client--usecrmts)
16. [Administration et KPIs — useAdmin.ts](#16-administration-et-kpis--useadmints)
17. [Notifications — useNotifications.ts](#17-notifications--usenotificationsts)
18. [Edge Functions (Backend)](#18-edge-functions-backend)
19. [Design System (CSS)](#19-design-system-css)
20. [Types et constantes — database.ts](#20-types-et-constantes--databasets)

---

## 1. ARCHITECTURE GÉNÉRALE

```
┌─────────────────────────────────────────────────────────┐
│                   FRONTEND (React/Vite)                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐              │
│  │  Pages   │  │  Hooks   │  │Components │              │
│  │ (Routes) │──│ (Logic)  │──│   (UI)    │              │
│  └──────────┘  └────┬─────┘  └───────────┘              │
│                     │                                    │
│  ┌──────────────────▼──────────────────────┐             │
│  │        Supabase Client SDK              │             │
│  └──────────────────┬──────────────────────┘             │
└─────────────────────┼───────────────────────────────────┘
                      │ HTTPS / WebSocket
┌─────────────────────▼───────────────────────────────────┐
│                BACKEND (Lovable Cloud)                    │
│  ┌──────┐  ┌──────┐  ┌────────┐  ┌──────────┐          │
│  │ Auth │  │  DB  │  │Storage │  │ Realtime │          │
│  └──────┘  └──────┘  └────────┘  └──────────┘          │
│  ┌──────────────────────────────────────────┐           │
│  │           Edge Functions (Deno)          │           │
│  │  send-group-email, send-invitation, ...  │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### Structure des dossiers

```
src/
├── App.tsx                    # Point d'entrée, routage, AuthProvider
├── stores/
│   └── authStore.ts           # État global Zustand (session, profil)
├── hooks/
│   ├── useMissions.ts         # CRUD missions + projets + clients
│   ├── useProject.ts          # CRUD projets, tâches, activités, notes
│   ├── useDocuments.ts        # GED, upload, versioning, dossiers
│   ├── useMessages.ts         # Messagerie temps réel + typing indicator
│   ├── useTimesheets.ts       # Feuilles de temps, factures, notes de frais
│   ├── useCommittees.ts       # COPIL, CODIR, mailing groupé
│   ├── useCRM.ts              # CRM, contacts, portail client
│   ├── useAdmin.ts            # KPIs, logs, paramètres organisation
│   ├── useNotifications.ts    # Notifications temps réel
│   ├── useDashboardData.ts    # Données tableau de bord
│   └── useTaskSubmissions.ts  # Workflow validation, évaluation 1-4
├── pages/
│   ├── LoginPage.tsx          # Connexion + inscription par invitation
│   ├── DashboardPage.tsx      # Tableau de bord principal
│   ├── MissionsPage.tsx       # Liste des missions
│   ├── MissionDetailPage.tsx  # Détail mission (onglets)
│   ├── ProjectDetailPage.tsx  # Détail projet (Kanban, activités, etc.)
│   └── ...
├── components/
│   ├── auth/AuthGuard.tsx     # Protection des routes
│   ├── layout/AppLayout.tsx   # Layout principal (sidebar + header)
│   ├── layout/AppSidebar.tsx  # Barre latérale de navigation
│   ├── layout/Header.tsx      # En-tête avec breadcrumb, recherche, notifs
│   └── ...
└── types/
    └── database.ts            # Types métier, grades, labels
```

---

## 2. POINT D'ENTRÉE — App.tsx

**Fichier** : `src/App.tsx`

Ce fichier est le cœur de l'application. Il configure :
- Le **routage** (React Router)
- Le **thème** (light/dark via next-themes)
- Le **cache** (React Query)
- L'**authentification** (AuthProvider)

### Code source complet

```typescript
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

// ... imports des pages (voir fichier complet)

const queryClient = new QueryClient();

// ─── Constantes pour l'hydratation du profil ───
const INVITATION_META_KEYS = ['invitation_token', 'token', 'invite_token', 'invitation'] as const;
const FALLBACK_GRADE: Grade = 'AUD';
```

### Explication : `ensureUserProfile`

Cette fonction est **critique** — elle s'exécute à chaque connexion pour garantir que le profil utilisateur est complet dans la base de données.

```typescript
const ensureUserProfile = async (user: User) => {
  // 1. Vérifie si le profil existe déjà
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // 2. Détermine si le profil est incomplet
  const needsHydration =
    !existingProfile ||
    !existingProfile.organization_id ||
    !existingProfile.grade ||
    !existingProfile.grade_level ||
    !existingProfile.full_name;

  if (!needsHydration) return existingProfile;

  // 3. Si un token d'invitation existe dans les métadonnées,
  //    on récupère l'organisation et le grade depuis l'invitation
  const metadata = user.user_metadata as Record<string, unknown> | null;
  const invitationToken = getInvitationToken(metadata);

  let invitationOrgId: string | null = null;
  let invitationGrade: Grade | null = null;

  if (invitationToken) {
    const { data: invitationData } = await supabase.rpc(
      'get_invitation_by_token', { _token: invitationToken }
    );
    const invitation = invitationData?.[0];
    if (invitation?.organization_id) invitationOrgId = invitation.organization_id;
    if (invitation?.grade && invitation.grade in GRADE_LEVELS) {
      invitationGrade = invitation.grade as Grade;
    }
  }

  // 4. Upsert le profil avec les données récupérées
  const { data: syncedProfile } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: existingProfile?.email || user.email,
      full_name: existingProfile?.full_name || resolveFullName(user),
      organization_id: existingProfile?.organization_id ?? invitationOrgId,
      grade: nextGrade,
      grade_level: existingProfile?.grade_level ?? GRADE_LEVELS[nextGrade],
    })
    .select('*')
    .single();

  return syncedProfile ?? existingProfile ?? null;
};
```

### Explication : `AuthProvider`

Le composant `AuthProvider` gère tout le cycle de vie de l'authentification :

```typescript
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let currentUserId: string | null = null;

    const syncSessionState = async (session, event?) => {
      setSession(session);

      if (!session?.user) {
        // Déconnexion → marquer hors ligne
        if (currentUserId) await setUserOffline(currentUserId);
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Hydrate le profil
      const profile = await ensureUserProfile(session.user);
      setProfile(profile);
      setLoading(false);

      // Marque l'utilisateur en ligne
      if (!currentUserId || event === 'SIGNED_IN') {
        currentUserId = session.user.id;
        await setUserOnline(session.user.id);

        // Heartbeat : met à jour last_seen_at toutes les 60 secondes
        heartbeatInterval = setInterval(async () => {
          await supabase
            .from('profiles')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', currentUserId);
        }, 60_000);
      }
    };

    // Écoute les changements d'état d'auth (connexion, déconnexion, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => void syncSessionState(session, event)
    );

    // Récupère la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      void syncSessionState(session, 'INITIAL_SESSION');
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (currentUserId) void setUserOffline(currentUserId);
    };
  }, [setSession, setProfile, setLoading]);

  return <>{children}</>;
};
```

### Explication : Routage

```typescript
const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Routes publiques */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<LoginPage />} />
              <Route path="/portal/:token" element={<ClientPortalPage />} />
              <Route path="/survey/:token" element={<SatisfactionSurveyPage />} />

              {/* Routes protégées — AuthGuard vérifie la session */}
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
                {/* ... autres routes protégées */}
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);
```

**Points clés** :
- Les routes publiques (`/login`, `/portal/:token`) sont en dehors de `AuthGuard`
- Les routes protégées sont encapsulées dans `<AuthGuard><AppLayout /></AuthGuard>`
- `AppLayout` utilise `<Outlet />` pour rendre les pages enfants

---

## 3. STORE GLOBAL — authStore.ts

**Fichier** : `src/stores/authStore.ts`

Ce store Zustand centralise l'état d'authentification accessible partout dans l'app.

```typescript
import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  grade: string | null;       // Ex: 'DA', 'DM', 'CM', 'AUD'...
  grade_level: number | null;  // 1 (plus haut) → 8 (plus bas)
  is_online: boolean;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ session: null, user: null, profile: null }),
}));
```

**Usage dans les composants** :
```typescript
const { profile } = useAuthStore();
const gradeLevel = profile?.grade_level ?? 8;
const isAdmin = gradeLevel <= 2; // DA ou DM
```

---

## 4. AUTHENTIFICATION — LoginPage.tsx

**Fichier** : `src/pages/LoginPage.tsx`

### Fonctionnalités

- **Connexion** par email/mot de passe
- **Inscription** uniquement via un **lien d'invitation** (contenant un token UUID)
- **Validation de mot de passe** (8 chars min, majuscule, minuscule, chiffre)
- **Protection anti-brute-force** (verrouillage après 5 tentatives pendant 60s)
- **Extraction du token** depuis l'URL (query params, hash, chemin)

### Code source complet

```typescript
// Constantes de sécurité
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

// Validation du mot de passe
const validatePassword = (pwd: string): string[] => {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push('Au moins 8 caractères');
  if (!/[A-Z]/.test(pwd)) errors.push('Une lettre majuscule');
  if (!/[a-z]/.test(pwd)) errors.push('Une lettre minuscule');
  if (!/[0-9]/.test(pwd)) errors.push('Un chiffre');
  return errors;
};

// Extraction robuste du token d'invitation depuis l'URL
const extractInvitationToken = (
  searchParams, pathname, hash, href?
): string | null => {
  // Cherche dans ?token=xxx, puis dans le hash, puis dans le pathname
  // Gère les double-encodages URL et les transformations par les passerelles mail
  // ...
};

// Soumission du formulaire
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Vérification anti-brute-force
  if (lockoutUntil && Date.now() < lockoutUntil) {
    toast({ title: 'Trop de tentatives', variant: 'destructive' });
    return;
  }

  // L'inscription nécessite obligatoirement un token d'invitation valide
  if (isSignUp && !invitationToken) {
    toast({ title: 'Invitation requise', variant: 'destructive' });
    return;
  }

  if (isSignUp) {
    // Inscription avec métadonnées (full_name + invitation_token)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName, invitation_token: invitationToken },
        emailRedirectTo: window.location.origin,
      },
    });
  } else {
    // Connexion simple
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Compteur de tentatives échouées
      const newAttempts = loginAttempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
      }
    }
  }
};
```

**Points clés** :
- L'inscription n'est possible que via invitation (pas d'auto-inscription)
- Le token est stocké dans `user_metadata` pour être lu par `ensureUserProfile` dans App.tsx
- L'email est pré-rempli et verrouillé quand une invitation valide est détectée

---

## 5. GARDE D'AUTHENTIFICATION — AuthGuard.tsx

**Fichier** : `src/components/auth/AuthGuard.tsx`

```typescript
const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuthStore();
  const [verified, setVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      navigate('/login', { replace: true });
      return;
    }

    // Vérification côté serveur du token JWT
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        supabase.auth.signOut();
        navigate('/login', { replace: true });
      } else {
        setVerified(true);
      }
    });
  }, [session, loading, navigate]);

  if (loading || (!verified && session)) {
    return <Loading fullScreen message="Vérification de l'authentification..." />;
  }

  if (!session) return null;
  return <>{children}</>;
};
```

**Explication** :
- Vérifie non seulement la session locale mais aussi le token côté serveur via `getUser()`
- Cela empêche l'utilisation de tokens expirés ou révoqués
- Affiche un écran de chargement pendant la vérification

---

## 6. LAYOUT — AppLayout, AppSidebar, Header

### AppLayout.tsx

```typescript
const AppLayout = () => (
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <OfflineBanner />   {/* Bandeau "mode hors ligne" */}
      <Header />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />         {/* Rendu de la page active */}
      </main>
    </SidebarInset>
  </SidebarProvider>
);
```

### AppSidebar.tsx — Navigation latérale

```typescript
const mainNav = [
  { label: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
  { label: 'Missions', icon: Briefcase, path: '/missions' },
  { label: 'Documents', icon: FileText, path: '/documents' },
  { label: 'Messagerie', icon: MessageSquare, path: '/messages' },
  { label: 'Calendrier', icon: Calendar, path: '/calendar' },
  { label: 'Feuilles de temps', icon: Clock, path: '/timesheets' },
];

const AppSidebar = () => {
  const { profile } = useAuthStore();
  const gradeLevel = profile?.grade_level ?? 8;
  const showAdmin = gradeLevel <= 2; // Seuls DA et DM voient "Administration"

  return (
    <Sidebar>
      <SidebarHeader>
        {/* Logo + nom MissionFlow */}
      </SidebarHeader>
      <SidebarContent>
        {/* Navigation principale */}
        {mainNav.map((item) => (
          <SidebarMenuButton isActive={isActive(item.path)} onClick={() => navigate(item.path)}>
            <item.icon /> {item.label}
          </SidebarMenuButton>
        ))}

        {/* Section Administration — conditionnelle selon le grade */}
        {showAdmin && (
          <SidebarMenuButton onClick={() => navigate('/admin')}>
            <Settings /> Administration
          </SidebarMenuButton>
        )}
      </SidebarContent>
      <SidebarFooter>
        {/* Avatar + nom + grade + bouton déconnexion */}
        {/* Indicateur "en ligne" (point vert) */}
      </SidebarFooter>
    </Sidebar>
  );
};
```

### Header.tsx — Fil d'Ariane, Recherche, Notifications

```typescript
const Header = () => {
  const { profile } = useAuthStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <header>
      {/* Fil d'Ariane (breadcrumb) dynamique depuis l'URL */}
      {/* Barre de recherche globale (⌘K) */}
      {/* Toggle thème (clair/sombre) */}
      {/* Dropdown des notifications avec badge compteur */}
      {/* Dropdown profil utilisateur */}
    </header>
  );
};
```

---

## 7. DASHBOARD — DashboardPage.tsx + useDashboardData.ts

### useDashboardData.ts — Agrégation des KPIs

```typescript
export function useDashboardData() {
  const { user, profile } = useAuthStore();
  const isDirector = (profile?.grade_level ?? 8) <= 2;

  // KPI 1 : Nombre de missions actives
  const activeMissions = useQuery({
    queryKey: ['dashboard', 'activeMissions'],
    queryFn: async () => {
      const { count } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count ?? 0;
    },
  });

  // KPI 2 : Tâches en cours de l'utilisateur
  const myTasks = useQuery({
    queryFn: async () => {
      const { count } = await supabase
        .from('task_assignments')
        .select('task_id, tasks!inner(status)', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('tasks.status', ['todo', 'in_progress', 'in_review', 'correction']);
      return count ?? 0;
    },
  });

  // KPI 3 : Documents uploadés cette semaine
  // KPI 4 : Heures saisies cette semaine
  // + Tâches urgentes (triées par deadline)
  // + Prochaines réunions
  // + Activité récente (logs)

  return { activeMissions, myTasks, weeklyDocuments, weeklyHours,
           urgentTasks, upcomingMeetings, recentActivity, isLoading };
}
```

### DashboardPage.tsx

```typescript
const DashboardPage = () => {
  const { profile } = useAuthStore();
  const { activeMissions, myTasks, weeklyDocuments, weeklyHours,
          urgentTasks, upcomingMeetings, recentActivity, isLoading } = useDashboardData();

  return (
    <div className="space-y-6">
      {/* Salutation personnalisée */}
      <h1>Bonjour, {profile?.full_name?.split(' ')[0]} 👋</h1>

      {/* 4 cartes KPI */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card> Missions actives : {activeMissions} </Card>
        <Card> Tâches en cours : {myTasks} </Card>
        <Card> Documents cette semaine : {weeklyDocuments} </Card>
        <Card> Heures cette semaine : {weeklyHours}h </Card>
      </div>

      {/* Tâches urgentes + Prochaines réunions */}
      {/* Activité récente (timeline) */}
    </div>
  );
};
```

---

## 8. MISSIONS — MissionsPage.tsx + useMissions.ts

### useMissions.ts — CRUD Missions

```typescript
// ─── Liste des missions avec filtres ───
export function useMissions(filters: MissionFilters = {}) {
  const profile = useAuthStore((s) => s.profile);

  return useQuery({
    queryKey: ['missions', filters, profile?.organization_id],
    queryFn: async () => {
      let query = supabase
        .from('missions')
        .select(`
          *,
          client:clients(id, name),
          director:profiles!missions_director_id_fkey(id, full_name, avatar_url),
          chief:profiles!missions_chief_id_fkey(id, full_name, avatar_url)
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      // Filtres dynamiques
      if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
      if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type);
      if (filters.search) query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });
}

// ─── Création de mission avec code auto-généré ───
export function useCreateMission() {
  return useMutation({
    mutationFn: async (values) => {
      // Génère le code : MIS-2026-001
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('missions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id);
      const code = `MIS-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`;

      // Insère la mission
      const { data } = await supabase.from('missions').insert({
        ...values, code, organization_id: profile.organization_id, status: 'draft',
      }).select().single();

      // Ajoute directeur et chef comme membres
      if (values.director_id)
        await supabase.from('mission_members').insert({
          mission_id: data.id, user_id: values.director_id, role: 'director'
        });

      return data;
    },
    onSuccess: () => toast.success('Mission créée avec succès'),
  });
}

// ─── Autres hooks ───
// useMission(id) — Détail d'une mission
// useMissionMembers(missionId) — Membres de la mission
// useMissionProjects(missionId) — Projets de la mission
// useUpdateMission() — Mise à jour
// useDeleteMission() — Suppression
// useAddMissionMember() — Ajout de membre
// useOrganizationUsers() — Liste des utilisateurs de l'organisation
// useClients() — Liste des clients
// useCreateProject() — Création de projet avec code auto-généré
```

### MissionsPage.tsx

```typescript
const MissionsPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const [filters, setFilters] = useState<MissionFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const { data: missions = [], isLoading } = useMissions(filters);

  // Seuls les grades CM et au-dessus (grade_level ≤ 3) peuvent créer
  const canCreate = profile?.grade_level != null && profile.grade_level <= 3;

  return (
    <div>
      <h1>Missions</h1>
      {/* Barre de filtres + export CSV/PDF */}
      {/* Vue grille (MissionCard) ou tableau (MissionsTable) */}
      {/* Pagination */}
      {/* Dialog de création de mission */}
    </div>
  );
};
```

---

## 9. PROJETS ET TÂCHES — useProject.ts

### Hooks principaux

```typescript
// ─── Détail d'un projet avec relations ───
export function useProject(id: string | undefined) {
  return useQuery({
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select(`
          *,
          lead:profiles!projects_lead_id_fkey(id, full_name, avatar_url, grade),
          mission:missions!projects_mission_id_fkey(id, name, code)
        `)
        .eq('id', id).single();
      return data;
    },
  });
}

// ─── Tâches d'un projet avec assignations ───
export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select(`
          *,
          assignments:task_assignments(
            id,
            user:profiles!task_assignments_user_id_fkey(id, full_name, avatar_url)
          )
        `)
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });
      return data;
    },
  });
}

// ─── Activités hiérarchiques (Activité → Sous-activité → Sous-sous-activité) ───
export function useProjectActivities(projectId: string | undefined) {
  return useQuery({
    queryFn: async () => {
      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });
      return data;
    },
  });
}

// ─── Création de tâche avec assignation multiple ───
export function useCreateTask() {
  return useMutation({
    mutationFn: async (values) => {
      const { assigned_to, ...taskValues } = values;

      // Crée la tâche
      const { data } = await supabase.from('tasks').insert({
        ...taskValues, created_by: profile.id,
        status: 'todo', priority: 'medium',
      }).select().single();

      // Assigne à un ou plusieurs utilisateurs
      if (assigned_to?.length > 0) {
        const assignments = assigned_to.map((userId) => ({
          task_id: data.id, user_id: userId, assigned_by: profile.id,
        }));
        await supabase.from('task_assignments').insert(assignments);
      }

      return data;
    },
  });
}

// Autres : useUpdateTask, useDeleteTask, useCreateActivity, useUpdateActivity,
// useDeleteActivity, useReorderActivities, useAddProjectMember,
// useProjectPublications, useCreatePublication, useProjectNotes, useCreateNote
```

---

## 10. WORKFLOW DE VALIDATION — useTaskSubmissions.ts

### Circuit de validation

```
Employé exécute → Soumet (in_review) → Chef examine
  ↓                                         ↓
  ← Corrections (correction) ←─── Option B : retourne avec commentaires
                                   Option A : valide (note 1-4)
```

```typescript
// ─── Historique des soumissions d'une tâche ───
export function useTaskSubmissions(taskId: string | undefined) {
  return useQuery({
    queryFn: async () => {
      const { data } = await supabase
        .from('task_submissions')
        .select(`
          *,
          submitter:profiles!task_submissions_submitted_by_fkey(id, full_name, avatar_url, grade),
          reviewer:profiles!task_submissions_reviewed_by_fkey(id, full_name, avatar_url, grade)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      return data;
    },
  });
}

// ─── Créer une soumission/validation/rejet ───
export function useCreateSubmission() {
  return useMutation({
    mutationFn: async (values) => {
      // type = 'submission' | 'correction' | 'validation' | 'rejection'
      // rating = 1-4 (uniquement pour les validations)
      const { data } = await supabase
        .from('task_submissions')
        .insert({
          ...values,
          submitted_by: profile.id,
          reviewed_by: values.type === 'validation' ? profile.id : null,
        })
        .select().single();
      return data;
    },
  });
}

// ─── Statistiques de performance d'un employé ───
export function useEmployeePerformanceSummary(userId: string | undefined) {
  return useQuery({
    queryFn: async () => {
      // 1. Récupère toutes les tâches assignées à l'utilisateur
      // 2. Récupère les soumissions de type 'validation' avec notes
      // 3. Calcule : note moyenne, nombre d'itérations moyen, distribution 1-4
      return {
        avgRating: 3.2,           // Moyenne des notes
        avgIterations: 1.5,       // Nombre moyen de corrections avant validation
        ratingDistribution: { 1: 2, 2: 5, 3: 10, 4: 8 },
        timeline: [...],           // Historique des notes par date
      };
    },
  });
}
```

---

## 11. DOCUMENTS (GED) — useDocuments.ts

### Fonctionnalités

- Upload vers Supabase Storage avec chemin structuré
- **Versioning automatique** (détecte les fichiers de même nom)
- Dossiers hiérarchiques
- Filtres par mission, projet, activité, statut
- Journal d'accès (audit trail)

```typescript
// ─── Upload de document avec versioning ───
export function useUploadDocument() {
  return useMutation({
    mutationFn: async (input) => {
      // 1. Nettoie le nom de fichier (supprime accents et caractères spéciaux)
      const sanitizedName = input.file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');

      // 2. Construit le chemin : orgId/missionId/projectId/timestamp_filename
      const filePath = `${orgId}/${missionId}/${projectId}/${Date.now()}_${sanitizedName}`;

      // 3. Upload vers le bucket 'documents'
      await supabase.storage.from('documents').upload(filePath, input.file, { upsert: false });

      // 4. Vérifie si un fichier de même nom existe → versioning
      const { data: existing } = await supabase
        .from('documents')
        .select('id, version')
        .eq('name', input.file.name)
        .eq('folder_id', input.folderId || '')
        .order('version', { ascending: false })
        .limit(1);

      const version = existing?.[0]?.version ? existing[0].version + 1 : 1;
      const parentVersionId = existing?.[0]?.id || null;

      // 5. Enregistre les métadonnées en base
      await supabase.from('documents').insert({
        name: input.file.name,
        file_path: filePath,
        file_size: input.file.size,
        mime_type: input.file.type,
        version,
        parent_version_id: parentVersionId,
        visibility_grade: input.visibilityGrade || 8, // Visible par tous par défaut
        status: 'draft',
        // ...
      });
    },
  });
}

// ─── Téléchargement de document ───
export async function downloadDocument(filePath: string, fileName: string) {
  const { data } = await supabase.storage.from('documents').download(filePath);
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Journal d'accès (audit trail) ───
export async function logDocumentAccess(documentId: string, action: string) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('document_access_log').insert({
    document_id: documentId,
    user_id: user.id,
    action, // 'view', 'download', 'edit', 'delete'
  });
}
```

---

## 12. MESSAGERIE TEMPS RÉEL — useMessages.ts

### Architecture

- **Conversations** : individuelles, groupe, projet, mission
- **Messages** : temps réel via `postgres_changes`
- **Typing indicator** : via `broadcast` (Supabase Realtime)
- **Compteur non-lus** : basé sur `last_read_at`

```typescript
// ─── Messages avec temps réel ───
export function useMessages(conversationId: string | null) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Récupération initiale des messages avec profils expéditeurs
  const { data: messages } = useQuery({
    queryFn: async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      // Enrichit avec les profils des expéditeurs
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_online')
        .in('id', senderIds);

      return data.map(m => ({ ...m, sender: profileMap.get(m.sender_id) }));
    },
  });

  // ─── Abonnement temps réel aux nouveaux messages ───
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [conversationId]);

  // ─── Typing indicator via broadcast ───
  useEffect(() => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id === user.id) return; // Ignore ses propres messages
        setTypingUsers(prev => [...prev, payload.user_name]);
        // Auto-clear après 3 secondes
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== payload.user_name));
        }, 3000);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [conversationId]);

  // ─── Envoi de message ───
  const sendMessage = useMutation({
    mutationFn: async ({ content, replyTo, attachments, mentions }) => {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content, reply_to: replyTo,
        attachments: attachments || [],
        mentions: mentions || [],
      });
    },
  });

  // ─── Marquer comme lu ───
  const markAsRead = async () => {
    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
  };

  return { messages, sendMessage, editMessage, deleteMessage,
           markAsRead, typingUsers, sendTyping };
}
```

---

## 13. TIMESHEETS ET FINANCE — useTimesheets.ts

### Fonctionnalités

- Saisie hebdomadaire des heures par mission/projet/tâche
- Soumission et validation par le manager
- Notes de frais avec catégories
- Facturation avec numérotation automatique (FAC-2026-0001)
- Calcul de rentabilité : heures × taux journalier par grade

```typescript
// ─── Saisie des heures ───
export function useUpsertTimeEntry() {
  return useMutation({
    mutationFn: async (entry) => {
      if (entry.id) {
        // Mise à jour d'une entrée existante
        await supabase.from('time_entries')
          .update({ hours: entry.hours, description: entry.description })
          .eq('id', entry.id);
      } else {
        // Nouvelle entrée
        if (entry.hours <= 0) return;
        await supabase.from('time_entries').insert({
          ...entry, user_id: profile.id, organization_id: profile.organization_id,
        });
      }
    },
  });
}

// ─── Soumission de la feuille de temps ───
export function useSubmitTimesheet() {
  return useMutation({
    mutationFn: async ({ weekStart, userId }) => {
      await supabase.from('time_entries')
        .update({ status: 'submitted' })
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .eq('status', 'draft');
    },
  });
}

// ─── Calcul de rentabilité par mission ───
export function useMissionBudgetSummary() {
  return useQuery({
    queryFn: async () => {
      // 1. Récupère les missions actives avec budget
      // 2. Récupère les time_entries validées/soumises
      // 3. Récupère les taux journaliers par grade
      // 4. Calcule : heures × (taux / 8) = coût
      // 5. Compare coût réel vs budget
      return missions.map(m => ({
        ...m,
        total_hours: 120,
        total_cost: 15000000,      // FCFA
        budget: 20000000,          // FCFA
        consumed_pct: 75,          // 75% du budget consommé
      }));
    },
  });
}

// ─── Création de facture ───
export function useCreateInvoice() {
  return useMutation({
    mutationFn: async (values) => {
      // Numérotation automatique : FAC-2026-0001
      const { count } = await supabase.from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id);
      const invoiceNumber = `FAC-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;

      await supabase.from('invoices').insert({
        ...values, invoice_number: invoiceNumber,
        organization_id: profile.organization_id, status: 'draft',
      });
    },
  });
}
```

---

## 14. COPIL / CODIR / MAILING — useCommittees.ts

### COPIL = Comité de Pilotage (1 par mission)
### CODIR = Comité de Direction (1 par cabinet)

```typescript
// ─── Liste des comités d'une mission ───
export const useCommittees = (missionId?: string) => useQuery({
  queryFn: async () => {
    let q = supabase.from('committees').select('*, committee_members(count)');
    if (missionId) q = q.eq('mission_id', missionId);
    else q = q.is('mission_id', null); // CODIR (pas lié à une mission)
    return q.order('created_at', { ascending: false });
  },
});

// ─── Membres (internes + externes) ───
export const useCommitteeMembers = (committeeId?: string) => useQuery({
  queryFn: async () => {
    return supabase
      .from('committee_members')
      .select('*, profiles:user_id(id, full_name, email, avatar_url, grade)')
      .eq('committee_id', committeeId);
    // Les membres externes ont is_external=true et external_email renseigné
  },
});

// ─── Envoi d'email groupé via Edge Function ───
export const useSendGroupEmail = () => useMutation({
  mutationFn: async (emailId: string) => {
    // Appelle l'Edge Function send-group-email
    const { data, error } = await supabase.functions.invoke('send-group-email', {
      body: { emailId },
    });
    if (error) throw error;
    return data;
  },
  onSuccess: () => toast.success('Emails envoyés'),
});
```

---

## 15. CRM ET PORTAIL CLIENT — useCRM.ts

```typescript
// ─── CRUD Clients ───
export function useClientsFullList() { /* Liste avec filtres par organisation */ }
export function useCreateClient() { /* Création avec organization_id automatique */ }
export function useUpdateClient() { /* Mise à jour */ }

// ─── Contacts du client ───
export function useClientContacts(clientId) { /* Liste des contacts */ }
export function useCreateContact() { /* Ajout de contact */ }

// ─── Historique des interactions ───
export function useClientInteractions(clientId) { /* Réunions, appels, etc. */ }
export function useCreateInteraction() { /* Nouvelle interaction */ }

// ─── Portail client (accès sécurisé par token) ───
export function useCreatePortalToken() {
  return useMutation({
    mutationFn: async ({ clientId, missionId }) => {
      // Génère un token long et unique
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      await supabase.from('client_portal_tokens').insert({
        client_id: clientId, mission_id: missionId,
        token, created_by: profile.id,
      });
    },
  });
}
// Le client accède via /portal/<token> sans avoir besoin de compte

// ─── Satisfaction client ───
export function useSatisfactionStats() {
  // Calcule : note moyenne, NPS (Net Promoter Score), nombre de réponses
}
```

---

## 16. ADMINISTRATION ET KPIs — useAdmin.ts

```typescript
export function useAdminKPIs() {
  return useQuery({
    queryFn: async () => {
      return {
        activeMissions: 12,        // Missions en cours
        totalUsers: 45,            // Utilisateurs total
        activeToday: 28,           // Connectés aujourd'hui
        utilization: 78,           // Taux d'utilisation (%)
        monthlyRevenue: 5000000,   // Revenus du mois (FCFA)
        avgQuality: 3.2,           // Note moyenne des livrables (1-4)
        avgSatisfaction: 4.1,      // Satisfaction client (1-5)
        billableHours: 340,        // Heures facturables ce mois
      };
    },
  });
}

// ─── Graphiques ───
export function useMissionsByMonth() { /* Missions créées par mois/statut */ }
export function useUtilizationByGrade() { /* Taux d'utilisation par grade */ }
export function useTaskStatusDistribution() { /* Répartition des tâches par statut */ }

// ─── Logs d'activité ───
export function useActivityLogs(filters) {
  // Filtrables par utilisateur, action, type d'entité, date
  // Limité à 200 entrées, triées par date décroissante
}

// ─── Gestion des utilisateurs ───
export function useUpdateUserGrade() {
  // Permet au DA/DM de changer le grade d'un utilisateur
}

export function useInviteUser() {
  return useMutation({
    mutationFn: async ({ email, grade }) => {
      // 1. Crée un token UUID unique
      const token = crypto.randomUUID();

      // 2. Enregistre l'invitation en base
      await supabase.from('invitations').insert({
        email, grade, token,
        organization_id: profile.organization_id,
        invited_by: profile.id,
      });

      // 3. Envoie l'email via Edge Function
      await supabase.functions.invoke('send-invitation', {
        body: { email, token, grade, organizationName: org.name },
      });
    },
  });
}
```

---

## 17. NOTIFICATIONS — useNotifications.ts

```typescript
// Types de notifications supportés
export const notificationLabels = {
  task_assigned: 'Tâche assignée',
  task_deadline_soon: 'Deadline proche',
  task_overdue: 'Tâche en retard',
  submission_received: 'Soumission reçue',
  correction_needed: 'Correction demandée',
  task_validated: 'Tâche validée',
  meeting_invite: 'Invitation réunion',
  document_shared: 'Document partagé',
  budget_alert: 'Alerte budget',
  // ...
};

export function useNotifications(limit = 20) {
  const { user } = useAuthStore();

  const { data: notifications } = useQuery({
    queryFn: async () => {
      return supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
    },
    refetchInterval: 60000, // Rafraîchit toutes les 60s
  });

  // ─── Abonnement temps réel ───
  useEffect(() => {
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Navigation contextuelle selon le type de notification
  const getNavigationPath = (notification) => {
    switch (notification.entity_type) {
      case 'task': return `/projects/${notification.entity_id}`;
      case 'mission': return `/missions/${notification.entity_id}`;
      case 'meeting': return '/calendar';
      case 'document': return '/documents';
      case 'conversation': return '/messages';
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, getNavigationPath };
}
```

---

## 18. EDGE FUNCTIONS (BACKEND)

### send-invitation — Envoi d'email d'invitation

**Fichier** : `supabase/functions/send-invitation/index.ts`

```typescript
Deno.serve(async (req) => {
  // 1. Vérifie l'authentification (Bearer token)
  // 2. Récupère les paramètres (email, token, grade, organizationName)
  // 3. Construit le lien d'invitation : https://app.url/register?token=xxx
  // 4. Si RESEND_API_KEY est configurée → envoie via Resend API
  //    Sinon → simule l'envoi (log en console)
  // 5. Email HTML avec bouton "Accepter l'invitation"
});
```

### send-group-email — Mailing groupé COPIL/CODIR

**Fichier** : `supabase/functions/send-group-email/index.ts`

```typescript
Deno.serve(async (req) => {
  // 1. Vérifie l'authentification
  // 2. Récupère l'email groupé depuis la DB (avec groupe + destinataires)
  // 3. Collecte tous les destinataires :
  //    - Membres du comité (internes : profil → email, externes : external_email)
  //    - Destinataires du groupe de mailing
  // 4. Met à jour le statut → 'sending'
  // 5. Pour chaque destinataire :
  //    - Envoie via Resend API (avec rate limiting : 600ms entre chaque)
  //    - Attache les pièces jointes (URLs signées depuis Storage)
  //    - Enregistre le résultat dans delivery_report
  // 6. Met à jour le statut → 'sent' ou 'error'
  // 7. Retourne le rapport : { sent: 5, errors: 1, deliveryReport: {...} }
});
```

### Autres Edge Functions

| Fonction | Description |
|----------|-------------|
| `budget-monitor` | Vérifie les budgets et envoie des alertes si > 80% |
| `meeting-reminders` | Envoie des rappels de réunion (15 min, 1h, 1 jour avant) |
| `task-automation` | Automatise les alertes de deadline et les tâches de revue |
| `timesheet-reminder` | Rappels quotidiens si timesheet non saisi |
| `validate-portal-token` | Valide les tokens du portail client |
| `send-satisfaction-survey` | Envoie les enquêtes de satisfaction |

---

## 19. DESIGN SYSTEM (CSS)

**Fichier** : `src/index.css`

### Tokens de couleur (HSL)

```css
:root {
  /* Couleurs principales */
  --primary: 224 76% 40%;           /* Bleu profond */
  --primary-foreground: 210 40% 98%;

  /* Sidebar (fond sombre) */
  --sidebar-background: 222 47% 11%;
  --sidebar-foreground: 210 40% 96%;
  --sidebar-accent: 217 33% 17%;

  /* Couleurs sémantiques */
  --success: 142 71% 45%;           /* Vert */
  --warning: 38 92% 50%;            /* Orange */
  --info: 199 89% 48%;              /* Bleu clair */
  --destructive: 0 84% 60%;         /* Rouge */
}

.dark {
  --background: 222 47% 7%;         /* Fond très sombre */
  --primary: 217 91% 60%;           /* Bleu plus vif en dark mode */
  --card: 222 47% 11%;
  /* ... */
}
```

### Typographies

```css
@import url('...Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800...');
```

- **Inter** : police de corps de texte
- **Plus Jakarta Sans** : police d'affichage (titres, `.font-display`)

### Usage dans les composants

```tsx
// ✅ CORRECT : utilise les tokens sémantiques
<div className="bg-card text-card-foreground border-border">
<Badge className="bg-success text-success-foreground">

// ❌ INCORRECT : couleurs en dur
<div className="bg-white text-black">
<Badge className="bg-green-500">
```

---

## 20. TYPES ET CONSTANTES — database.ts

**Fichier** : `src/types/database.ts`

```typescript
// Grades hiérarchiques du cabinet
export type Grade = 'DA' | 'DM' | 'CM' | 'SUP' | 'AS' | 'AUD' | 'AJ' | 'STG';

export const GRADE_LABELS: Record<Grade, string> = {
  DA: 'Directeur Associé',
  DM: 'Directeur de Mission',
  CM: 'Chef de Mission',
  SUP: 'Superviseur',
  AS: 'Auditeur Senior',
  AUD: 'Auditeur',
  AJ: 'Auditeur Junior',
  STG: 'Stagiaire',
};

export const GRADE_LEVELS: Record<Grade, number> = {
  DA: 1, DM: 2, CM: 3, SUP: 4, AS: 5, AUD: 6, AJ: 7, STG: 8,
};
// Règle : grade_level ≤ N → accès aux données de grade_level > N

// Statuts des entités
export type MissionStatus = 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'correction' | 'validated' | 'completed' | 'cancelled';
export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

// Labels en français
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  in_review: 'En revue',
  correction: 'Correction',
  validated: 'Validé',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  XOF: 'FCFA (UEMOA)',
  XAF: 'FCFA (CEMAC)',
  EUR: 'Euro',
  USD: 'Dollar US',
};
```

---

## RÉSUMÉ DES PATTERNS ARCHITECTURAUX

### 1. Pattern Hook CRUD

Chaque module suit le même pattern :
```typescript
export function useEntityList(filters) { return useQuery({ ... }); }
export function useEntity(id) { return useQuery({ ... }); }
export function useCreateEntity() { return useMutation({ ... }); }
export function useUpdateEntity() { return useMutation({ ... }); }
export function useDeleteEntity() { return useMutation({ ... }); }
```

### 2. Isolation multi-tenant

Toutes les requêtes filtrent par `organization_id` :
```typescript
.eq('organization_id', profile.organization_id)
```

### 3. Contrôle d'accès par grade

```typescript
const canCreate = profile?.grade_level <= 3;  // CM et au-dessus
const showAdmin = profile?.grade_level <= 2;   // DA et DM seulement
```

### 4. Temps réel

```typescript
// Écoute les changements PostgreSQL
supabase.channel('nom').on('postgres_changes', { event: 'INSERT', table: 'xxx' }, callback).subscribe();

// Broadcast (pas de persistance)
supabase.channel('typing:xxx').on('broadcast', { event: 'typing' }, callback).subscribe();
```

### 5. Invalidation de cache

Après chaque mutation, le cache React Query est invalidé :
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['entity-list'] });
  toast.success('Opération réussie');
}
```

---

**FIN DE LA DOCUMENTATION TECHNIQUE MISSIONFLOW v2.0**

*Document généré le 4 Mars 2026*
