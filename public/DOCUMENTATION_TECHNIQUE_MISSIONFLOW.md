# 📖 DOCUMENTATION TECHNIQUE — MissionFlow
## Guide complet pour la prise en main du code

**Version** : 1.0  
**Date** : 3 Mars 2026  
**Stack** : React 18 + TypeScript + Tailwind CSS + Shadcn/UI + Supabase (Lovable Cloud)

---

## TABLE DES MATIÈRES

1. [Architecture générale](#1-architecture-générale)
2. [Structure des fichiers](#2-structure-des-fichiers)
3. [Point d'entrée et configuration](#3-point-dentrée-et-configuration)
4. [Système d'authentification](#4-système-dauthentification)
5. [Layout et navigation](#5-layout-et-navigation)
6. [Gestion d'état (State Management)](#6-gestion-détat)
7. [Hooks métier (Business Logic)](#7-hooks-métier)
8. [Pages de l'application](#8-pages-de-lapplication)
9. [Composants principaux](#9-composants-principaux)
10. [Base de données et types](#10-base-de-données-et-types)
11. [Edge Functions (Backend)](#11-edge-functions-backend)
12. [Thème et design system](#12-thème-et-design-system)
13. [Fonctionnalités temps réel](#13-fonctionnalités-temps-réel)
14. [Guide de développement](#14-guide-de-développement)

---

## 1. ARCHITECTURE GÉNÉRALE

### 1.1 Schéma d'architecture

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
│  │   (src/integrations/supabase/client.ts) │             │
│  └──────────────────┬──────────────────────┘             │
└─────────────────────┼───────────────────────────────────┘
                      │ HTTPS / WebSocket
┌─────────────────────▼───────────────────────────────────┐
│                BACKEND (Lovable Cloud / Supabase)        │
│  ┌──────┐  ┌──────┐  ┌────────┐  ┌──────────┐          │
│  │ Auth │  │  DB  │  │Storage │  │ Realtime │          │
│  └──────┘  └──────┘  └────────┘  └──────────┘          │
│                │                                         │
│       ┌────────▼────────┐                               │
│       │ Edge Functions  │ (Deno)                        │
│       └─────────────────┘                               │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Flux de données

```
Utilisateur → Composant React → Hook personnalisé → Supabase SDK → API REST/Realtime → PostgreSQL
                                                                                         ↓
Utilisateur ← Re-render ← React Query (cache) ← Supabase SDK ← Réponse ← PostgreSQL
```

### 1.3 Technologies clés

| Technologie | Rôle | Fichier de config |
|-------------|------|-------------------|
| **Vite** | Bundler/Dev server | `vite.config.ts` |
| **React 18** | Framework UI | - |
| **TypeScript** | Typage statique | `tsconfig.json` |
| **Tailwind CSS** | Styles utilitaires | `tailwind.config.ts` |
| **Shadcn/UI** | Composants UI | `components.json` |
| **React Router v6** | Navigation/Routes | `src/App.tsx` |
| **React Query** | Cache/Fetch données | Hooks `use*.ts` |
| **Zustand** | État global | `src/stores/*.ts` |
| **Supabase** | Backend complet | `src/integrations/supabase/` |
| **date-fns** | Dates (locale fr) | - |

---

## 2. STRUCTURE DES FICHIERS

```
src/
├── App.tsx                    # Point d'entrée React, routage, AuthProvider
├── main.tsx                   # Montage DOM (createRoot)
├── index.css                  # Variables CSS (thème), imports Tailwind
│
├── assets/                    # Images statiques
│   └── logo.png
│
├── components/                # Composants React réutilisables
│   ├── auth/                  # Authentification (AuthGuard)
│   ├── layout/                # Layout global (Sidebar, Header, AppLayout)
│   ├── common/                # Composants partagés (Loading, EmptyState, ExportMenu)
│   ├── ui/                    # Composants Shadcn/UI (button, card, dialog...)
│   ├── missions/              # Composants liés aux missions
│   ├── projects/              # Composants liés aux projets/tâches
│   ├── documents/             # Explorateur de documents, upload
│   ├── messages/              # Chat et conversations
│   ├── copil/                 # COPIL, mailing groupé
│   ├── calendar/              # Calendrier et réunions
│   ├── crm/                   # Gestion clients
│   ├── admin/                 # Panneau d'administration
│   ├── search/                # Recherche globale
│   ├── settings/              # Paramètres
│   └── theme/                 # Toggle mode sombre/clair
│
├── hooks/                     # Hooks personnalisés (logique métier)
│   ├── useMessages.ts         # Conversations, messages, temps réel
│   ├── useMissions.ts         # CRUD missions, projets, clients
│   ├── useProject.ts          # Projets, tâches, activités
│   ├── useDocuments.ts        # GED, upload, versioning
│   ├── useTimesheets.ts       # Feuilles de temps, factures, notes de frais
│   ├── useCommittees.ts       # COPIL/CODIR, réunions, mailing
│   ├── useNotifications.ts    # Notifications temps réel
│   ├── useCalendar.ts         # Réunions et calendrier
│   ├── useCRM.ts              # Gestion clients
│   ├── useAdmin.ts            # KPIs, logs, paramètres org
│   ├── useDashboardData.ts    # Données du tableau de bord
│   ├── useTaskSubmissions.ts  # Workflow validation/évaluation
│   ├── useWorkspace.ts        # Bureau personnel
│   ├── useOffline.ts          # Mode hors-ligne
│   └── use-mobile.tsx         # Détection mobile
│
├── pages/                     # Pages (une par route)
│   ├── LoginPage.tsx          # Connexion / Inscription
│   ├── DashboardPage.tsx      # Tableau de bord
│   ├── MissionsPage.tsx       # Liste des missions
│   ├── MissionDetailPage.tsx  # Détail mission (onglets)
│   ├── ProjectDetailPage.tsx  # Détail projet (tâches, docs)
│   ├── DocumentsPage.tsx      # Explorateur de documents
│   ├── MessagesPage.tsx       # Messagerie
│   ├── CalendarPage.tsx       # Calendrier
│   ├── TimesheetsPage.tsx     # Feuilles de temps
│   ├── AdminPage.tsx          # Administration
│   ├── FinancePage.tsx        # Finance (factures, frais)
│   ├── CRMPage.tsx            # CRM Clients
│   ├── WorkspacePage.tsx      # Bureau personnel
│   ├── SettingsPage.tsx       # Paramètres utilisateur
│   └── NotificationsPage.tsx  # Toutes les notifications
│
├── stores/                    # Stores Zustand (état global)
│   ├── authStore.ts           # Session, user, profile
│   └── offlineStore.ts        # Queue offline
│
├── types/                     # Types TypeScript personnalisés
│   └── database.ts            # Grades, statuts, labels
│
├── integrations/supabase/     # ⚠️ FICHIERS AUTO-GÉNÉRÉS (ne pas modifier)
│   ├── client.ts              # Instance du client Supabase
│   └── types.ts               # Types auto-générés depuis la DB
│
├── lib/                       # Utilitaires
│   ├── utils.ts               # Fonctions utilitaires (cn, etc.)
│   ├── exportUtils.ts         # Export PDF/CSV
│   ├── fileUtils.ts           # Manipulation fichiers
│   ├── offlineDb.ts           # IndexedDB (Dexie)
│   └── syncManager.ts         # Synchronisation offline
│
supabase/
├── config.toml                # ⚠️ AUTO-GÉNÉRÉ (ne pas modifier)
└── functions/                 # Edge Functions (backend serverless)
    ├── send-group-email/      # Envoi emails groupés
    ├── send-invitation/       # Envoi invitations
    ├── meeting-reminders/     # Rappels de réunions
    ├── budget-monitor/        # Surveillance budgets
    ├── task-automation/       # Automatisation tâches
    ├── timesheet-reminder/    # Rappels feuilles de temps
    ├── send-satisfaction-survey/ # Enquêtes satisfaction
    └── validate-portal-token/ # Validation portail client
```

---

## 3. POINT D'ENTRÉE ET CONFIGURATION

### 3.1 `src/main.tsx` — Montage de l'application

```typescript
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
```

**Explication** : Point d'entrée minimal. Monte le composant `<App />` dans le DOM et importe les styles CSS globaux.

### 3.2 `src/App.tsx` — Configuration globale

Ce fichier est le **cœur de l'application**. Il configure :

1. **Providers (enveloppes globales)** :
   - `ThemeProvider` : mode clair/sombre
   - `QueryClientProvider` : cache React Query
   - `TooltipProvider` : tooltips Shadcn
   - `BrowserRouter` : navigation React Router
   - `AuthProvider` : gestion de session (composant interne)

2. **Routes** :
   ```
   /landing          → LandingPage (publique)
   /login            → LoginPage (publique)
   /register         → LoginPage (publique, mode inscription)
   /portal/:token    → ClientPortalPage (publique)
   /survey/:token    → SatisfactionSurveyPage (publique)
   
   [Routes protégées par AuthGuard + AppLayout]
   /                 → DashboardPage
   /missions         → MissionsPage
   /missions/:id     → MissionDetailPage
   /projects/:id     → ProjectDetailPage
   /documents        → DocumentsPage
   /messages         → MessagesPage
   /calendar         → CalendarPage
   /timesheets       → TimesheetsPage
   /admin            → AdminPage
   /admin/finance    → FinancePage
   /admin/reviews    → PerformanceReviewsPage
   /admin/clients    → CRMPage
   /admin/clients/:id → ClientDetailPage
   /workspace        → WorkspacePage
   /notifications    → NotificationsPage
   /settings         → SettingsPage
   ```

3. **AuthProvider** (composant interne) :
   - Écoute les changements de session Supabase (`onAuthStateChange`)
   - Crée/synchronise le profil utilisateur à la connexion
   - Gère la présence en ligne (heartbeat toutes les 60s)
   - Marque l'utilisateur hors-ligne à la déconnexion

4. **`ensureUserProfile()`** : Fonction clé qui :
   - Vérifie si le profil existe dans la table `profiles`
   - Si un token d'invitation existe, récupère les infos (organisation, grade)
   - Crée ou met à jour le profil via `upsert`

---

## 4. SYSTÈME D'AUTHENTIFICATION

### 4.1 Flux d'authentification

```
                    ┌─────────────────┐
                    │   LoginPage     │
                    │  /login         │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Connexion ou   │
                    │  Inscription    │
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────┐
              │    Supabase Auth            │
              │  signInWithPassword()       │
              │  ou signUp()               │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │   onAuthStateChange()       │
              │   → ensureUserProfile()     │
              │   → setUserOnline()         │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │   AuthGuard vérifie          │
              │   session + token serveur    │
              │   → supabase.auth.getUser() │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │   Redirection vers /        │
              │   (DashboardPage)           │
              └─────────────────────────────┘
```

### 4.2 `AuthGuard` (`src/components/auth/AuthGuard.tsx`)

```typescript
const AuthGuard = ({ children }) => {
  // 1. Vérifie si une session existe (côté client)
  // 2. Vérifie le token côté serveur (supabase.auth.getUser())
  // 3. Si invalide → déconnexion + redirection /login
  // 4. Si valide → affiche les enfants (children)
};
```

**Point clé** : La double vérification (client + serveur) empêche l'accès avec un token expiré ou volé.

### 4.3 `LoginPage` (`src/pages/LoginPage.tsx`)

Fonctionnalités :
- **Connexion** : email + mot de passe
- **Inscription** : uniquement via lien d'invitation (token UUID dans l'URL)
- **Validation de mot de passe** : 8 caractères min, majuscule, minuscule, chiffre
- **Protection anti-brute-force** : Verrouillage après 5 tentatives (60s)
- **Extraction de token** : Gère plusieurs formats d'URL (query, hash, path)

### 4.4 Inscription par invitation

```
Admin clique "Inviter" → useInviteUser() → INSERT dans table invitations
    → Edge Function send-invitation → Email avec lien
    → Utilisateur clique le lien → /register?token=UUID
    → LoginPage détecte le token → get_invitation_by_token (RPC)
    → Affiche organisation + grade → Inscription Supabase
    → ensureUserProfile() → Crée profil avec org + grade
```

---

## 5. LAYOUT ET NAVIGATION

### 5.1 `AppLayout` (`src/components/layout/AppLayout.tsx`)

```typescript
const AppLayout = () => (
  <SidebarProvider>
    <AppSidebar />          {/* Barre latérale gauche */}
    <SidebarInset>
      <OfflineBanner />     {/* Bannière mode hors-ligne */}
      <Header />            {/* En-tête avec recherche, notifications */}
      <main>
        <Outlet />          {/* Contenu de la page actuelle */}
      </main>
    </SidebarInset>
  </SidebarProvider>
);
```

### 5.2 `AppSidebar` — Navigation principale

| Élément | Route | Icône |
|---------|-------|-------|
| Tableau de bord | `/` | LayoutDashboard |
| Missions | `/missions` | Briefcase |
| Documents | `/documents` | FileText |
| Messagerie | `/messages` | MessageSquare |
| Calendrier | `/calendar` | Calendar |
| Feuilles de temps | `/timesheets` | Clock |
| Bureau personnel | `/workspace` | Monitor |
| Administration | `/admin` | Settings (grade ≤ 2) |

**Règle d'accès** : L'onglet Administration n'apparaît que pour les grades DA et DM (`grade_level ≤ 2`).

---

## 6. GESTION D'ÉTAT

### 6.1 `authStore` (Zustand) — `src/stores/authStore.ts`

```typescript
interface AuthState {
  session: Session | null;    // Session Supabase (JWT)
  user: User | null;          // Objet User Supabase
  profile: Profile | null;    // Profil enrichi (grade, org, etc.)
  loading: boolean;
  
  setSession(s): void;
  setProfile(p): void;
  setLoading(l): void;
  clear(): void;
}
```

**Usage dans les composants** :
```typescript
const { user, profile } = useAuthStore();
const gradeLevel = profile?.grade_level ?? 8;
const orgId = profile?.organization_id;
```

### 6.2 React Query — Cache et synchronisation

Toute la logique de récupération de données utilise **React Query** via des hooks personnalisés :

```typescript
// Pattern standard
export function useMyData(id) {
  return useQuery({
    queryKey: ['my-data', id],           // Clé de cache unique
    queryFn: async () => {                // Fonction de fetch
      const { data, error } = await supabase.from('table').select('*').eq('id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,                        // Ne fetch que si id existe
  });
}
```

**Mutations (création/modification/suppression)** :
```typescript
export function useCreateMyData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { error } = await supabase.from('table').insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-data'] }); // Rafraîchit le cache
      toast.success('Créé avec succès');
    },
  });
}
```

---

## 7. HOOKS MÉTIER

### 7.1 `useMissions.ts` — Gestion des missions

| Hook | Description |
|------|-------------|
| `useMissions(filters)` | Liste des missions avec filtres (statut, type, priorité, client, recherche) |
| `useMission(id)` | Détail d'une mission avec client, directeur, chef |
| `useMissionMembers(missionId)` | Membres de la mission avec profils |
| `useMissionProjects(missionId)` | Projets de la mission |
| `useCreateMission()` | Création de mission (génère code MIS-YYYY-NNN) |
| `useUpdateMission()` | Mise à jour d'une mission |
| `useDeleteMission()` | Suppression |
| `useAddMissionMember()` | Ajout d'un membre |
| `useOrganizationUsers()` | Liste des utilisateurs de l'organisation |
| `useClients()` | Liste des clients |
| `useCreateProject()` | Création d'un projet (génère code PRJ-YYYY-NNN) |

**Exemple de jointure Supabase** :
```typescript
const { data } = await supabase
  .from('missions')
  .select(`
    *,
    client:clients(id, name),
    director:profiles!missions_director_id_fkey(id, full_name, avatar_url),
    chief:profiles!missions_chief_id_fkey(id, full_name, avatar_url)
  `)
  .eq('organization_id', orgId);
```

### 7.2 `useProject.ts` — Projets et tâches

| Hook | Description |
|------|-------------|
| `useProject(id)` | Détail du projet |
| `useProjectMembers(projectId)` | Membres du projet |
| `useProjectTasks(projectId)` | Tâches avec assignations |
| `useProjectActivities(projectId)` | Arborescence des activités |
| `useCreateTask()` | Création de tâche avec assignation |
| `useUpdateTask()` | Mise à jour de tâche |
| `useDeleteTask()` | Suppression |
| `useCreateActivity()` | Création d'activité |
| `useReorderActivities()` | Réorganisation drag & drop |
| `useProjectPublications(projectId)` | Publications du projet |
| `useProjectNotes(projectId)` | Notes personnelles/partagées |

### 7.3 `useMessages.ts` — Messagerie

| Hook/Fonction | Description |
|--------------|-------------|
| `useConversations()` | Liste des conversations avec dernier message et compteur non-lus |
| `useMessages(conversationId)` | Messages avec profils expéditeurs et réponses |
| `sendMessage` | Envoi d'un message (mutation) |
| `editMessage` | Édition d'un message |
| `deleteMessage` | Suppression |
| `markAsRead` | Marquer comme lu |
| `typingUsers` | Indicateur de saisie (broadcast Supabase) |
| `sendTyping` | Envoyer signal "en train d'écrire" |
| `useOrgMembers()` | Membres de l'organisation pour créer des conversations |

**Temps réel** : Deux canaux Supabase par conversation :
1. `postgres_changes` : Détecte les INSERT/UPDATE/DELETE de messages
2. `broadcast` : Indicateur de saisie (typing)

### 7.4 `useDocuments.ts` — Gestion documentaire

| Hook | Description |
|------|-------------|
| `useDocuments(opts)` | Liste documents avec filtres (mission, projet, dossier, recherche) |
| `useDocumentFolders(opts)` | Arborescence des dossiers |
| `useUploadDocument()` | Upload fichier → Supabase Storage → enregistrement DB |
| `useCreateFolder()` | Création de dossier |
| `useDeleteDocument()` | Suppression fichier + Storage |
| `useMoveDocument()` | Déplacement entre dossiers |
| `useDocumentVersions()` | Historique des versions |
| `downloadDocument()` | Téléchargement via Storage |
| `logDocumentAccess()` | Traçabilité des accès |

**Versioning** : Lors de l'upload, si un fichier du même nom existe dans le même dossier, le nouveau document est lié comme nouvelle version (`parent_version_id`, `version` incrémenté).

### 7.5 `useTimesheets.ts` — Feuilles de temps et finance

| Hook | Description |
|------|-------------|
| `useTimeEntries(weekStart)` | Entrées de la semaine |
| `useUpsertTimeEntry()` | Créer/modifier une entrée |
| `useSubmitTimesheet()` | Soumettre pour validation |
| `useApproveTimeEntries()` | Approuver/rejeter (manager) |
| `useTeamTimesheets(weekStart)` | Vue manager des soumissions |
| `useDailyRates()` | Taux journaliers par grade |
| `useExpenses(filters)` | Notes de frais |
| `useCreateExpense()` | Créer une note de frais |
| `useInvoices(filters)` | Factures |
| `useCreateInvoice()` | Créer une facture (numéro FAC-YYYY-NNNN) |
| `useMissionBudgetSummary()` | Rentabilité par mission |

### 7.6 `useCommittees.ts` — COPIL/CODIR

| Hook | Description |
|------|-------------|
| `useCommittees(missionId)` | Liste des comités |
| `useCreateCommittee()` | Créer un comité |
| `useCommitteeMembers(committeeId)` | Membres (internes + externes) |
| `useAddCommitteeMember()` | Ajouter un membre |
| `useCommitteeMeetings(committeeId)` | Réunions programmées |
| `useCreateMeeting()` | Programmer une réunion |
| `useMailingGroup(committeeId)` | Groupe de diffusion lié |
| `useGroupEmails(groupId)` | Historique des emails envoyés |
| `useCreateGroupEmail()` | Composer un email groupé |
| `useSendGroupEmail()` | Envoyer via Edge Function |

### 7.7 `useNotifications.ts` — Notifications

- Fetch les 20 dernières notifications
- Compteur de non-lues (`unreadCount`)
- **Temps réel** : Écoute les INSERT sur `notifications` (filtre par user_id)
- `markAsRead(id)` / `markAllAsRead()`
- `getNavigationPath(notification)` : Détermine la route selon le type

### 7.8 `useAdmin.ts` — Administration

| Hook | Description |
|------|-------------|
| `useAdminKPIs()` | KPIs globaux (missions, utilisation, revenus, qualité) |
| `useMissionsByMonth()` | Graphique missions par mois |
| `useUtilizationByGrade()` | Taux d'utilisation par grade |
| `useTaskStatusDistribution()` | Distribution des statuts de tâches |
| `useActivityLogs(filters)` | Journal d'activité complet |
| `useOrganization()` | Paramètres de l'organisation |
| `useUpdateOrganization()` | Modifier les paramètres |
| `useInviteUser()` | Inviter un utilisateur |
| `useUpdateUserGrade()` | Modifier le grade d'un utilisateur |

---

## 8. PAGES DE L'APPLICATION

### 8.1 `DashboardPage` — Tableau de bord

Affiche en un coup d'œil :
- 4 cartes statistiques (missions actives, tâches, documents, heures)
- Tâches urgentes avec deadlines
- Prochaines réunions
- Activité récente

**Hook utilisé** : `useDashboardData()`

### 8.2 `MissionsPage` — Liste des missions

- Filtres : statut, type, priorité, client, recherche texte
- Vue tableau avec badges de statut et priorité
- Bouton de création (modal `MissionFormDialog`)

### 8.3 `MissionDetailPage` — Détail mission

Onglets :
- **Vue d'ensemble** : KPIs, progression, timeline
- **Projets** : Liste et création de projets
- **Équipe** : Membres avec grades et rôles
- **Budget** : Suivi budgétaire
- **COPIL** : Comité de pilotage
- **Paramètres** : Configuration de la mission

### 8.4 `ProjectDetailPage` — Détail projet

Onglets :
- **Tâches** : Vue Kanban, tableau, compartiments
- **Activités** : Arborescence hiérarchique
- **Documents** : Fichiers du projet
- **Équipe** : Membres du projet
- **Publications** : Annonces et notes
- **Notes** : Bloc-notes personnel/partagé
- **Calendrier** : Réunions liées

### 8.5 `MessagesPage` — Messagerie

Layout deux panneaux :
- **Gauche** (320px) : `ConversationList` — liste des conversations
- **Droite** : `ChatArea` — zone de chat avec messages, input, typing indicator

### 8.6 `TimesheetsPage` — Feuilles de temps

- Grille hebdomadaire (lundi → dimanche)
- Saisie des heures par mission/projet/tâche
- Soumission et validation par le manager
- Distinction heures facturables / non-facturables

### 8.7 `AdminPage` — Administration

Onglets :
- **Dashboard** : KPIs, graphiques
- **Utilisateurs** : Liste, invitation, modification grades
- **Journal** : Logs d'activité avec filtres
- **Paramètres** : Configuration organisation

---

## 9. COMPOSANTS PRINCIPAUX

### 9.1 Composants UI (Shadcn/UI)

Tous les composants UI de base sont dans `src/components/ui/` :

```
Button, Card, Dialog, Select, Input, Textarea, Tabs, Table,
Badge, Avatar, Tooltip, Popover, DropdownMenu, Sheet, Sidebar,
Progress, Calendar, Checkbox, Switch, Slider, ScrollArea, etc.
```

**⚠️ Important** : Ne jamais utiliser de couleurs Tailwind directement (`text-blue-500`). Toujours utiliser les tokens sémantiques (`text-primary`, `bg-muted`, `text-destructive`, etc.).

### 9.2 Composants métier clés

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `TaskKanbanView` | projects/ | Vue Kanban des tâches (todo → validated) |
| `TaskTableView` | projects/ | Vue tableau des tâches |
| `TaskDetailDialog` | projects/ | Détail d'une tâche (dialog) |
| `TaskFormDialog` | projects/ | Formulaire création/édition tâche |
| `DocumentExplorer` | documents/ | Explorateur de fichiers |
| `UploadZone` | documents/ | Zone de drag & drop upload |
| `FolderTree` | documents/ | Arborescence des dossiers |
| `ConversationList` | messages/ | Liste des conversations |
| `ChatArea` | messages/ | Zone de messagerie |
| `CopilTab` | copil/ | Onglet COPIL complet |
| `GroupMailComposer` | copil/ | Composition d'email groupé |
| `MissionFormDialog` | missions/ | Formulaire de mission |
| `GlobalSearch` | search/ | Recherche globale (Cmd+K) |

---

## 10. BASE DE DONNÉES ET TYPES

### 10.1 Tables principales

| Table | Description | Clés étrangères principales |
|-------|-------------|---------------------------|
| `organizations` | Cabinets/entreprises | - |
| `profiles` | Profils utilisateurs | `organization_id` |
| `clients` | Clients du cabinet | `organization_id` |
| `missions` | Missions (engagements) | `organization_id`, `client_id`, `director_id`, `chief_id` |
| `mission_members` | Membres d'une mission | `mission_id`, `user_id` |
| `projects` | Projets d'une mission | `mission_id`, `organization_id` |
| `project_members` | Membres d'un projet | `project_id`, `user_id` |
| `activities` | Activités (hiérarchie) | `project_id`, `parent_id` |
| `tasks` | Tâches assignables | `project_id`, `activity_id` |
| `task_assignments` | Assignation tâche→utilisateur | `task_id`, `user_id` |
| `task_submissions` | Soumissions/corrections | `task_id`, `submitted_by` |
| `documents` | Documents uploadés | `organization_id`, `mission_id`, `project_id`, `folder_id` |
| `document_folders` | Dossiers | `organization_id`, `project_id`, `parent_id` |
| `conversations` | Conversations chat | `organization_id` |
| `conversation_members` | Membres d'une conversation | `conversation_id`, `user_id` |
| `messages` | Messages chat | `conversation_id`, `sender_id` |
| `committees` | COPIL/CODIR | `mission_id` |
| `committee_members` | Membres du comité | `committee_id`, `user_id` |
| `committee_meetings` | Réunions de comité | `committee_id` |
| `time_entries` | Saisie des temps | `user_id`, `mission_id`, `project_id` |
| `expenses` | Notes de frais | `user_id`, `mission_id` |
| `invoices` | Factures | `organization_id`, `client_id` |
| `notifications` | Notifications | `user_id` |
| `activity_logs` | Journal d'activité | `user_id`, `organization_id` |
| `mailing_groups` | Groupes de diffusion | `committee_id`, `organization_id` |
| `group_emails` | Emails groupés | `group_id` |

### 10.2 Types personnalisés (`src/types/database.ts`)

```typescript
// Grades hiérarchiques
type Grade = 'DA' | 'DM' | 'CM' | 'SUP' | 'AS' | 'AUD' | 'AJ' | 'STG';

// Niveaux (1 = plus haut, 8 = plus bas)
const GRADE_LEVELS = { DA: 1, DM: 2, CM: 3, SUP: 4, AS: 5, AUD: 6, AJ: 7, STG: 8 };

// Statuts de mission
type MissionStatus = 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';

// Statuts de tâche (workflow)
type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'correction' | 'validated' | 'completed' | 'cancelled';

// Priorités
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
```

### 10.3 Types auto-générés (`src/integrations/supabase/types.ts`)

⚠️ **NE JAMAIS MODIFIER CE FICHIER**. Il est généré automatiquement à partir du schéma de la base de données. Utilisez-le pour le typage :

```typescript
import type { Database } from '@/integrations/supabase/types';
type Mission = Database['public']['Tables']['missions']['Row'];
type MissionInsert = Database['public']['Tables']['missions']['Insert'];
```

### 10.4 RLS (Row Level Security)

Chaque table est protégée par des politiques RLS. Principes :
- **Isolation par organisation** : `organization_id = profil utilisateur.organization_id`
- **Isolation par mission** : Visible seulement si membre de la mission
- **Contrôle par grade** : Certains documents masqués selon le grade
- **Propriétaire** : L'auteur peut toujours voir ses propres données

---

## 11. EDGE FUNCTIONS (BACKEND)

### 11.1 `send-group-email`

Envoie des emails groupés via Resend API :
1. Récupère l'email depuis la table `group_emails`
2. Récupère les destinataires depuis `mailing_group_recipients`
3. Appelle l'API Resend pour chaque destinataire
4. Met à jour le `delivery_report` et le `status`

### 11.2 `send-invitation`

Envoie un email d'invitation pour rejoindre l'organisation :
- Reçoit `{ email, token, grade, organizationName }`
- Génère un lien `/register?token=UUID`
- Envoie via Resend

### 11.3 `meeting-reminders`

Envoie des rappels automatiques avant les réunions programmées.

### 11.4 `budget-monitor`

Surveille la consommation budgétaire des missions et crée des notifications si le seuil (80%) est dépassé.

### 11.5 `task-automation`

Automatise les actions sur les tâches :
- Alertes de deadline (J-2)
- Notifications de retard

### 11.6 `timesheet-reminder`

Rappels automatiques pour la saisie des feuilles de temps.

---

## 12. THÈME ET DESIGN SYSTEM

### 12.1 Variables CSS (`src/index.css`)

Le thème utilise des **variables CSS HSL** :

```css
:root {
  --background: 210 20% 98%;
  --foreground: 222 47% 11%;
  --primary: 224 76% 40%;        /* Bleu professionnel */
  --secondary: 214 32% 91%;
  --muted: 210 40% 96%;
  --accent: 217 91% 60%;
  --destructive: 0 84% 60%;     /* Rouge erreur */
  --success: 142 71% 45%;       /* Vert succès */
  --warning: 38 92% 50%;        /* Orange avertissement */
  --sidebar-background: 222 47% 11%;  /* Sidebar sombre */
}

.dark {
  /* Toutes les variables sont redéfinies pour le mode sombre */
  --background: 222 47% 7%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### 12.2 Polices

- **Display** : Plus Jakarta Sans (titres, navigation)
- **Body** : Inter (contenu, texte)

### 12.3 Règles d'utilisation

✅ **Correct** :
```tsx
<div className="bg-background text-foreground">
<Button variant="default">  {/* utilise --primary */}
<Badge className="bg-success text-success-foreground">
```

❌ **Incorrect** :
```tsx
<div className="bg-white text-black">     {/* Couleurs codées en dur */}
<div className="bg-blue-500">             {/* Classe Tailwind directe */}
```

---

## 13. FONCTIONNALITÉS TEMPS RÉEL

### 13.1 Messages en temps réel

```typescript
// Écoute les changements sur la table messages
supabase
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
```

### 13.2 Typing indicator (broadcast)

```typescript
// Envoi
supabase.channel(`typing:${convId}`).send({
  type: 'broadcast',
  event: 'typing',
  payload: { user_id, user_name },
});

// Réception
supabase.channel(`typing:${convId}`).on('broadcast', { event: 'typing' }, (payload) => {
  // Affiche "X est en train d'écrire..."
  // Auto-suppression après 3 secondes
});
```

### 13.3 Notifications en temps réel

```typescript
supabase
  .channel('notifications-realtime')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  })
  .subscribe();
```

### 13.4 Présence en ligne

- **Heartbeat** : Toutes les 60 secondes, `last_seen_at` est mis à jour
- **Connexion** : `is_online = true`, `last_login_at = now()`
- **Déconnexion** : `is_online = false`, `last_seen_at = now()`

---

## 14. GUIDE DE DÉVELOPPEMENT

### 14.1 Installation locale

```bash
# 1. Cloner le repo
git clone <URL_DU_REPO>
cd missionflow

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur de développement
npm run dev
```

### 14.2 Conventions de code

| Convention | Description |
|-----------|-------------|
| **Nommage fichiers** | PascalCase pour composants (`TaskKanbanView.tsx`), camelCase pour hooks (`useProject.ts`) |
| **Nommage composants** | PascalCase (`const TaskCard = ()`) |
| **Nommage hooks** | Préfixe `use` (`useMessages`, `useMissions`) |
| **Types** | Interfaces pour les objets, Types pour les unions |
| **Imports** | Alias `@/` pointe vers `src/` |
| **Styles** | Tailwind uniquement, tokens sémantiques du design system |
| **Toast** | `toast.success()` / `toast.error()` via Sonner |
| **Erreurs** | `try/catch` dans les mutations, messages utilisateur en français |

### 14.3 Créer une nouvelle fonctionnalité

1. **Si besoin de nouvelles tables** : Migration SQL via l'outil de migration Supabase
2. **Créer un hook** dans `src/hooks/useMonModule.ts` avec les fonctions CRUD
3. **Créer les composants** dans `src/components/monmodule/`
4. **Créer la page** dans `src/pages/MonModulePage.tsx`
5. **Ajouter la route** dans `src/App.tsx`
6. **Ajouter le lien** dans `src/components/layout/AppSidebar.tsx`

### 14.4 Pattern de création d'un hook CRUD

```typescript
// src/hooks/useMonModule.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

// LECTURE
export function useMonModuleList() {
  const profile = useAuthStore((s) => s.profile);
  return useQuery({
    queryKey: ['mon-module', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const { data, error } = await supabase
        .from('ma_table')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });
}

// CRÉATION
export function useCreateMonModule() {
  const qc = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  
  return useMutation({
    mutationFn: async (values: { name: string; /* ... */ }) => {
      const { data, error } = await supabase
        .from('ma_table')
        .insert({ ...values, organization_id: profile!.organization_id! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mon-module'] });
      toast.success('Élément créé');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
```

### 14.5 Fichiers à ne JAMAIS modifier

| Fichier | Raison |
|---------|--------|
| `src/integrations/supabase/client.ts` | Auto-généré |
| `src/integrations/supabase/types.ts` | Auto-généré depuis la DB |
| `supabase/config.toml` | Auto-géré |
| `.env` | Auto-géré (variables Supabase) |

### 14.6 Commandes utiles

```bash
npm run dev        # Serveur de développement (port 5173)
npm run build      # Build de production
npm run test       # Lancer les tests (Vitest)
npm run lint       # Linting ESLint
```

### 14.7 Variables d'environnement

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL de l'API Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé publique (anon key) |
| `VITE_SUPABASE_PROJECT_ID` | ID du projet |

---

## ANNEXE : WORKFLOW DE VALIDATION DES TÂCHES

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌───────────────┐
│  TODO   │───►│IN_PROGRESS│───►│ IN_REVIEW │───►│   VALIDATED   │
└─────────┘    └───────────┘    └─────┬─────┘    │ (note 1-4)    │
                                      │          └───────────────┘
                                      ▼
                                ┌───────────┐
                                │CORRECTION │──► retour à IN_PROGRESS
                                └───────────┘
```

1. Le chef de projet affecte une tâche (statut `todo`)
2. L'employé commence le travail (`in_progress`)
3. L'employé soumet son travail (`in_review`)
4. Le chef examine :
   - **Satisfaisant** → `validated` avec note (1-4)
   - **À corriger** → `correction` avec commentaires
5. L'employé corrige et resoumet
6. Cycle jusqu'à validation finale

**Échelle de notation** :
| Note | Label |
|------|-------|
| 1 | Insuffisant |
| 2 | Passable |
| 3 | Bien |
| 4 | Excellent |

---

**FIN DE LA DOCUMENTATION TECHNIQUE**

*Pour convertir en Word : Copiez ce contenu dans Google Docs, ou utilisez [Pandoc](https://pandoc.org) : `pandoc DOCUMENTATION_TECHNIQUE_MISSIONFLOW.md -o doc.docx`*
