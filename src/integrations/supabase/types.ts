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
          created_at: string | null
          depth: number | null
          description: string | null
          id: string
          name: string
          order_index: number | null
          parent_id: string | null
          project_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          depth?: number | null
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          parent_id?: string | null
          project_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          depth?: number | null
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          parent_id?: string | null
          project_id?: string | null
          status?: string | null
        }
        Relationships: [
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
        ]
      }
      client_surveys: {
        Row: {
          client_id: string | null
          comments: string | null
          id: string
          mission_id: string | null
          overall_rating: number | null
          respondent_email: string | null
          respondent_name: string | null
          responses: Json | null
          submitted_at: string | null
        }
        Insert: {
          client_id?: string | null
          comments?: string | null
          id?: string
          mission_id?: string | null
          overall_rating?: number | null
          respondent_email?: string | null
          respondent_name?: string | null
          responses?: Json | null
          submitted_at?: string | null
        }
        Update: {
          client_id?: string | null
          comments?: string | null
          id?: string
          mission_id?: string | null
          overall_rating?: number | null
          respondent_email?: string | null
          respondent_name?: string | null
          responses?: Json | null
          submitted_at?: string | null
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
            foreignKeyName: "committees_secretary_id_fkey"
            columns: ["secretary_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "document_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "expenses_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      meetings: {
        Row: {
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
          scheduled_at: string
          status: string | null
          summary: string | null
          title: string
          type: string | null
        }
        Insert: {
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
          scheduled_at: string
          status?: string | null
          summary?: string | null
          title: string
          type?: string | null
        }
        Update: {
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
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          max_storage_gb: number | null
          max_users: number | null
          name: string
          settings: Json | null
          slug: string
          subscription_plan: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          max_storage_gb?: number | null
          max_users?: number | null
          name: string
          settings?: Json | null
          slug: string
          subscription_plan?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          max_storage_gb?: number | null
          max_users?: number | null
          name?: string
          settings?: Json | null
          slug?: string
          subscription_plan?: string | null
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
            foreignKeyName: "performance_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_workspaces: {
        Row: {
          created_at: string | null
          id: string
          last_sync_at: string | null
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
          settings?: Json | null
          storage_limit?: number | null
          storage_used?: number | null
          sync_enabled?: boolean | null
          sync_folder_path?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
            foreignKeyName: "task_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "timesheets_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
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
        ]
      }
      user_availability: {
        Row: {
          allocated_hours: number | null
          available_hours: number | null
          date: string
          id: string
          note: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          allocated_hours?: number | null
          available_hours?: number | null
          date: string
          id?: string
          note?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          allocated_hours?: number | null
          available_hours?: number | null
          date?: string
          id?: string
          note?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
        ]
      }
      workspace_files: {
        Row: {
          checksum: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
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
          id?: string
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
          id?: string
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
