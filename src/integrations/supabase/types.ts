export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          code: string | null
          created_at: string | null
          created_by: string | null
          depth: number | null
          description: string | null
          id: string
          name: string
          order_index: number | null
          organization_id: string | null
          parent_id: string | null
          path: string | null
          planned_end_date: string | null
          planned_start_date: string | null
          progress: number | null
          project_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          depth?: number | null
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          organization_id?: string | null
          parent_id?: string | null
          path?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          progress?: number | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          depth?: number | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          organization_id?: string | null
          parent_id?: string | null
          path?: string | null
          planned_end_date?: string | null
          planned_start_date?: string | null
          progress?: number | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          organization_id: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_reports: {
        Row: {
          active_seconds: number | null
          category_breakdown: Json | null
          created_at: string | null
          files_synced: number | null
          first_activity: string | null
          id: string
          idle_seconds: number | null
          last_activity: string | null
          organization_id: string | null
          professional_seconds: number | null
          report_date: string
          top_apps: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_seconds?: number | null
          category_breakdown?: Json | null
          created_at?: string | null
          files_synced?: number | null
          first_activity?: string | null
          id?: string
          idle_seconds?: number | null
          last_activity?: string | null
          organization_id?: string | null
          professional_seconds?: number | null
          report_date: string
          top_apps?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_seconds?: number | null
          category_breakdown?: Json | null
          created_at?: string | null
          files_synced?: number | null
          first_activity?: string | null
          id?: string
          idle_seconds?: number | null
          last_activity?: string | null
          organization_id?: string | null
          professional_seconds?: number | null
          report_date?: string
          top_apps?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_sessions: {
        Row: {
          active_seconds: number | null
          created_at: string | null
          ended_at: string | null
          id: string
          is_paused: boolean | null
          organization_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          active_seconds?: number | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          is_paused?: boolean | null
          organization_id?: string | null
          started_at: string
          user_id: string
        }
        Update: {
          active_seconds?: number | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          is_paused?: boolean | null
          organization_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_events: {
        Row: {
          authorized_by: string | null
          created_at: string | null
          destination: string | null
          event_at: string
          event_date: string
          event_type: string
          id: string
          mission_id: string | null
          note: string | null
          organization_id: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          authorized_by?: string | null
          created_at?: string | null
          destination?: string | null
          event_at?: string
          event_date?: string
          event_type: string
          id?: string
          mission_id?: string | null
          note?: string | null
          organization_id?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          authorized_by?: string | null
          created_at?: string | null
          destination?: string | null
          event_at?: string
          event_date?: string
          event_type?: string
          id?: string
          mission_id?: string | null
          note?: string | null
          organization_id?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_fiscal_profile: {
        Row: {
          assujetti_tva: boolean | null
          centre_impots: string | null
          client_id: string
          collaborateur_id: string | null
          created_at: string | null
          date_cloture: string | null
          date_entree_portefeuille: string | null
          exercice_end_month: number | null
          exercice_start_month: number | null
          forme_juridique: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          numero_contribuable: string | null
          organization_id: string | null
          regime_fiscal: string | null
          registre_commerce: string | null
          taxpayer_category: string | null
          tva_periodicite: string | null
          updated_at: string | null
        }
        Insert: {
          assujetti_tva?: boolean | null
          centre_impots?: string | null
          client_id: string
          collaborateur_id?: string | null
          created_at?: string | null
          date_cloture?: string | null
          date_entree_portefeuille?: string | null
          exercice_end_month?: number | null
          exercice_start_month?: number | null
          forme_juridique?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          numero_contribuable?: string | null
          organization_id?: string | null
          regime_fiscal?: string | null
          registre_commerce?: string | null
          taxpayer_category?: string | null
          tva_periodicite?: string | null
          updated_at?: string | null
        }
        Update: {
          assujetti_tva?: boolean | null
          centre_impots?: string | null
          client_id?: string
          collaborateur_id?: string | null
          created_at?: string | null
          date_cloture?: string | null
          date_entree_portefeuille?: string | null
          exercice_end_month?: number | null
          exercice_start_month?: number | null
          forme_juridique?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          numero_contribuable?: string | null
          organization_id?: string | null
          regime_fiscal?: string | null
          registre_commerce?: string | null
          taxpayer_category?: string | null
          tva_periodicite?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_fiscal_profile_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_fiscal_profile_collaborateur_id_fkey"
            columns: ["collaborateur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_fiscal_profile_collaborateur_id_fkey"
            columns: ["collaborateur_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_fiscal_profile_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          interaction_date: string | null
          metadata: Json | null
          mission_id: string | null
          obligation_period_id: string | null
          title: string
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          interaction_date?: string | null
          metadata?: Json | null
          mission_id?: string | null
          obligation_period_id?: string | null
          title: string
          type?: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          interaction_date?: string | null
          metadata?: Json | null
          mission_id?: string | null
          obligation_period_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_obligation_period_id_fkey"
            columns: ["obligation_period_id"]
            isOneToOne: false
            referencedRelation: "obligation_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      client_obligations: {
        Row: {
          client_id: string
          created_at: string | null
          custom_deadline_day: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          obligation_type_id: string
          organization_id: string | null
          responsible_id: string | null
          start_date: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          custom_deadline_day?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          obligation_type_id: string
          organization_id?: string | null
          responsible_id?: string | null
          start_date?: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          custom_deadline_day?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          obligation_type_id?: string
          organization_id?: string | null
          responsible_id?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_obligations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_obligations_obligation_type_id_fkey"
            columns: ["obligation_type_id"]
            isOneToOne: false
            referencedRelation: "obligation_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_obligations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_obligations_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_obligations_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_tokens: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          expires_at: string
          id: string
          is_active: boolean | null
          mission_id: string
          token: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          mission_id: string
          token: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          is_active?: boolean | null
          mission_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_tokens_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_surveys: {
        Row: {
          client_id: string | null
          comments: string | null
          communication_rating: number | null
          competence_rating: number | null
          id: string
          mission_id: string | null
          nps_score: number | null
          organization_id: string | null
          overall_rating: number | null
          quality_rating: number | null
          respondent_email: string | null
          respondent_name: string | null
          responses: Json | null
          submitted_at: string | null
          timeliness_rating: number | null
          token: string | null
          value_rating: number | null
        }
        Insert: {
          client_id?: string | null
          comments?: string | null
          communication_rating?: number | null
          competence_rating?: number | null
          id?: string
          mission_id?: string | null
          nps_score?: number | null
          organization_id?: string | null
          overall_rating?: number | null
          quality_rating?: number | null
          respondent_email?: string | null
          respondent_name?: string | null
          responses?: Json | null
          submitted_at?: string | null
          timeliness_rating?: number | null
          token?: string | null
          value_rating?: number | null
        }
        Update: {
          client_id?: string | null
          comments?: string | null
          communication_rating?: number | null
          competence_rating?: number | null
          id?: string
          mission_id?: string | null
          nps_score?: number | null
          organization_id?: string | null
          overall_rating?: number | null
          quality_rating?: number | null
          respondent_email?: string | null
          respondent_name?: string | null
          responses?: Json | null
          submitted_at?: string | null
          timeliness_rating?: number | null
          token?: string | null
          value_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_surveys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_surveys_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          id: string
          industry: string | null
          name: string
          notes: string | null
          organization_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_meetings: {
        Row: {
          agenda: string | null
          committee_id: string | null
          created_at: string | null
          created_by: string | null
          decisions: Json | null
          duration_minutes: number | null
          id: string
          location: string | null
          meeting_link: string | null
          minutes_document_id: string | null
          scheduled_at: string
          status: string | null
          title: string
        }
        Insert: {
          agenda?: string | null
          committee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          decisions?: Json | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          minutes_document_id?: string | null
          scheduled_at: string
          status?: string | null
          title: string
        }
        Update: {
          agenda?: string | null
          committee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          decisions?: Json | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          minutes_document_id?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_meetings_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_meetings_minutes_document_id_fkey"
            columns: ["minutes_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_members: {
        Row: {
          committee_id: string | null
          created_at: string | null
          external_email: string | null
          external_name: string | null
          external_phone: string | null
          id: string
          is_external: boolean | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          committee_id?: string | null
          created_at?: string | null
          external_email?: string | null
          external_name?: string | null
          external_phone?: string | null
          id?: string
          is_external?: boolean | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          committee_id?: string | null
          created_at?: string | null
          external_email?: string | null
          external_name?: string | null
          external_phone?: string | null
          id?: string
          is_external?: boolean | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          meeting_frequency: string | null
          mission_id: string | null
          name: string
          organization_id: string | null
          secretary_id: string | null
          settings: Json | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          meeting_frequency?: string | null
          mission_id?: string | null
          name: string
          organization_id?: string | null
          secretary_id?: string | null
          settings?: Json | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          meeting_frequency?: string | null
          mission_id?: string | null
          name?: string
          organization_id?: string | null
          secretary_id?: string | null
          settings?: Json | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committees_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committees_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          meeting_id: string | null
          mission_id: string | null
          name: string | null
          organization_id: string | null
          project_id: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_id?: string | null
          mission_id?: string | null
          name?: string | null
          organization_id?: string | null
          project_id?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          meeting_id?: string | null
          mission_id?: string | null
          name?: string | null
          organization_id?: string | null
          project_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "committee_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      copil_access_tokens: {
        Row: {
          committee_id: string
          created_at: string | null
          email: string
          id: string
          otp_code: string
          otp_expires_at: string
          session_expires_at: string | null
          session_token: string | null
          verified: boolean | null
        }
        Insert: {
          committee_id: string
          created_at?: string | null
          email: string
          id?: string
          otp_code: string
          otp_expires_at: string
          session_expires_at?: string | null
          session_token?: string | null
          verified?: boolean | null
        }
        Update: {
          committee_id?: string
          created_at?: string | null
          email?: string
          id?: string
          otp_code?: string
          otp_expires_at?: string
          session_expires_at?: string | null
          session_token?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "copil_access_tokens_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_rates: {
        Row: {
          created_at: string | null
          currency: string | null
          daily_rate: number
          grade: string
          id: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          daily_rate?: number
          grade: string
          id?: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          daily_rate?: number
          grade?: string
          id?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          action: string | null
          created_at: string | null
          document_id: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          organization_id: string | null
          parent_id: string | null
          project_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          organization_id?: string | null
          parent_id?: string | null
          project_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          parent_id?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_shares: {
        Row: {
          created_at: string | null
          document_id: string | null
          id: string
          permission: string | null
          shared_by: string | null
          shared_with: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          permission?: string | null
          shared_by?: string | null
          shared_with?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          id?: string
          permission?: string | null
          shared_by?: string | null
          shared_with?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          file_path: string
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_path: string
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          file_path?: string
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          activity_id: string | null
          checksum: string | null
          committee_id: string | null
          created_at: string | null
          file_path: string
          file_size: number | null
          folder_id: string | null
          id: string
          metadata: Json | null
          mime_type: string | null
          mission_id: string | null
          name: string
          organization_id: string | null
          parent_version_id: string | null
          project_id: string | null
          status: string | null
          tags: Json | null
          updated_at: string | null
          uploaded_by: string | null
          version: number | null
          visibility_grade: number | null
        }
        Insert: {
          activity_id?: string | null
          checksum?: string | null
          committee_id?: string | null
          created_at?: string | null
          file_path: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          mission_id?: string | null
          name: string
          organization_id?: string | null
          parent_version_id?: string | null
          project_id?: string | null
          status?: string | null
          tags?: Json | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
          visibility_grade?: number | null
        }
        Update: {
          activity_id?: string | null
          checksum?: string | null
          committee_id?: string | null
          created_at?: string | null
          file_path?: string
          file_size?: number | null
          folder_id?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          mission_id?: string | null
          name?: string
          organization_id?: string | null
          parent_version_id?: string | null
          project_id?: string | null
          status?: string | null
          tags?: Json | null
          updated_at?: string | null
          uploaded_by?: string | null
          version?: number | null
          visibility_grade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          date: string
          description: string | null
          id: string
          mission_id: string | null
          organization_id: string | null
          receipt_path: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          date: string
          description?: string | null
          id?: string
          mission_id?: string | null
          organization_id?: string | null
          receipt_path?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          date?: string
          description?: string | null
          id?: string
          mission_id?: string | null
          organization_id?: string | null
          receipt_path?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      group_emails: {
        Row: {
          attachments: Json | null
          body: string
          created_at: string | null
          delivery_report: Json | null
          group_id: string | null
          id: string
          sent_at: string | null
          sent_by: string | null
          status: string | null
          subject: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          created_at?: string | null
          delivery_report?: Json | null
          group_id?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          created_at?: string | null
          delivery_report?: Json | null
          group_id?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_emails_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mailing_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_emails_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_emails_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          grade: string | null
          id: string
          invited_by: string | null
          mission_id: string | null
          organization_id: string | null
          project_id: string | null
          role: string | null
          status: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          grade?: string | null
          id?: string
          invited_by?: string | null
          mission_id?: string | null
          organization_id?: string | null
          project_id?: string | null
          role?: string | null
          status?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          grade?: string | null
          id?: string
          invited_by?: string | null
          mission_id?: string | null
          organization_id?: string | null
          project_id?: string | null
          role?: string | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string
          line_items: Json | null
          mission_id: string | null
          notes: string | null
          organization_id: string | null
          paid_at: string | null
          status: string | null
          tax_amount: number | null
          total_amount: number
          type: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          line_items?: Json | null
          mission_id?: string | null
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount: number
          type?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          line_items?: Json | null
          mission_id?: string | null
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mailing_group_recipients: {
        Row: {
          created_at: string | null
          email: string
          group_id: string | null
          id: string
          is_external: boolean | null
          name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          group_id?: string | null
          id?: string
          is_external?: boolean | null
          name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          group_id?: string | null
          id?: string
          is_external?: boolean | null
          name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mailing_group_recipients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "mailing_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailing_group_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailing_group_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      mailing_groups: {
        Row: {
          committee_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
          settings: Json | null
        }
        Insert: {
          committee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          settings?: Json | null
        }
        Update: {
          committee_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mailing_groups_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailing_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailing_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailing_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          created_at: string | null
          id: string
          meeting_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          mission_id: string | null
          organization_id: string | null
          organizer_id: string | null
          project_id: string | null
          recording_url: string | null
          recurrence: string | null
          reminders: Json | null
          scheduled_at: string
          status: string | null
          summary: string | null
          title: string
          type: string | null
        }
        Insert: {
          agenda?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          mission_id?: string | null
          organization_id?: string | null
          organizer_id?: string | null
          project_id?: string | null
          recording_url?: string | null
          recurrence?: string | null
          reminders?: Json | null
          scheduled_at: string
          status?: string | null
          summary?: string | null
          title: string
          type?: string | null
        }
        Update: {
          agenda?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          mission_id?: string | null
          organization_id?: string | null
          organizer_id?: string | null
          project_id?: string | null
          recording_url?: string | null
          recurrence?: string | null
          reminders?: Json | null
          scheduled_at?: string
          status?: string | null
          summary?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          is_edited: boolean | null
          mentions: Json | null
          reply_to: string | null
          sender_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          mentions?: Json | null
          reply_to?: string | null
          sender_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          mentions?: Json | null
          reply_to?: string | null
          sender_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_members: {
        Row: {
          id: string
          joined_at: string | null
          mission_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          mission_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          mission_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_members_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          actual_end_date: string | null
          budget_amount: number | null
          budget_currency: string | null
          chief_id: string | null
          client_id: string | null
          code: string | null
          created_at: string | null
          description: string | null
          director_id: string | null
          end_date: string | null
          id: string
          name: string
          organization_id: string | null
          priority: string | null
          progress: number | null
          settings: Json | null
          start_date: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          budget_amount?: number | null
          budget_currency?: string | null
          chief_id?: string | null
          client_id?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          director_id?: string | null
          end_date?: string | null
          id?: string
          name: string
          organization_id?: string | null
          priority?: string | null
          progress?: number | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          budget_amount?: number | null
          budget_currency?: string | null
          chief_id?: string | null
          client_id?: string | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          director_id?: string | null
          end_date?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          priority?: string | null
          progress?: number | null
          settings?: Json | null
          start_date?: string | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missions_chief_id_fkey"
            columns: ["chief_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_chief_id_fkey"
            columns: ["chief_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_director_id_fkey"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_private: boolean | null
          project_id: string | null
          tags: Json | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          project_id?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          project_id?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          priority: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          priority?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          priority?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_document_types: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          label: string
          obligation_type_id: string
          organization_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          obligation_type_id: string
          organization_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          obligation_type_id?: string
          organization_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_document_types_obligation_type_id_fkey"
            columns: ["obligation_type_id"]
            isOneToOne: false
            referencedRelation: "obligation_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_document_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_documents: {
        Row: {
          created_at: string | null
          deposited_at: string | null
          deposited_by_contact: string | null
          document_id: string | null
          document_type_id: string | null
          file_name: string | null
          file_path: string | null
          id: string
          is_required: boolean | null
          label: string
          notes: string | null
          obligation_period_id: string
          organization_id: string | null
          reject_reason: string | null
          source: string | null
          status: string
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string | null
          deposited_at?: string | null
          deposited_by_contact?: string | null
          document_id?: string | null
          document_type_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_required?: boolean | null
          label: string
          notes?: string | null
          obligation_period_id: string
          organization_id?: string | null
          reject_reason?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string | null
          deposited_at?: string | null
          deposited_by_contact?: string | null
          document_id?: string | null
          document_type_id?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          is_required?: boolean | null
          label?: string
          notes?: string | null
          obligation_period_id?: string
          organization_id?: string | null
          reject_reason?: string | null
          source?: string | null
          status?: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_documents_document_type_id_fkey"
            columns: ["document_type_id"]
            isOneToOne: false
            referencedRelation: "obligation_document_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_documents_obligation_period_id_fkey"
            columns: ["obligation_period_id"]
            isOneToOne: false
            referencedRelation: "obligation_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_documents_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_documents_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_periods: {
        Row: {
          assigned_to: string | null
          client_id: string
          client_obligation_id: string | null
          created_at: string | null
          deposed_at: string | null
          deposed_by: string | null
          due_date: string
          id: string
          mission_id: string | null
          montant: number | null
          notes: string | null
          obligation_type_id: string
          organization_id: string | null
          period_end: string
          period_label: string
          period_start: string
          reference_depot: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          client_obligation_id?: string | null
          created_at?: string | null
          deposed_at?: string | null
          deposed_by?: string | null
          due_date: string
          id?: string
          mission_id?: string | null
          montant?: number | null
          notes?: string | null
          obligation_type_id: string
          organization_id?: string | null
          period_end: string
          period_label: string
          period_start: string
          reference_depot?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          client_obligation_id?: string | null
          created_at?: string | null
          deposed_at?: string | null
          deposed_by?: string | null
          due_date?: string
          id?: string
          mission_id?: string | null
          montant?: number | null
          notes?: string | null
          obligation_type_id?: string
          organization_id?: string | null
          period_end?: string
          period_label?: string
          period_start?: string
          reference_depot?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_periods_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_periods_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_periods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_periods_client_obligation_id_fkey"
            columns: ["client_obligation_id"]
            isOneToOne: false
            referencedRelation: "client_obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_periods_deposed_by_fkey"
            columns: ["deposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_periods_deposed_by_fkey"
            columns: ["deposed_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_periods_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_periods_obligation_type_id_fkey"
            columns: ["obligation_type_id"]
            isOneToOne: false
            referencedRelation: "obligation_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_types: {
        Row: {
          applies_to_regimes: string[] | null
          category: string
          code: string
          created_at: string | null
          deadline_day: number | null
          deadline_month: number | null
          deadline_offset_months: number | null
          description: string | null
          id: string
          is_active: boolean | null
          label: string
          organization_id: string | null
          periodicite: string
        }
        Insert: {
          applies_to_regimes?: string[] | null
          category?: string
          code: string
          created_at?: string | null
          deadline_day?: number | null
          deadline_month?: number | null
          deadline_offset_months?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          organization_id?: string | null
          periodicite: string
        }
        Update: {
          applies_to_regimes?: string[] | null
          category?: string
          code?: string
          created_at?: string | null
          deadline_day?: number | null
          deadline_month?: number | null
          deadline_offset_months?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          organization_id?: string | null
          periodicite?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligation_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_grades: {
        Row: {
          code: string
          created_at: string | null
          currency: string | null
          daily_rate: number | null
          id: string
          is_active: boolean | null
          label: string
          level: number
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          currency?: string | null
          daily_rate?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          level: number
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          currency?: string | null
          daily_rate?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          level?: number
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_grades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_contact: string | null
          billing_email: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          internal_notes: string | null
          is_active: boolean
          logo_url: string | null
          max_storage_gb: number | null
          max_users: number | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          subscription_plan: string | null
          support_access_enabled: boolean
          suspended_at: string | null
          suspension_reason: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_contact?: string | null
          billing_email?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          logo_url?: string | null
          max_storage_gb?: number | null
          max_users?: number | null
          name: string
          phone?: string | null
          settings?: Json | null
          slug: string
          subscription_plan?: string | null
          support_access_enabled?: boolean
          suspended_at?: string | null
          suspension_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_contact?: string | null
          billing_email?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          logo_url?: string | null
          max_storage_gb?: number | null
          max_users?: number | null
          name?: string
          phone?: string | null
          settings?: Json | null
          slug?: string
          subscription_plan?: string | null
          support_access_enabled?: boolean
          suspended_at?: string | null
          suspension_reason?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      performance_reviews: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          improvements: string | null
          mission_id: string | null
          overall_rating: number | null
          period_end: string | null
          period_start: string | null
          reviewer_id: string | null
          strengths: string | null
          task_ratings_summary: Json | null
          user_id: string | null
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          improvements?: string | null
          mission_id?: string | null
          overall_rating?: number | null
          period_end?: string | null
          period_start?: string | null
          reviewer_id?: string | null
          strengths?: string | null
          task_ratings_summary?: Json | null
          user_id?: string | null
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          improvements?: string | null
          mission_id?: string | null
          overall_rating?: number | null
          period_end?: string | null
          period_start?: string | null
          reviewer_id?: string | null
          strengths?: string | null
          task_ratings_summary?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_workspaces: {
        Row: {
          created_at: string | null
          id: string
          last_sync_at: string | null
          organization_id: string | null
          settings: Json | null
          storage_limit: number | null
          storage_used: number | null
          sync_enabled: boolean | null
          sync_folder_path: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          organization_id?: string | null
          settings?: Json | null
          storage_limit?: number | null
          storage_used?: number | null
          sync_enabled?: boolean | null
          sync_folder_path?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          organization_id?: string | null
          settings?: Json | null
          storage_limit?: number | null
          storage_used?: number | null
          sync_enabled?: boolean | null
          sync_folder_path?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_changes_log: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string | null
          effective_date: string | null
          id: string
          new_plan: string
          new_price: number | null
          old_plan: string | null
          old_price: number | null
          organization_id: string
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: string
          new_plan: string
          new_price?: number | null
          old_plan?: string | null
          old_price?: number | null
          organization_id: string
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: string
          new_plan?: string
          new_price?: number | null
          old_plan?: string | null
          old_price?: number | null
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_changes_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_changes_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_changes_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_entries: {
        Row: {
          created_at: string | null
          end_time: string | null
          entry_type: string
          id: string
          location: string | null
          meeting_id: string | null
          mission_id: string | null
          organization_id: string | null
          plan_date: string
          planned_hours: number
          project_id: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          start_time: string | null
          status: string
          task_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          entry_type?: string
          id?: string
          location?: string | null
          meeting_id?: string | null
          mission_id?: string | null
          organization_id?: string | null
          plan_date: string
          planned_hours?: number
          project_id?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          start_time?: string | null
          status?: string
          task_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          entry_type?: string
          id?: string
          location?: string | null
          meeting_id?: string | null
          mission_id?: string | null
          organization_id?: string | null
          plan_date?: string
          planned_hours?: number
          project_id?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          start_time?: string | null
          status?: string
          task_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_entries_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_entries_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_entries_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_entries_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          email: string
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          revoked_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          email: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          revoked_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          email?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          revoked_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admins_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admins_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_access_log: {
        Row: {
          action: string
          client_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string | null
          portal_user_id: string | null
        }
        Insert: {
          action: string
          client_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string | null
          portal_user_id?: string | null
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string | null
          portal_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_access_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_access_log_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invitations: {
        Row: {
          accepted_at: string | null
          client_id: string
          created_at: string | null
          email: string
          expires_at: string | null
          full_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          organization_id: string
          revoked_at: string | null
          revoked_by: string | null
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          client_id: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          organization_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          client_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          organization_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invitations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_invitations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_users: {
        Row: {
          activated_at: string | null
          client_id: string
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean
          last_seen_at: string | null
          organization_id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          client_id: string
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          client_id?: string
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          grade: string | null
          grade_level: number | null
          id: string
          is_online: boolean | null
          last_login_at: string | null
          last_seen_at: string | null
          organization_id: string | null
          phone: string | null
          skills: Json | null
          updated_at: string | null
          weekly_capacity_hours: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          grade?: string | null
          grade_level?: number | null
          id: string
          is_online?: boolean | null
          last_login_at?: string | null
          last_seen_at?: string | null
          organization_id?: string | null
          phone?: string | null
          skills?: Json | null
          updated_at?: string | null
          weekly_capacity_hours?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          grade?: string | null
          grade_level?: number | null
          id?: string
          is_online?: boolean | null
          last_login_at?: string | null
          last_seen_at?: string | null
          organization_id?: string | null
          phone?: string | null
          skills?: Json | null
          updated_at?: string | null
          weekly_capacity_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          joined_at: string | null
          permissions: Json | null
          project_id: string | null
          role: string | null
          sub_team: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          permissions?: Json | null
          project_id?: string | null
          role?: string | null
          sub_team?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          permissions?: Json | null
          project_id?: string | null
          role?: string | null
          sub_team?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_allocated: number | null
          code: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          lead_id: string | null
          mission_id: string | null
          name: string
          organization_id: string | null
          progress: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          budget_allocated?: number | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          lead_id?: string | null
          mission_id?: string | null
          name: string
          organization_id?: string | null
          progress?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          budget_allocated?: number | null
          code?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          lead_id?: string | null
          mission_id?: string | null
          name?: string
          organization_id?: string | null
          progress?: number | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          mission_id: string | null
          pinned: boolean | null
          project_id: string | null
          title: string
          type: string | null
          updated_at: string | null
          visibility_grade: number | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          mission_id?: string | null
          pinned?: boolean | null
          project_id?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          visibility_grade?: number | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          mission_id?: string | null
          pinned?: boolean | null
          project_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          visibility_grade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "publications_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      staffing_assignments: {
        Row: {
          adjustment_requested_at: string | null
          assigned_by: string | null
          chef_response: string | null
          collaborator_note: string | null
          created_at: string | null
          end_date: string | null
          id: string
          mission_id: string
          organization_id: string | null
          project_id: string | null
          responded_at: string | null
          responded_by: string | null
          revision_count: number | null
          role: string
          start_date: string
          status: string
          updated_at: string | null
          user_id: string
          weekly_hours: number | null
        }
        Insert: {
          adjustment_requested_at?: string | null
          assigned_by?: string | null
          chef_response?: string | null
          collaborator_note?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          mission_id: string
          organization_id?: string | null
          project_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          revision_count?: number | null
          role?: string
          start_date: string
          status?: string
          updated_at?: string | null
          user_id: string
          weekly_hours?: number | null
        }
        Update: {
          adjustment_requested_at?: string | null
          assigned_by?: string | null
          chef_response?: string | null
          collaborator_note?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          mission_id?: string
          organization_id?: string | null
          project_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          revision_count?: number | null
          role?: string
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staffing_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staffing_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staffing_assignments_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staffing_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staffing_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staffing_assignments_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staffing_assignments_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staffing_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staffing_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_audit_log: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "super_admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          attachments: Json | null
          comment: string | null
          created_at: string | null
          id: string
          rating: number | null
          reviewed_by: string | null
          status: string | null
          submitted_by: string | null
          task_id: string | null
          type: string | null
        }
        Insert: {
          attachments?: Json | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          reviewed_by?: string | null
          status?: string | null
          submitted_by?: string | null
          task_id?: string | null
          type?: string | null
        }
        Update: {
          attachments?: Json | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          reviewed_by?: string | null
          status?: string | null
          submitted_by?: string | null
          task_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          activity_id: string | null
          actual_hours: number | null
          compartment: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          order_index: number | null
          organization_id: string | null
          parent_task_id: string | null
          priority: string | null
          project_id: string | null
          start_date: string | null
          status: string | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          activity_id?: string | null
          actual_hours?: number | null
          compartment?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number | null
          organization_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          activity_id?: string | null
          actual_hours?: number | null
          compartment?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          order_index?: number | null
          organization_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          project_id?: string | null
          start_date?: string | null
          status?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          hours: number
          id: string
          is_billable: boolean | null
          mission_id: string | null
          organization_id: string | null
          project_id: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          status: string | null
          task_id: string | null
          updated_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          hours?: number
          id?: string
          is_billable?: boolean | null
          mission_id?: string | null
          organization_id?: string | null
          project_id?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          hours?: number
          id?: string
          is_billable?: boolean | null
          mission_id?: string | null
          organization_id?: string | null
          project_id?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string | null
          task_id?: string | null
          updated_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_by: string | null
          billable: boolean | null
          created_at: string | null
          date: string
          description: string | null
          hours: number
          id: string
          mission_id: string | null
          organization_id: string | null
          project_id: string | null
          status: string | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          approved_by?: string | null
          billable?: boolean | null
          created_at?: string | null
          date: string
          description?: string | null
          hours: number
          id?: string
          mission_id?: string | null
          organization_id?: string | null
          project_id?: string | null
          status?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          approved_by?: string | null
          billable?: boolean | null
          created_at?: string | null
          date?: string
          description?: string | null
          hours?: number
          id?: string
          mission_id?: string | null
          organization_id?: string | null
          project_id?: string | null
          status?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_availability: {
        Row: {
          allocated_hours: number | null
          available_hours: number | null
          date: string
          id: string
          note: string | null
          organization_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          allocated_hours?: number | null
          available_hours?: number | null
          date: string
          id?: string
          note?: string | null
          organization_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          allocated_hours?: number | null
          available_hours?: number | null
          date?: string
          id?: string
          note?: string | null
          organization_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_availability_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          device_info: Json | null
          duration_minutes: number | null
          id: string
          ip_address: unknown
          login_at: string | null
          logout_at: string | null
          user_id: string | null
        }
        Insert: {
          device_info?: Json | null
          duration_minutes?: number | null
          id?: string
          ip_address?: unknown
          login_at?: string | null
          logout_at?: string | null
          user_id?: string | null
        }
        Update: {
          device_info?: Json | null
          duration_minutes?: number | null
          id?: string
          ip_address?: unknown
          login_at?: string | null
          logout_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          certified: boolean | null
          created_at: string | null
          id: string
          level: number | null
          skill_name: string
          user_id: string | null
        }
        Insert: {
          certified?: boolean | null
          created_at?: string | null
          id?: string
          level?: number | null
          skill_name: string
          user_id?: string | null
        }
        Update: {
          certified?: boolean | null
          created_at?: string | null
          id?: string
          level?: number | null
          skill_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_files: {
        Row: {
          checksum: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          folder_path: string | null
          id: string
          is_folder: boolean | null
          last_modified_local: string | null
          last_modified_remote: string | null
          local_path: string | null
          mime_type: string | null
          sync_status: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          folder_path?: string | null
          id?: string
          is_folder?: boolean | null
          last_modified_local?: string | null
          last_modified_remote?: string | null
          local_path?: string | null
          mime_type?: string | null
          sync_status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          folder_path?: string | null
          id?: string
          is_folder?: boolean | null
          last_modified_local?: string | null
          last_modified_remote?: string | null
          local_path?: string | null
          mime_type?: string | null
          sync_status?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_files_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "personal_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      activity_supervision: {
        Row: {
          active_seconds: number | null
          files_synced: number | null
          full_name: string | null
          grade: string | null
          idle_seconds: number | null
          organization_id: string | null
          professional_ratio: number | null
          professional_seconds: number | null
          report_date: string | null
          top_apps: Json | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_daily: {
        Row: {
          amplitude_hours: number | null
          event_date: string | null
          first_check_in: string | null
          last_check_out: string | null
          nb_sorties: number | null
          organization_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_safe: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          grade: string | null
          grade_level: number | null
          id: string | null
          is_online: boolean | null
          last_login_at: string | null
          last_seen_at: string | null
          organization_id: string | null
          phone: string | null
          skills: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: never
          full_name?: string | null
          grade?: string | null
          grade_level?: number | null
          id?: string | null
          is_online?: boolean | null
          last_login_at?: string | null
          last_seen_at?: string | null
          organization_id?: string | null
          phone?: never
          skills?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: never
          full_name?: string | null
          grade?: string | null
          grade_level?: number | null
          id?: string | null
          is_online?: boolean | null
          last_login_at?: string | null
          last_seen_at?: string | null
          organization_id?: string | null
          phone?: never
          skills?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_access_document: {
        Args: { _doc_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_mission: {
        Args: { _mission_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_task: {
        Args: { _task_id: string; _user_id: string }
        Returns: boolean
      }
      can_create_mission: {
        Args: { _organization_id: string; _user_id: string }
        Returns: boolean
      }
      can_insert_project: {
        Args: {
          _mission_id: string
          _organization_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_see_user_info: {
        Args: { target_id: string; viewer_id: string }
        Returns: boolean
      }
      create_mission_with_members: {
        Args: {
          _budget_amount?: number
          _budget_currency?: string
          _chief_id?: string
          _client_id?: string
          _description?: string
          _director_id?: string
          _end_date?: string
          _name: string
          _priority?: string
          _start_date?: string
          _type?: string
        }
        Returns: {
          actual_end_date: string | null
          budget_amount: number | null
          budget_currency: string | null
          chief_id: string | null
          client_id: string | null
          code: string | null
          created_at: string | null
          description: string | null
          director_id: string | null
          end_date: string | null
          id: string
          name: string
          organization_id: string | null
          priority: string | null
          progress: number | null
          settings: Json | null
          start_date: string | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "missions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_organization_for_current_user: {
        Args: {
          _full_name?: string
          _max_storage_gb?: number
          _max_users?: number
          _name: string
          _phone?: string
          _settings?: Json
          _slug: string
          _subscription_plan?: string
        }
        Returns: {
          billing_contact: string | null
          billing_email: string | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          internal_notes: string | null
          is_active: boolean
          logo_url: string | null
          max_storage_gb: number | null
          max_users: number | null
          name: string
          phone: string | null
          settings: Json | null
          slug: string
          subscription_plan: string | null
          support_access_enabled: boolean
          suspended_at: string | null
          suspension_reason: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_portal_invitation: {
        Args: { _client_id: string; _email: string; _full_name?: string }
        Returns: Json
      }
      create_project_with_members: {
        Args: {
          _budget_allocated?: number
          _description?: string
          _end_date?: string
          _lead_id?: string
          _mission_id: string
          _name: string
          _start_date?: string
        }
        Returns: {
          budget_allocated: number | null
          code: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          lead_id: string | null
          mission_id: string | null
          name: string
          organization_id: string | null
          progress: number | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_portal_client: { Args: never; Returns: string }
      expire_portal_invitations: { Args: never; Returns: number }
      generate_obligation_periods: {
        Args: { _month?: number; _year: number }
        Returns: {
          created_count: number
        }[]
      }
      generate_period_documents: {
        Args: { _period_id: string }
        Returns: number
      }
      get_activity_detail: {
        Args: { _end_date?: string; _start_date?: string; _target_user: string }
        Returns: {
          active_seconds: number
          category_breakdown: Json
          files_synced: number
          first_activity: string
          idle_seconds: number
          last_activity: string
          professional_ratio: number
          professional_seconds: number
          report_date: string
          top_apps: Json
        }[]
      }
      get_activity_kpis: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: {
          active_collaborators: number
          avg_professional_ratio: number
          total_active_hours: number
          total_collaborators: number
          total_files_synced: number
        }[]
      }
      get_activity_supervision: {
        Args: { _end_date?: string; _start_date?: string }
        Returns: {
          avg_professional_ratio: number
          days_active: number
          full_name: string
          grade: string
          grade_level: number
          last_activity: string
          total_active_seconds: number
          total_files_synced: number
          total_professional_seconds: number
          user_id: string
        }[]
      }
      get_client_dossiers: {
        Args: never
        Returns: {
          client_id: string
          client_name: string
          collaborateur_name: string
          nb_a_faire: number
          nb_en_retard: number
          nb_obligations: number
          prochaine_echeance: string
          regime_fiscal: string
          sante: string
        }[]
      }
      get_client_portal_access: { Args: { _client_id: string }; Returns: Json }
      get_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          grade: string
          organization_id: string
          organization_name: string
          status: string
        }[]
      }
      get_member_removal_impact: {
        Args: { _mission_id: string; _user_id: string }
        Returns: Json
      }
      get_obligations_echeancier: {
        Args: {
          _client_id?: string
          _from?: string
          _status?: string
          _to?: string
        }
        Returns: {
          assigned_name: string
          assigned_to: string
          category: string
          client_id: string
          client_name: string
          days_left: number
          due_date: string
          id: string
          is_late: boolean
          last_reminder_at: string
          obligation_code: string
          obligation_label: string
          period_label: string
          status: string
        }[]
      }
      get_obligations_kpis: {
        Args: never
        Returns: {
          deposees_ce_mois: number
          echeance_7j: number
          en_retard: number
          pieces_attendues: number
          total_en_cours: number
        }[]
      }
      get_pending_adjustments: {
        Args: never
        Returns: {
          adjustment_requested_at: string
          collaborator_grade: string
          collaborator_name: string
          collaborator_note: string
          current_total_hours: number
          end_date: string
          id: string
          mission_id: string
          mission_name: string
          project_name: string
          revision_count: number
          role: string
          start_date: string
          user_id: string
          weekly_hours: number
        }[]
      }
      get_period_documents: { Args: { _period_id: string }; Returns: Json }
      get_plan_execution: {
        Args: { _end_date?: string; _start_date?: string; _user_id?: string }
        Returns: {
          actual_hours: number
          execution_rate: number
          full_name: string
          gap_hours: number
          mission_id: string
          mission_name: string
          planned_hours: number
          user_id: string
        }[]
      }
      get_user_conversation_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_grade_level: { Args: { _user_id: string }; Returns: number }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      get_workload: {
        Args: { _week_start?: string }
        Returns: {
          allocated_hours: number
          capacity_hours: number
          full_name: string
          grade: string
          has_leave: boolean
          is_overloaded: boolean
          load_rate: number
          planned_hours: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_creator: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_mission_member: {
        Args: { _mission_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_active: { Args: { _org_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _min_role?: string }; Returns: boolean }
      is_portal_user: { Args: never; Returns: boolean }
      log_super_admin_action: {
        Args: {
          _action: string
          _details?: Json
          _target_id: string
          _target_label?: string
          _target_type: string
        }
        Returns: undefined
      }
      portal_accept_invitation: {
        Args: { _auth_user_id: string; _token: string }
        Returns: Json
      }
      portal_toggle_access: {
        Args: { _activate: boolean; _portal_user_id: string; _reason?: string }
        Returns: Json
      }
      portal_validate_invitation: { Args: { _token: string }; Returns: Json }
      purge_old_activity_data: { Args: never; Returns: undefined }
      purge_old_attendance: { Args: never; Returns: undefined }
      remove_mission_member: {
        Args: { _mission_id: string; _reason: string; _user_id: string }
        Returns: Json
      }
      seed_obligation_documents: {
        Args: { _org_id: string }
        Returns: undefined
      }
      seed_obligation_types: { Args: { _org_id: string }; Returns: undefined }
      seed_platform_owner: { Args: { _email: string }; Returns: string }
      super_admin_change_plan: {
        Args: {
          _max_storage_gb: number
          _max_users: number
          _new_plan: string
          _new_price?: number
          _org_id: string
          _reason?: string
        }
        Returns: Json
      }
      super_admin_get_all_orgs: {
        Args: never
        Returns: {
          billing_email: string
          city: string
          client_count: number
          country: string
          created_at: string
          id: string
          is_active: boolean
          last_activity: string
          max_storage_gb: number
          max_users: number
          mission_count: number
          name: string
          slug: string
          storage_used_mb: number
          subscription_plan: string
          suspended_at: string
          trial_ends_at: string
          user_count: number
        }[]
      }
      super_admin_growth: {
        Args: { _months?: number }
        Returns: {
          cumulative_orgs: number
          new_orgs: number
          new_users: number
          period: string
        }[]
      }
      super_admin_health: {
        Args: never
        Returns: {
          alert_level: string
          org_id: string
          org_name: string
          storage_max_gb: number
          storage_pct: number
          storage_used_gb: number
          subscription_plan: string
          users_max: number
          users_pct: number
          users_used: number
        }[]
      }
      super_admin_kpis: {
        Args: never
        Returns: {
          active_orgs: number
          active_users_30d: number
          new_orgs_30d: number
          storage_total_gb: number
          suspended_orgs: number
          total_clients: number
          total_missions: number
          total_orgs: number
          total_users: number
          trial_orgs: number
        }[]
      }
      super_admin_org_detail: { Args: { _org_id: string }; Returns: Json }
      super_admin_search_users: {
        Args: { _query: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          grade: string
          grade_level: number
          id: string
          is_online: boolean
          last_seen_at: string
          organization_id: string
          organization_name: string
        }[]
      }
      super_admin_toggle_org: {
        Args: { _activate: boolean; _org_id: string; _reason?: string }
        Returns: Json
      }
      super_admin_update_org: {
        Args: {
          _billing_contact?: string
          _billing_email?: string
          _city?: string
          _country?: string
          _internal_notes?: string
          _org_id: string
          _phone?: string
          _trial_ends_at?: string
        }
        Returns: Json
      }
      upsert_activity_report: {
        Args: {
          _active_seconds: number
          _category_breakdown: Json
          _files_synced?: number
          _first_activity: string
          _idle_seconds: number
          _last_activity: string
          _professional_seconds: number
          _report_date: string
          _top_apps: Json
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "member"],
    },
  },
} as const
