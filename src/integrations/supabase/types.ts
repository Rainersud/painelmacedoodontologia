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
          closed_at: string | null
          completed_at: string | null
          converted_at: string | null
          created_at: string
          discount_percentage: number
          email: string | null
          estimated_value: number | null
          first_response_at: string | null
          id: string
          interest_product: string | null
          interest_rating: number | null
          name: string
          no_show_count: number
          notes: string | null
          payment_method: string | null
          phone: string
          rescued_at: string | null
          scheduled_appointment_at: string | null
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
          closed_at?: string | null
          completed_at?: string | null
          converted_at?: string | null
          created_at?: string
          discount_percentage?: number
          email?: string | null
          estimated_value?: number | null
          first_response_at?: string | null
          id?: string
          interest_product?: string | null
          interest_rating?: number | null
          name: string
          no_show_count?: number
          notes?: string | null
          payment_method?: string | null
          phone: string
          rescued_at?: string | null
          scheduled_appointment_at?: string | null
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
          closed_at?: string | null
          completed_at?: string | null
          converted_at?: string | null
          created_at?: string
          discount_percentage?: number
          email?: string | null
          estimated_value?: number | null
          first_response_at?: string | null
          id?: string
          interest_product?: string | null
          interest_rating?: number | null
          name?: string
          no_show_count?: number
          notes?: string | null
          payment_method?: string | null
          phone?: string
          rescued_at?: string | null
          scheduled_appointment_at?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          stage_entered_at?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          treatment_value?: number | null
          updated_at?: string
          whatsapp?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
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
      tasks: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          lead_id: string | null
          priority: string | null
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
        ]
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
      ],
    },
  },
} as const
