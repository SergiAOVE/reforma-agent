export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_jobs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          input: Json
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          output: Json | null
          project_id: string
          status: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          input?: Json
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          output?: Json | null
          project_id: string
          status?: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          input?: Json
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          output?: Json | null
          project_id?: string
          status?: Database["public"]["Enums"]["job_status"]
          type?: Database["public"]["Enums"]["job_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_transcriptions: {
        Row: {
          created_at: string
          created_by_job_id: string | null
          edited_transcript: string | null
          evidence_id: string
          id: string
          language: string | null
          model: string | null
          project_id: string
          provider: string | null
          raw_transcript: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_job_id?: string | null
          edited_transcript?: string | null
          evidence_id: string
          id?: string
          language?: string | null
          model?: string | null
          project_id: string
          provider?: string | null
          raw_transcript: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_job_id?: string | null
          edited_transcript?: string | null
          evidence_id?: string
          id?: string
          language?: string | null
          model?: string | null
          project_id?: string
          provider?: string | null
          raw_transcript?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_transcriptions_created_by_job_id_fkey"
            columns: ["created_by_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_transcriptions_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_transcriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          project_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_items: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          included_excluded: string | null
          notes: string | null
          project_id: string
          quantity: number | null
          source_document_id: string | null
          source_page: string | null
          status: string
          title: string
          total_amount: number | null
          trade_id: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          included_excluded?: string | null
          notes?: string | null
          project_id: string
          quantity?: number | null
          source_document_id?: string | null
          source_page?: string | null
          status?: string
          title: string
          total_amount?: number | null
          trade_id?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          included_excluded?: string | null
          notes?: string | null
          project_id?: string
          quantity?: number | null
          source_document_id?: string | null
          source_page?: string | null
          status?: string
          title?: string
          total_amount?: number | null
          trade_id?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_items_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_items_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_items_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          cost_impact: string | null
          created_at: string
          created_by: string | null
          created_by_job_id: string | null
          deadline: string | null
          description: string | null
          id: string
          options: Json | null
          priority: Database["public"]["Enums"]["priority"]
          project_id: string
          recommendation: string | null
          review_state: string
          schedule_impact: string | null
          source: string
          status: Database["public"]["Enums"]["decision_status"]
          title: string
          trade_id: string | null
          updated_at: string
          visit_id: string | null
          zone_id: string | null
        }
        Insert: {
          cost_impact?: string | null
          created_at?: string
          created_by?: string | null
          created_by_job_id?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          options?: Json | null
          priority?: Database["public"]["Enums"]["priority"]
          project_id: string
          recommendation?: string | null
          review_state?: string
          schedule_impact?: string | null
          source?: string
          status?: Database["public"]["Enums"]["decision_status"]
          title: string
          trade_id?: string | null
          updated_at?: string
          visit_id?: string | null
          zone_id?: string | null
        }
        Update: {
          cost_impact?: string | null
          created_at?: string
          created_by?: string | null
          created_by_job_id?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          options?: Json | null
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string
          recommendation?: string | null
          review_state?: string
          schedule_impact?: string | null
          source?: string
          status?: Database["public"]["Enums"]["decision_status"]
          title?: string
          trade_id?: string | null
          updated_at?: string
          visit_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_created_by_job_id_fkey"
            columns: ["created_by_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decisions_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          id: string
          mime_type: string
          notes: string | null
          original_filename: string
          project_id: string
          size_bytes: number
          storage_path: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type: string
          notes?: string | null
          original_filename: string
          project_id: string
          size_bytes: number
          storage_path: string
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string
          notes?: string | null
          original_filename?: string
          project_id?: string
          size_bytes?: number
          storage_path?: string
          title?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
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
      evidence: {
        Row: {
          created_at: string
          id: string
          manual_note: string | null
          mime_type: string
          original_filename: string
          project_id: string
          size_bytes: number
          storage_path: string
          trade_id: string | null
          type: Database["public"]["Enums"]["evidence_type"]
          updated_at: string
          uploaded_by: string | null
          visit_id: string | null
          zone_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          manual_note?: string | null
          mime_type: string
          original_filename: string
          project_id: string
          size_bytes: number
          storage_path: string
          trade_id?: string | null
          type: Database["public"]["Enums"]["evidence_type"]
          updated_at?: string
          uploaded_by?: string | null
          visit_id?: string | null
          zone_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          manual_note?: string | null
          mime_type?: string
          original_filename?: string
          project_id?: string
          size_bytes?: number
          storage_path?: string
          trade_id?: string | null
          type?: Database["public"]["Enums"]["evidence_type"]
          updated_at?: string
          uploaded_by?: string | null
          visit_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          contract_item_id: string | null
          cost_risk: string | null
          created_at: string
          created_by: string | null
          created_by_job_id: string | null
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["priority"]
          project_id: string
          review_state: string
          schedule_risk: string | null
          source: string
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          trade_id: string | null
          updated_at: string
          visit_id: string | null
          zone_id: string | null
        }
        Insert: {
          contract_item_id?: string | null
          cost_risk?: string | null
          created_at?: string
          created_by?: string | null
          created_by_job_id?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority"]
          project_id: string
          review_state?: string
          schedule_risk?: string | null
          source?: string
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          trade_id?: string | null
          updated_at?: string
          visit_id?: string | null
          zone_id?: string | null
        }
        Update: {
          contract_item_id?: string | null
          cost_risk?: string | null
          created_at?: string
          created_by?: string | null
          created_by_job_id?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string
          review_state?: string
          schedule_risk?: string | null
          source?: string
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          trade_id?: string | null
          updated_at?: string
          visit_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_contract_item_id_fkey"
            columns: ["contract_item_id"]
            isOneToOne: false
            referencedRelation: "contract_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_created_by_job_id_fkey"
            columns: ["created_by_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string
          user_id?: string
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
          address_label: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          address_label?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          address_label?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          created_at: string
          created_by: string
          general_status: string | null
          human_notes: string | null
          id: string
          primary_trade_id: string | null
          primary_zone_id: string | null
          project_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["visit_status"]
          summary: string | null
          summary_created_by_job_id: string | null
          summary_review_state: string
          summary_reviewed_at: string | null
          summary_reviewed_by: string | null
          summary_source: string
          title: string
          updated_at: string
          visit_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          general_status?: string | null
          human_notes?: string | null
          id?: string
          primary_trade_id?: string | null
          primary_zone_id?: string | null
          project_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          summary?: string | null
          summary_created_by_job_id?: string | null
          summary_review_state?: string
          summary_reviewed_at?: string | null
          summary_reviewed_by?: string | null
          summary_source?: string
          title: string
          updated_at?: string
          visit_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          general_status?: string | null
          human_notes?: string | null
          id?: string
          primary_trade_id?: string | null
          primary_zone_id?: string | null
          project_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          summary?: string | null
          summary_created_by_job_id?: string | null
          summary_review_state?: string
          summary_reviewed_at?: string | null
          summary_reviewed_by?: string | null
          summary_source?: string
          title?: string
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_primary_trade_id_fkey"
            columns: ["primary_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_primary_zone_id_fkey"
            columns: ["primary_zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_summary_created_by_job_id_fkey"
            columns: ["summary_created_by_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_summary_reviewed_by_fkey"
            columns: ["summary_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_summaries: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_job_id: string | null
          id: string
          project_id: string
          review_state: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          summary: string
          title: string
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_job_id?: string | null
          id?: string
          project_id: string
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          summary: string
          title: string
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_job_id?: string | null
          id?: string
          project_id?: string
          review_state?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          summary?: string
          title?: string
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_summaries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_summaries_created_by_job_id_fkey"
            columns: ["created_by_job_id"]
            isOneToOne: false
            referencedRelation: "agent_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_summaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_summaries_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_project_member_by_email: {
        Args: {
          p_email: string
          p_project_id: string
          p_role: Database["public"]["Enums"]["project_role"]
        }
        Returns: string
      }
      can_edit_project: { Args: { p_project_id: string }; Returns: boolean }
      claim_agent_job: {
        Args: {
          p_allowed_types?: Database["public"]["Enums"]["job_type"][]
          p_stale_after_seconds?: number
          p_worker_id: string
        }
        Returns: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          input: Json
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          output: Json | null
          project_id: string
          status: Database["public"]["Enums"]["job_status"]
          type: Database["public"]["Enums"]["job_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "agent_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_project_with_owner: {
        Args: {
          p_address_label?: string
          p_description?: string
          p_name: string
        }
        Returns: string
      }
      has_project_role: {
        Args: {
          p_project_id: string
          p_roles: Database["public"]["Enums"]["project_role"][]
        }
        Returns: boolean
      }
      is_project_creator: { Args: { p_project_id: string }; Returns: boolean }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      shares_project_with: { Args: { p_user_id: string }; Returns: boolean }
      storage_object_project_id: { Args: { p_name: string }; Returns: string }
      storage_object_visit_id: { Args: { p_name: string }; Returns: string }
    }
    Enums: {
      decision_status:
        | "ai_draft"
        | "pending"
        | "approved"
        | "rejected"
        | "superseded"
        | "closed"
      document_type:
        | "plan"
        | "quote"
        | "technical_memory"
        | "annex"
        | "invoice"
        | "warranty"
        | "change_order"
        | "other"
      evidence_type: "photo" | "audio" | "video" | "document"
      issue_status:
        | "ai_draft"
        | "open"
        | "in_review"
        | "waiting_builder"
        | "waiting_owner"
        | "resolved"
        | "closed"
        | "rejected"
      job_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      job_type:
        | "transcribe_audio"
        | "extract_visit"
        | "generate_visit_summary"
        | "suggest_issues"
        | "suggest_decisions"
        | "generate_weekly_summary"
      priority: "low" | "medium" | "high" | "critical"
      project_role: "owner" | "admin" | "editor" | "viewer"
      project_status: "active" | "paused" | "completed" | "archived"
      visit_status: "draft" | "published" | "archived"
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
      decision_status: [
        "ai_draft",
        "pending",
        "approved",
        "rejected",
        "superseded",
        "closed",
      ],
      document_type: [
        "plan",
        "quote",
        "technical_memory",
        "annex",
        "invoice",
        "warranty",
        "change_order",
        "other",
      ],
      evidence_type: ["photo", "audio", "video", "document"],
      issue_status: [
        "ai_draft",
        "open",
        "in_review",
        "waiting_builder",
        "waiting_owner",
        "resolved",
        "closed",
        "rejected",
      ],
      job_status: ["pending", "processing", "completed", "failed", "cancelled"],
      job_type: [
        "transcribe_audio",
        "extract_visit",
        "generate_visit_summary",
        "suggest_issues",
        "suggest_decisions",
        "generate_weekly_summary",
      ],
      priority: ["low", "medium", "high", "critical"],
      project_role: ["owner", "admin", "editor", "viewer"],
      project_status: ["active", "paused", "completed", "archived"],
      visit_status: ["draft", "published", "archived"],
    },
  },
} as const
