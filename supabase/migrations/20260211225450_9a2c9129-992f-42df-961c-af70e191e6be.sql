
-- ============================================================
-- ORGANISATIONS
-- ============================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  subscription_plan TEXT DEFAULT 'free',
  max_users INTEGER DEFAULT 5,
  max_storage_gb INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USER ROLES (table séparée pour la sécurité)
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- ============================================================
-- PROFILS
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  grade TEXT CHECK (grade IN ('DA','DM','CM','SUP','AS','AUD','AJ','STG')),
  grade_level INTEGER GENERATED ALWAYS AS (
    CASE grade
      WHEN 'DA' THEN 1 WHEN 'DM' THEN 2 WHEN 'CM' THEN 3
      WHEN 'SUP' THEN 4 WHEN 'AS' THEN 5 WHEN 'AUD' THEN 6
      WHEN 'AJ' THEN 7 WHEN 'STG' THEN 8
    END
  ) STORED,
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  skills JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CLIENTS (CRM)
-- ============================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  industry TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'CI',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MISSIONS
-- ============================================================
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  client_id UUID REFERENCES public.clients(id),
  name TEXT NOT NULL,
  description TEXT,
  code TEXT,
  type TEXT CHECK (type IN (
    'audit_financier','audit_it','restructuration_si','conseil_management',
    'expertise_comptable','due_diligence','etude','autre'
  )),
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','planning','active','on_hold','completed','archived'
  )),
  director_id UUID REFERENCES public.profiles(id),
  chief_id UUID REFERENCES public.profiles(id),
  budget_amount DECIMAL(15,2),
  budget_currency TEXT DEFAULT 'XOF' CHECK (budget_currency IN ('XOF','XAF','EUR','USD')),
  start_date DATE,
  end_date DATE,
  actual_end_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÉQUIPES DE MISSION
-- ============================================================
CREATE TABLE public.mission_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  role TEXT CHECK (role IN ('director','chief','supervisor','project_lead','member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(mission_id, user_id)
);

-- ============================================================
-- PROJETS
-- ============================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  code TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN (
    'planning','active','on_hold','review','completed','archived'
  )),
  lead_id UUID REFERENCES public.profiles(id),
  start_date DATE,
  end_date DATE,
  progress INTEGER DEFAULT 0,
  budget_allocated DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ÉQUIPES DE PROJET
-- ============================================================
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('lead','sub_lead','member')),
  sub_team TEXT,
  permissions JSONB DEFAULT '{"read":true,"write":false,"delete":false}',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- ============================================================
-- ACTIVITÉS
-- ============================================================
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.activities(id),
  name TEXT NOT NULL,
  description TEXT,
  depth INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TÂCHES
-- ============================================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.activities(id),
  parent_task_id UUID REFERENCES public.tasks(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN (
    'todo','in_progress','in_review','correction','validated','completed','cancelled'
  )),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  created_by UUID REFERENCES public.profiles(id),
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  estimated_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2),
  compartment TEXT,
  order_index INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AFFECTATION DES TÂCHES
-- ============================================================
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- ============================================================
-- WORKFLOW DE VALIDATION
-- ============================================================
CREATE TABLE public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  type TEXT CHECK (type IN ('submission','correction','validation','rejection')),
  comment TEXT,
  attachments JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('pending','reviewed','approved','rejected')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DOSSIERS DE DOCUMENTS (doit être créé avant documents)
-- ============================================================
CREATE TABLE public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  parent_id UUID REFERENCES public.document_folders(id),
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  mission_id UUID REFERENCES public.missions(id),
  project_id UUID REFERENCES public.projects(id),
  activity_id UUID REFERENCES public.activities(id),
  folder_id UUID REFERENCES public.document_folders(id),
  uploaded_by UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES public.documents(id),
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','in_review','approved','published','archived'
  )),
  visibility_grade INTEGER DEFAULT 8,
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  checksum TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES public.profiles(id),
  shared_by UUID REFERENCES public.profiles(id),
  permission TEXT DEFAULT 'read' CHECK (permission IN ('read','write','admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, shared_with)
);

CREATE TABLE public.document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT CHECK (action IN ('view','download','edit','share','delete','version')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  category TEXT,
  file_path TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- COMITÉS
-- ============================================================
CREATE TABLE public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('copil','comite_direction')),
  name TEXT NOT NULL,
  description TEXT,
  meeting_frequency TEXT DEFAULT 'monthly',
  secretary_id UUID REFERENCES public.profiles(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID REFERENCES public.committees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  external_name TEXT,
  external_email TEXT,
  external_phone TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('president','vice_president','secretary','member')),
  is_external BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.committee_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID REFERENCES public.committees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  agenda TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'scheduled','in_progress','completed','cancelled'
  )),
  minutes_document_id UUID REFERENCES public.documents(id),
  decisions JSONB DEFAULT '[]',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MAILING GROUPÉ
-- ============================================================
CREATE TABLE public.mailing_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  committee_id UUID REFERENCES public.committees(id),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.mailing_group_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.mailing_groups(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  user_id UUID REFERENCES public.profiles(id),
  is_external BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.group_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.mailing_groups(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_by UUID REFERENCES public.profiles(id),
  attachments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
  sent_at TIMESTAMPTZ,
  delivery_report JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONVERSATIONS ET MESSAGERIE
-- ============================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  type TEXT CHECK (type IN ('individual','group','meeting','project','mission')),
  name TEXT,
  project_id UUID REFERENCES public.projects(id),
  mission_id UUID REFERENCES public.missions(id),
  meeting_id UUID REFERENCES public.committee_meetings(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text','file','system','mention')),
  attachments JSONB DEFAULT '[]',
  mentions JSONB DEFAULT '[]',
  reply_to UUID REFERENCES public.messages(id),
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RÉUNIONS
-- ============================================================
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.projects(id),
  mission_id UUID REFERENCES public.missions(id),
  title TEXT NOT NULL,
  description TEXT,
  organizer_id UUID REFERENCES public.profiles(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_link TEXT,
  type TEXT DEFAULT 'video' CHECK (type IN ('video','audio','in_person')),
  status TEXT DEFAULT 'scheduled',
  recording_url TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited','accepted','declined','attended')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- BUREAU À DISTANCE
-- ============================================================
CREATE TABLE public.personal_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) UNIQUE,
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 5368709120,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  sync_folder_path TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.workspace_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.personal_workspaces(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  local_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  checksum TEXT,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN (
    'synced','pending_upload','pending_download','conflict','error'
  )),
  last_modified_local TIMESTAMPTZ,
  last_modified_remote TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TIMESHEETS
-- ============================================================
CREATE TABLE public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  mission_id UUID REFERENCES public.missions(id),
  project_id UUID REFERENCES public.projects(id),
  task_id UUID REFERENCES public.tasks(id),
  date DATE NOT NULL,
  hours DECIMAL(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT,
  billable BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, task_id, date)
);

-- ============================================================
-- NOTES DE FRAIS
-- ============================================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  mission_id UUID REFERENCES public.missions(id),
  category TEXT CHECK (category IN (
    'transport','hebergement','restauration','fournitures','communication','autre'
  )),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  description TEXT,
  receipt_path TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected','reimbursed')),
  approved_by UUID REFERENCES public.profiles(id),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FACTURATION
-- ============================================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  client_id UUID REFERENCES public.clients(id),
  mission_id UUID REFERENCES public.missions(id),
  invoice_number TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'standard' CHECK (type IN ('standard','proforma','credit_note')),
  amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','sent','viewed','paid','overdue','cancelled'
  )),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  line_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SUIVI D'ACTIVITÉ
-- ============================================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  organization_id UUID REFERENCES public.organizations(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  login_at TIMESTAMPTZ DEFAULT now(),
  logout_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  ip_address INET,
  device_info JSONB DEFAULT '{}'
);

-- ============================================================
-- ÉVALUATIONS
-- ============================================================
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  reviewer_id UUID REFERENCES public.profiles(id),
  mission_id UUID REFERENCES public.missions(id),
  period_start DATE,
  period_end DATE,
  overall_rating DECIMAL(3,2),
  task_ratings_summary JSONB DEFAULT '{}',
  strengths TEXT,
  improvements TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PUBLICATIONS ET NOTES
-- ============================================================
CREATE TABLE public.publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id),
  mission_id UUID REFERENCES public.missions(id),
  author_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'note' CHECK (type IN ('note','announcement','update','decision')),
  visibility_grade INTEGER DEFAULT 8,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  project_id UUID REFERENCES public.projects(id),
  title TEXT,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- COMPÉTENCES ET DISPONIBILITÉ
-- ============================================================
CREATE TABLE public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  skill_name TEXT NOT NULL,
  level INTEGER CHECK (level BETWEEN 1 AND 5),
  certified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  date DATE NOT NULL,
  available_hours DECIMAL(4,2) DEFAULT 8,
  allocated_hours DECIMAL(4,2) DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','partially','unavailable','leave')),
  note TEXT,
  UNIQUE(user_id, date)
);

-- ============================================================
-- INVITATIONS
-- ============================================================
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id),
  role TEXT DEFAULT 'member',
  grade TEXT DEFAULT 'AUD',
  mission_id UUID REFERENCES public.missions(id),
  project_id UUID REFERENCES public.projects(id),
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','cancelled')),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SATISFACTION CLIENT
-- ============================================================
CREATE TABLE public.client_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID REFERENCES public.missions(id),
  client_id UUID REFERENCES public.clients(id),
  respondent_name TEXT,
  respondent_email TEXT,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  responses JSONB DEFAULT '{}',
  comments TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select" ON public.organizations FOR SELECT TO authenticated
  USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "org_owners_all" ON public.organizations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_same_org_select" ON public.profiles FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_org_select" ON public.clients FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "clients_org_insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "clients_org_update" ON public.clients FOR UPDATE TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Missions
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions_org_select" ON public.missions FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "missions_org_insert" ON public.missions FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "missions_org_update" ON public.missions FOR UPDATE TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "missions_org_delete" ON public.missions FOR DELETE TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'admin'));

-- Mission members
ALTER TABLE public.mission_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mission_members_select" ON public.mission_members FOR SELECT TO authenticated
  USING (mission_id IN (SELECT id FROM public.missions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "mission_members_insert" ON public.mission_members FOR INSERT TO authenticated
  WITH CHECK (mission_id IN (SELECT id FROM public.missions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_org_select" ON public.projects FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "projects_org_insert" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "projects_org_update" ON public.projects FOR UPDATE TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Project members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_members_select" ON public.project_members FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "project_members_insert" ON public.project_members FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_select" ON public.activities FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "activities_insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Task assignments
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_assignments_select" ON public.task_assignments FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM public.tasks WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))));
CREATE POLICY "task_assignments_insert" ON public.task_assignments FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM public.tasks WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))));

-- Task submissions
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_submissions_select" ON public.task_submissions FOR SELECT TO authenticated
  USING (task_id IN (SELECT id FROM public.tasks WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))));
CREATE POLICY "task_submissions_insert" ON public.task_submissions FOR INSERT TO authenticated
  WITH CHECK (task_id IN (SELECT id FROM public.tasks WHERE project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))));

-- Documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_org_select" ON public.documents FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "documents_org_insert" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "documents_org_update" ON public.documents FOR UPDATE TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Document folders
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_folders_org_select" ON public.document_folders FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "doc_folders_org_insert" ON public.document_folders FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Document shares
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_shares_select" ON public.document_shares FOR SELECT TO authenticated
  USING (shared_with = auth.uid() OR shared_by = auth.uid());
CREATE POLICY "doc_shares_insert" ON public.document_shares FOR INSERT TO authenticated
  WITH CHECK (shared_by = auth.uid());

-- Document access log
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_access_log_insert" ON public.document_access_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "doc_access_log_select" ON public.document_access_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Document templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc_templates_select" ON public.document_templates FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Committees
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "committees_select" ON public.committees FOR SELECT TO authenticated
  USING (mission_id IN (SELECT id FROM public.missions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "committees_insert" ON public.committees FOR INSERT TO authenticated
  WITH CHECK (mission_id IN (SELECT id FROM public.missions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Committee members
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "committee_members_select" ON public.committee_members FOR SELECT TO authenticated
  USING (committee_id IN (SELECT id FROM public.committees WHERE mission_id IN (SELECT id FROM public.missions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))));

-- Committee meetings
ALTER TABLE public.committee_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "committee_meetings_select" ON public.committee_meetings FOR SELECT TO authenticated
  USING (committee_id IN (SELECT id FROM public.committees WHERE mission_id IN (SELECT id FROM public.missions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))));
CREATE POLICY "committee_meetings_insert" ON public.committee_meetings FOR INSERT TO authenticated
  WITH CHECK (committee_id IN (SELECT id FROM public.committees WHERE mission_id IN (SELECT id FROM public.missions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))));

-- Mailing groups
ALTER TABLE public.mailing_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mailing_groups_select" ON public.mailing_groups FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mailing_groups_insert" ON public.mailing_groups FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Mailing recipients
ALTER TABLE public.mailing_group_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mailing_recipients_select" ON public.mailing_group_recipients FOR SELECT TO authenticated
  USING (group_id IN (SELECT id FROM public.mailing_groups WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Group emails
ALTER TABLE public.group_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_emails_select" ON public.group_emails FOR SELECT TO authenticated
  USING (group_id IN (SELECT id FROM public.mailing_groups WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "group_emails_insert" ON public.group_emails FOR INSERT TO authenticated
  WITH CHECK (sent_by = auth.uid());

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT TO authenticated
  USING (id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Conversation members
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_members_select" ON public.conversation_members FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "conv_members_insert" ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated
  USING (conversation_id IN (SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid());

-- Meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_select" ON public.meetings FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "meetings_insert" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid());

-- Meeting participants
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting_parts_select" ON public.meeting_participants FOR SELECT TO authenticated
  USING (meeting_id IN (SELECT id FROM public.meetings WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));

-- Personal workspaces
ALTER TABLE public.personal_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_own_select" ON public.personal_workspaces FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "workspace_own_insert" ON public.personal_workspaces FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "workspace_own_update" ON public.personal_workspaces FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Workspace files
ALTER TABLE public.workspace_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_files_select" ON public.workspace_files FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT id FROM public.personal_workspaces WHERE user_id = auth.uid()));
CREATE POLICY "workspace_files_insert" ON public.workspace_files FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (SELECT id FROM public.personal_workspaces WHERE user_id = auth.uid()));

-- Timesheets
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timesheets_own_select" ON public.timesheets FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "timesheets_own_insert" ON public.timesheets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "timesheets_own_update" ON public.timesheets FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_own_select" ON public.expenses FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "expenses_own_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_org_select" ON public.invoices FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "invoices_org_insert" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Activity logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs_own_select" ON public.activity_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "activity_logs_insert" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own_select" ON public.user_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "sessions_own_insert" ON public.user_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Performance reviews
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_own_select" ON public.performance_reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR reviewer_id = auth.uid());
CREATE POLICY "reviews_insert" ON public.performance_reviews FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own_select" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- Publications
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "publications_select" ON public.publications FOR SELECT TO authenticated
  USING (
    mission_id IN (SELECT id FROM public.missions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
    OR project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
  );
CREATE POLICY "publications_insert" ON public.publications FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

-- Notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_own_select" ON public.notes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (is_private = false AND project_id IN (SELECT id FROM public.projects WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))));
CREATE POLICY "notes_own_insert" ON public.notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "notes_own_update" ON public.notes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- User skills
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills_select" ON public.user_skills FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "skills_own_insert" ON public.user_skills FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User availability
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "availability_select" ON public.user_availability FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "availability_own_insert" ON public.user_availability FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "availability_own_update" ON public.user_availability FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_org_select" ON public.invitations FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "invitations_org_insert" ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (invited_by = auth.uid());

-- Client surveys
ALTER TABLE public.client_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "surveys_select" ON public.client_surveys FOR SELECT TO authenticated
  USING (mission_id IN (SELECT id FROM public.missions WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())));
CREATE POLICY "surveys_insert" ON public.client_surveys FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- ============================================================
-- INDEX POUR PERFORMANCES
-- ============================================================
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_missions_org ON public.missions(organization_id);
CREATE INDEX idx_missions_status ON public.missions(status);
CREATE INDEX idx_projects_mission ON public.projects(mission_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_task_assignments_user ON public.task_assignments(user_id);
CREATE INDEX idx_documents_project ON public.documents(project_id);
CREATE INDEX idx_documents_mission ON public.documents(mission_id);
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_date ON public.activity_logs(created_at);
CREATE INDEX idx_timesheets_user_date ON public.timesheets(user_id, date);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_workspace_files_workspace ON public.workspace_files(workspace_id);

-- Full-text search
CREATE INDEX idx_documents_fts ON public.documents USING gin(to_tsvector('french', name || ' ' || COALESCE(tags::text, '')));
CREATE INDEX idx_tasks_fts ON public.tasks USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_messages_fts ON public.messages USING gin(to_tsvector('french', content));

-- ============================================================
-- TRIGGER : auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER : updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_publications_updated_at BEFORE UPDATE ON public.publications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workspace_files_updated_at BEFORE UPDATE ON public.workspace_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
