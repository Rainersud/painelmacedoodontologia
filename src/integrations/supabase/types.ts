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
      leads: {
        Row: {
          assigned_agent_id: string | null
          converted_at: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          first_response_at: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          first_response_at?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          first_response_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
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
      app_role: "admin" | "agente"
      goal_period: "diario" | "semanal" | "mensal"
      goal_type:
        | "leads_atendidos"
        | "consultas_agendadas"
        | "taxa_conversao"
        | "taxa_comparecimento"
        | "receita"
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
      ],
      app_role: ["admin", "agente"],
      goal_period: ["diario", "semanal", "mensal"],
      goal_type: [
        "leads_atendidos",
        "consultas_agendadas",
        "taxa_conversao",
        "taxa_comparecimento",
        "receita",
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
      ],
    },
  },
} as const
