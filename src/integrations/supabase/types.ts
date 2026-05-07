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
      acquisition_costs: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          reference_month: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          reference_month?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          reference_month?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          activity_type: string
          agent_id: string
          created_at: string
          description: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          title: string
        }
        Insert: {
          activity_type: string
          agent_id: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          title: string
        }
        Update: {
          activity_type?: string
          agent_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          appointments: number
          attendance: number
          clicks: number
          created_at: string
          created_by: string
          id: string
          investment: number
          is_active: boolean
          leads_generated: number
          link_url: string | null
          name: string
          platform: string
          reference_month: string
          revenue: number
          sales: number
          updated_at: string
        }
        Insert: {
          appointments?: number
          attendance?: number
          clicks?: number
          created_at?: string
          created_by: string
          id?: string
          investment?: number
          is_active?: boolean
          leads_generated?: number
          link_url?: string | null
          name: string
          platform?: string
          reference_month?: string
          revenue?: number
          sales?: number
          updated_at?: string
        }
        Update: {
          appointments?: number
          attendance?: number
          clicks?: number
          created_at?: string
          created_by?: string
          id?: string
          investment?: number
          is_active?: boolean
          leads_generated?: number
          link_url?: string | null
          name?: string
          platform?: string
          reference_month?: string
          revenue?: number
          sales?: number
          updated_at?: string
        }
        Relationships: []
      }
      agent_daily_metrics: {
        Row: {
          agent_id: string
          appointments_confirmed: number | null
          appointments_scheduled: number | null
          attended_appointments: number | null
          avg_response_time_seconds: number | null
          calls_answered: number | null
          calls_made: number | null
          closed: number | null
          created_at: string
          id: string
          leads_attended: number | null
          leads_received: number | null
          metric_date: string
          no_shows: number | null
          rescued: number | null
          revenue: number | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          appointments_confirmed?: number | null
          appointments_scheduled?: number | null
          attended_appointments?: number | null
          avg_response_time_seconds?: number | null
          calls_answered?: number | null
          calls_made?: number | null
          closed?: number | null
          created_at?: string
          id?: string
          leads_attended?: number | null
          leads_received?: number | null
          metric_date?: string
          no_shows?: number | null
          rescued?: number | null
          revenue?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          appointments_confirmed?: number | null
          appointments_scheduled?: number | null
          attended_appointments?: number | null
          avg_response_time_seconds?: number | null
          calls_answered?: number | null
          calls_made?: number | null
          closed?: number | null
          created_at?: string
          id?: string
          leads_attended?: number | null
          leads_received?: number | null
          metric_date?: string
          no_shows?: number | null
          rescued?: number | null
          revenue?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          lead_id: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["alert_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["alert_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          agent_id: string
          attended_at: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          revenue: number | null
          scheduled_at: string
          treatment_type: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          attended_at?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          revenue?: number | null
          scheduled_at: string
          treatment_type?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          attended_at?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          revenue?: number | null
          scheduled_at?: string
          treatment_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          agent_id: string
          call_type: string
          created_at: string
          duration_seconds: number | null
          id: string
          lead_id: string | null
          notes: string | null
          result: string | null
        }
        Insert: {
          agent_id: string
          call_type: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          result?: string | null
        }
        Update: {
          agent_id?: string
          call_type?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          stage_key: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          stage_key: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          stage_key?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          id: string
          period: Database["public"]["Enums"]["goal_period"]
          start_date: string
          target_value: number
          type: Database["public"]["Enums"]["goal_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          period: Database["public"]["Enums"]["goal_period"]
          start_date: string
          target_value: number
          type: Database["public"]["Enums"]["goal_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          period?: Database["public"]["Enums"]["goal_period"]
          start_date?: string
          target_value?: number
          type?: Database["public"]["Enums"]["goal_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      incentive_plans: {
        Row: {
          bonus_value: number
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          period: Database["public"]["Enums"]["goal_period"]
          target_type: string
          target_value: number
        }
        Insert: {
          bonus_value?: number
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          period: Database["public"]["Enums"]["goal_period"]
          target_type: string
          target_value: number
        }
        Update: {
          bonus_value?: number
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          period?: Database["public"]["Enums"]["goal_period"]
          target_type?: string
          target_value?: number
        }
        Relationships: []
      }
      lead_interactions: {
        Row: {
          content: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          lead_id: string
          type: Database["public"]["Enums"]["interaction_type"]
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id: string
          type: Database["public"]["Enums"]["interaction_type"]
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string
          type?: Database["public"]["Enums"]["interaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_history: {
        Row: {
          created_at: string
          duration_seconds: number | null
          entered_at: string
          exited_at: string | null
          id: string
          lead_id: string
          stage: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          lead_id: string
          stage: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          id?: string
          lead_id?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_agent_id: string | null
          attendance_discount_status: string
          budget_value: number | null
          closed_at: string | null
          completed_at: string | null
          contact_attempts: number
          converted_at: string | null
          created_at: string
          discount_percentage: number
          email: string | null
          estimated_value: number | null
          first_response_at: string | null
          id: string
          interest_product: string | null
          interest_rating: number | null
          last_interaction_at: string | null
          lead_score: number
          loss_reason: string | null
          name: string
          no_show_count: number
          notes: string | null
          payment_method: string | null
          phone: string
          rescued_at: string | null
          rmkt_entered_at: string | null
          rmkt_last_stage: string | null
          rmkt_origin_status: string | null
          rmkt_status: string
          sale_type: string | null
          scheduled_appointment_at: string | null
          score_category: string
          source: Database["public"]["Enums"]["lead_source"]
          stage_entered_at: string | null
          status: Database["public"]["Enums"]["lead_status"]
          treatment_value: number | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          attendance_discount_status?: string
          budget_value?: number | null
          closed_at?: string | null
          completed_at?: string | null
          contact_attempts?: number
          converted_at?: string | null
          created_at?: string
          discount_percentage?: number
          email?: string | null
          estimated_value?: number | null
          first_response_at?: string | null
          id?: string
          interest_product?: string | null
          interest_rating?: number | null
          last_interaction_at?: string | null
          lead_score?: number
          loss_reason?: string | null
          name: string
          no_show_count?: number
          notes?: string | null
          payment_method?: string | null
          phone: string
          rescued_at?: string | null
          rmkt_entered_at?: string | null
          rmkt_last_stage?: string | null
          rmkt_origin_status?: string | null
          rmkt_status?: string
          sale_type?: string | null
          scheduled_appointment_at?: string | null
          score_category?: string
          source?: Database["public"]["Enums"]["lead_source"]
          stage_entered_at?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          treatment_value?: number | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          attendance_discount_status?: string
          budget_value?: number | null
          closed_at?: string | null
          completed_at?: string | null
          contact_attempts?: number
          converted_at?: string | null
          created_at?: string
          discount_percentage?: number
          email?: string | null
          estimated_value?: number | null
          first_response_at?: string | null
          id?: string
          interest_product?: string | null
          interest_rating?: number | null
          last_interaction_at?: string | null
          lead_score?: number
          loss_reason?: string | null
          name?: string
          no_show_count?: number
          notes?: string | null
          payment_method?: string | null
          phone?: string
          rescued_at?: string | null
          rmkt_entered_at?: string | null
          rmkt_last_stage?: string | null
          rmkt_origin_status?: string | null
          rmkt_status?: string
          sale_type?: string | null
          scheduled_appointment_at?: string | null
          score_category?: string
          source?: Database["public"]["Enums"]["lead_source"]
          stage_entered_at?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          treatment_value?: number | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      meeting_action_plans: {
        Row: {
          completion_date: string | null
          created_at: string
          description: string
          execution_date: string | null
          id: string
          meeting_id: string
          related_metric: string | null
          responsible: string
          status: string
          updated_at: string
        }
        Insert: {
          completion_date?: string | null
          created_at?: string
          description: string
          execution_date?: string | null
          id?: string
          meeting_id: string
          related_metric?: string | null
          responsible: string
          status?: string
          updated_at?: string
        }
        Update: {
          completion_date?: string | null
          created_at?: string
          description?: string
          execution_date?: string | null
          id?: string
          meeting_id?: string
          related_metric?: string | null
          responsible?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_action_plans_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_annotations: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          meeting_id: string
          metric_key: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          meeting_id: string
          metric_key: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_id?: string
          metric_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_annotations_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_training_links: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          title: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_training_links_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string
          general_notes: string | null
          id: string
          meeting_date: string
          period_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          general_notes?: string | null
          id?: string
          meeting_date: string
          period_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          general_notes?: string | null
          id?: string
          meeting_date?: string
          period_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_settings: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      patient_triage: {
        Row: {
          address: string | null
          ashamed_to_smile: boolean | null
          birth_date: string | null
          cep: string | null
          completed_at: string | null
          cpf: string | null
          created_at: string
          credit_approved_value: number | null
          credit_capim_value: number | null
          credit_drgestao_value: number | null
          credit_maioral_value: number | null
          credit_pagmais_value: number | null
          credit_status: string | null
          desired_feeling: string | null
          desired_smile_change: string | null
          difficulty_chewing: boolean | null
          discomfort_duration: string | null
          email: string | null
          facebook: string | null
          fear_of_dentist: string | null
          filled_at: string
          filled_by: string
          full_name: string | null
          ice_cream_flavor: string | null
          id: string
          instagram: string | null
          lead_id: string
          mirror_concern: string | null
          motivation: string[] | null
          motivation_other: string | null
          nickname: string | null
          phone: string | null
          post_treatment_food: string | null
          previous_implants: boolean | null
          profession: string | null
          prosthesis_duration: string | null
          smile_discomfort_score: number | null
          triage_completed: boolean
          updated_at: string
          uses_prosthesis: boolean | null
        }
        Insert: {
          address?: string | null
          ashamed_to_smile?: boolean | null
          birth_date?: string | null
          cep?: string | null
          completed_at?: string | null
          cpf?: string | null
          created_at?: string
          credit_approved_value?: number | null
          credit_capim_value?: number | null
          credit_drgestao_value?: number | null
          credit_maioral_value?: number | null
          credit_pagmais_value?: number | null
          credit_status?: string | null
          desired_feeling?: string | null
          desired_smile_change?: string | null
          difficulty_chewing?: boolean | null
          discomfort_duration?: string | null
          email?: string | null
          facebook?: string | null
          fear_of_dentist?: string | null
          filled_at?: string
          filled_by: string
          full_name?: string | null
          ice_cream_flavor?: string | null
          id?: string
          instagram?: string | null
          lead_id: string
          mirror_concern?: string | null
          motivation?: string[] | null
          motivation_other?: string | null
          nickname?: string | null
          phone?: string | null
          post_treatment_food?: string | null
          previous_implants?: boolean | null
          profession?: string | null
          prosthesis_duration?: string | null
          smile_discomfort_score?: number | null
          triage_completed?: boolean
          updated_at?: string
          uses_prosthesis?: boolean | null
        }
        Update: {
          address?: string | null
          ashamed_to_smile?: boolean | null
          birth_date?: string | null
          cep?: string | null
          completed_at?: string | null
          cpf?: string | null
          created_at?: string
          credit_approved_value?: number | null
          credit_capim_value?: number | null
          credit_drgestao_value?: number | null
          credit_maioral_value?: number | null
          credit_pagmais_value?: number | null
          credit_status?: string | null
          desired_feeling?: string | null
          desired_smile_change?: string | null
          difficulty_chewing?: boolean | null
          discomfort_duration?: string | null
          email?: string | null
          facebook?: string | null
          fear_of_dentist?: string | null
          filled_at?: string
          filled_by?: string
          full_name?: string | null
          ice_cream_flavor?: string | null
          id?: string
          instagram?: string | null
          lead_id?: string
          mirror_concern?: string | null
          motivation?: string[] | null
          motivation_other?: string | null
          nickname?: string | null
          phone?: string | null
          post_treatment_food?: string | null
          previous_implants?: boolean | null
          profession?: string | null
          prosthesis_duration?: string | null
          smile_discomfort_score?: number | null
          triage_completed?: boolean
          updated_at?: string
          uses_prosthesis?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_triage_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          agent_id: string
          created_at: string
          due_date: string | null
          fee_amount: number
          fee_percentage: number
          gross_value: number
          id: string
          installment_number: number | null
          installments: number
          lead_id: string
          net_value: number
          notes: string | null
          paid_at: string | null
          parent_payment_id: string | null
          payment_method: string
          status: string
          total_installments: number | null
          updated_at: string
          upsell_opportunity_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          due_date?: string | null
          fee_amount?: number
          fee_percentage?: number
          gross_value?: number
          id?: string
          installment_number?: number | null
          installments?: number
          lead_id: string
          net_value?: number
          notes?: string | null
          paid_at?: string | null
          parent_payment_id?: string | null
          payment_method: string
          status?: string
          total_installments?: number | null
          updated_at?: string
          upsell_opportunity_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          due_date?: string | null
          fee_amount?: number
          fee_percentage?: number
          gross_value?: number
          id?: string
          installment_number?: number | null
          installments?: number
          lead_id?: string
          net_value?: number
          notes?: string | null
          paid_at?: string | null
          parent_payment_id?: string | null
          payment_method?: string
          status?: string
          total_installments?: number | null
          updated_at?: string
          upsell_opportunity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_parent_payment_id_fkey"
            columns: ["parent_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_upsell_opportunity_id_fkey"
            columns: ["upsell_opportunity_id"]
            isOneToOne: false
            referencedRelation: "upsell_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          attendance_discount_applied: boolean
          attendance_discount_eligible: boolean
          bonus_paid_at: string | null
          bonus_status: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          referred_lead_id: string
          referrer_lead_id: string
          reward_type: string
          reward_value: number
          updated_at: string
        }
        Insert: {
          attendance_discount_applied?: boolean
          attendance_discount_eligible?: boolean
          bonus_paid_at?: string | null
          bonus_status?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          referred_lead_id: string
          referrer_lead_id: string
          reward_type?: string
          reward_value?: number
          updated_at?: string
        }
        Update: {
          attendance_discount_applied?: boolean
          attendance_discount_eligible?: boolean
          bonus_paid_at?: string | null
          bonus_status?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          referred_lead_id?: string
          referrer_lead_id?: string
          reward_type?: string
          reward_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_lead_id_fkey"
            columns: ["referred_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_lead_id_fkey"
            columns: ["referrer_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      remarketing_entries: {
        Row: {
          created_at: string
          current_stage: string
          entered_at: string
          id: string
          is_active: boolean
          last_advanced_at: string | null
          lead_id: string
          notes: string | null
          origin_status: string | null
          phase: string
          return_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stage?: string
          entered_at?: string
          id?: string
          is_active?: boolean
          last_advanced_at?: string | null
          lead_id: string
          notes?: string | null
          origin_status?: string | null
          phase?: string
          return_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stage?: string
          entered_at?: string
          id?: string
          is_active?: boolean
          last_advanced_at?: string | null
          lead_id?: string
          notes?: string | null
          origin_status?: string | null
          phase?: string
          return_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remarketing_entries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      remarketing_logs: {
        Row: {
          action: string
          created_at: string
          from_stage: string | null
          id: string
          lead_id: string
          to_stage: string | null
          triggered_by: string
        }
        Insert: {
          action: string
          created_at?: string
          from_stage?: string | null
          id?: string
          lead_id: string
          to_stage?: string | null
          triggered_by?: string
        }
        Update: {
          action?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          lead_id?: string
          to_stage?: string | null
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "remarketing_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rmkt_copy_templates: {
        Row: {
          created_at: string
          custom_copy: string | null
          id: string
          phase: string
          stage_key: string
          suggested_copy: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          custom_copy?: string | null
          id?: string
          phase?: string
          stage_key: string
          suggested_copy?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          custom_copy?: string | null
          id?: string
          phase?: string
          stage_key?: string
          suggested_copy?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          lead_id: string | null
          priority: string | null
          reschedule_reason: string | null
          rescheduled_from_id: string | null
          response: string | null
          scheduled_at: string
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          reschedule_reason?: string | null
          rescheduled_from_id?: string | null
          response?: string | null
          scheduled_at: string
          status?: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string | null
          priority?: string | null
          reschedule_reason?: string | null
          rescheduled_from_id?: string | null
          response?: string | null
          scheduled_at?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_rescheduled_from_id_fkey"
            columns: ["rescheduled_from_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_referrals: {
        Row: {
          converted_at: string | null
          converted_lead_id: string | null
          created_at: string
          id: string
          lead_id: string
          phone: string | null
          referral_name: string
          relationship: string | null
          situation: string
          triage_id: string
          updated_at: string
        }
        Insert: {
          converted_at?: string | null
          converted_lead_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          phone?: string | null
          referral_name: string
          relationship?: string | null
          situation?: string
          triage_id: string
          updated_at?: string
        }
        Update: {
          converted_at?: string | null
          converted_lead_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          phone?: string | null
          referral_name?: string
          relationship?: string | null
          situation?: string
          triage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "triage_referrals_converted_lead_id_fkey"
            columns: ["converted_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_referrals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_referrals_triage_id_fkey"
            columns: ["triage_id"]
            isOneToOne: false
            referencedRelation: "patient_triage"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_contact_history: {
        Row: {
          agent_id: string
          contact_type: string
          created_at: string
          id: string
          notes: string | null
          opportunity_id: string
          result: string | null
        }
        Insert: {
          agent_id: string
          contact_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id: string
          result?: string | null
        }
        Update: {
          agent_id?: string
          contact_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id?: string
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upsell_contact_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "upsell_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_opportunities: {
        Row: {
          agent_id: string | null
          attempt_count: number
          closed_at: string | null
          closed_value: number | null
          contact_status: string
          created_at: string
          estimated_value: number | null
          friendly_patient: boolean
          friendly_patient_video_recorded: boolean
          friendly_patient_video_recorded_at: string | null
          gift_prosthesis_date: string | null
          gift_prosthesis_sent: boolean
          gift_prosthesis_sent_at: string | null
          gift_sent: boolean
          gift_sent_at: string | null
          gift_surgery_date: string | null
          gift_surgery_sent: boolean
          gift_surgery_sent_at: string | null
          id: string
          last_stage_change_at: string | null
          lead_id: string
          next_contact_at: string | null
          next_return_date: string | null
          notes: string | null
          purchase_count: number
          purchase_values: string | null
          return_scheduled: boolean
          status: string
          suggested_treatment: string
          treatment_category: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          attempt_count?: number
          closed_at?: string | null
          closed_value?: number | null
          contact_status?: string
          created_at?: string
          estimated_value?: number | null
          friendly_patient?: boolean
          friendly_patient_video_recorded?: boolean
          friendly_patient_video_recorded_at?: string | null
          gift_prosthesis_date?: string | null
          gift_prosthesis_sent?: boolean
          gift_prosthesis_sent_at?: string | null
          gift_sent?: boolean
          gift_sent_at?: string | null
          gift_surgery_date?: string | null
          gift_surgery_sent?: boolean
          gift_surgery_sent_at?: string | null
          id?: string
          last_stage_change_at?: string | null
          lead_id: string
          next_contact_at?: string | null
          next_return_date?: string | null
          notes?: string | null
          purchase_count?: number
          purchase_values?: string | null
          return_scheduled?: boolean
          status?: string
          suggested_treatment: string
          treatment_category?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          attempt_count?: number
          closed_at?: string | null
          closed_value?: number | null
          contact_status?: string
          created_at?: string
          estimated_value?: number | null
          friendly_patient?: boolean
          friendly_patient_video_recorded?: boolean
          friendly_patient_video_recorded_at?: string | null
          gift_prosthesis_date?: string | null
          gift_prosthesis_sent?: boolean
          gift_prosthesis_sent_at?: string | null
          gift_sent?: boolean
          gift_sent_at?: string | null
          gift_surgery_date?: string | null
          gift_surgery_sent?: boolean
          gift_surgery_sent_at?: string | null
          id?: string
          last_stage_change_at?: string | null
          lead_id?: string
          next_contact_at?: string | null
          next_return_date?: string | null
          notes?: string | null
          purchase_count?: number
          purchase_values?: string | null
          return_scheduled?: boolean
          status?: string
          suggested_treatment?: string
          treatment_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upsell_opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_treatment_suggestions: {
        Row: {
          category: string
          created_at: string
          delay_months: number
          id: string
          is_active: boolean
          priority: number
          suggested_treatment: string
          trigger_treatment: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          delay_months?: number
          id?: string
          is_active?: boolean
          priority?: number
          suggested_treatment: string
          trigger_treatment: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          delay_months?: number
          id?: string
          is_active?: boolean
          priority?: number
          suggested_treatment?: string
          trigger_treatment?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          agent_id: string | null
          content: string | null
          created_at: string
          direction: string
          id: string
          lead_id: string | null
          message_type: string
          status: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          agent_id?: string | null
          content?: string | null
          created_at?: string
          direction: string
          id?: string
          lead_id?: string | null
          message_type: string
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          agent_id?: string | null
          content?: string | null
          created_at?: string
          direction?: string
          id?: string
          lead_id?: string | null
          message_type?: string
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      alert_type:
        | "lead_nao_respondido"
        | "meta_nao_atingida"
        | "lembrete_followup"
        | "kpi_baixo"
        | "indicacao_compareceu"
        | "indicacao_converteu"
      app_role: "admin" | "agente"
      goal_period: "diario" | "semanal" | "mensal"
      goal_type:
        | "leads_atendidos"
        | "consultas_agendadas"
        | "taxa_conversao"
        | "taxa_comparecimento"
        | "receita"
        | "resgatados"
        | "fechados"
      interaction_type:
        | "whatsapp_recebido"
        | "whatsapp_enviado"
        | "ligacao_recebida"
        | "ligacao_realizada"
        | "nota"
        | "agendamento"
        | "confirmacao"
        | "lembrete"
      lead_source:
        | "whatsapp"
        | "telefone"
        | "site"
        | "indicacao"
        | "instagram"
        | "facebook"
        | "google_ads"
        | "outro"
      lead_status:
        | "novo_lead"
        | "em_atendimento"
        | "consulta_agendada"
        | "confirmado"
        | "compareceu"
        | "nao_compareceu"
        | "nao_convertido"
        | "resgatado"
        | "fechado"
        | "followup_1"
        | "followup_2"
        | "followup_3"
        | "followup_4"
        | "agendou"
        | "faltou"
        | "potencial"
        | "acompanhamento"
        | "pos_venda"
        | "sem_interesse"
        | "contatos_indicados"
        | "nutricao"
        | "descartados"
        | "orcamentos_abertos"
        | "outro_momento"
        | "indicacoes"
        | "qualificado"
        | "tratamento_andamento"
        | "concluido"
        | "quase_cliente"
        | "nao_respondeu"
        | "nao_cliente"
        | "em_contato"
        | "followup_5"
        | "followup_6"
        | "followup_7"
        | "followup_8"
        | "followup_9"
        | "followup_10"
        | "followup_11"
        | "followup_12"
        | "followup_13"
        | "followup_14"
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
      alert_type: [
        "lead_nao_respondido",
        "meta_nao_atingida",
        "lembrete_followup",
        "kpi_baixo",
        "indicacao_compareceu",
        "indicacao_converteu",
      ],
      app_role: ["admin", "agente"],
      goal_period: ["diario", "semanal", "mensal"],
      goal_type: [
        "leads_atendidos",
        "consultas_agendadas",
        "taxa_conversao",
        "taxa_comparecimento",
        "receita",
        "resgatados",
        "fechados",
      ],
      interaction_type: [
        "whatsapp_recebido",
        "whatsapp_enviado",
        "ligacao_recebida",
        "ligacao_realizada",
        "nota",
        "agendamento",
        "confirmacao",
        "lembrete",
      ],
      lead_source: [
        "whatsapp",
        "telefone",
        "site",
        "indicacao",
        "instagram",
        "facebook",
        "google_ads",
        "outro",
      ],
      lead_status: [
        "novo_lead",
        "em_atendimento",
        "consulta_agendada",
        "confirmado",
        "compareceu",
        "nao_compareceu",
        "nao_convertido",
        "resgatado",
        "fechado",
        "followup_1",
        "followup_2",
        "followup_3",
        "followup_4",
        "agendou",
        "faltou",
        "potencial",
        "acompanhamento",
        "pos_venda",
        "sem_interesse",
        "contatos_indicados",
        "nutricao",
        "descartados",
        "orcamentos_abertos",
        "outro_momento",
        "indicacoes",
        "qualificado",
        "tratamento_andamento",
        "concluido",
        "quase_cliente",
        "nao_respondeu",
        "nao_cliente",
        "em_contato",
        "followup_5",
        "followup_6",
        "followup_7",
        "followup_8",
        "followup_9",
        "followup_10",
        "followup_11",
        "followup_12",
        "followup_13",
        "followup_14",
      ],
    },
  },
} as const
