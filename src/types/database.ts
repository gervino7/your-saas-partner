// MissionFlow Database Types
// These types mirror the Supabase schema. For auto-generated types, use @/integrations/supabase/types

export type Grade = 'DA' | 'DM' | 'CM' | 'SUP' | 'AS' | 'AUD' | 'AJ' | 'STG';
export type AppRole = 'owner' | 'admin' | 'member';

export type MissionType =
  | 'audit_financier' | 'audit_it' | 'restructuration_si' | 'conseil_management'
  | 'expertise_comptable' | 'due_diligence' | 'etude' | 'autre';

export type MissionStatus = 'draft' | 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'review' | 'completed' | 'archived';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'correction' | 'validated' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ExpenseCategory = 'transport' | 'hebergement' | 'restauration' | 'fournitures' | 'communication' | 'autre';
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
export type Currency = 'XOF' | 'XAF' | 'EUR' | 'USD';
export type MissionMemberRole = 'director' | 'chief' | 'supervisor' | 'project_lead' | 'member';
export type ProjectMemberRole = 'lead' | 'sub_lead' | 'member';
export type CommitteeType = 'copil' | 'comite_direction';
export type ConversationType = 'individual' | 'group' | 'meeting' | 'project' | 'mission';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SubmissionType = 'submission' | 'correction' | 'validation' | 'rejection';
export type MeetingType = 'video' | 'audio' | 'in_person';

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

export const MISSION_TYPE_LABELS: Record<MissionType, string> = {
  audit_financier: 'Audit financier',
  audit_it: 'Audit IT',
  restructuration_si: 'Restructuration SI',
  conseil_management: 'Conseil en management',
  expertise_comptable: 'Expertise comptable',
  due_diligence: 'Due diligence',
  etude: 'Étude',
  autre: 'Autre',
};

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  draft: 'Brouillon',
  planning: 'Planification',
  active: 'Active',
  on_hold: 'En pause',
  completed: 'Terminée',
  archived: 'Archivée',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  in_review: 'En revue',
  correction: 'Correction',
  validated: 'Validé',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
  urgent: 'Urgente',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  XOF: 'FCFA (UEMOA)',
  XAF: 'FCFA (CEMAC)',
  EUR: 'Euro',
  USD: 'Dollar US',
};
