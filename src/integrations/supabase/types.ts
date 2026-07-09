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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          atualizado_por: string | null
          chave: string
          created_at: string
          updated_at: string
          valor: Json
        }
        Insert: {
          atualizado_por?: string | null
          chave: string
          created_at?: string
          updated_at?: string
          valor?: Json
        }
        Update: {
          atualizado_por?: string | null
          chave?: string
          created_at?: string
          updated_at?: string
          valor?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          acao: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entidade: string | null
          entidade_id: string | null
          id: string
          ip: string | null
          metadados: Json
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          acao: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          ip?: string | null
          metadados?: Json
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          acao?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          ip?: string | null
          metadados?: Json
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      cortex_analises: {
        Row: {
          aluno_id: string
          criado_em: string
          criado_por: string
          eixo_cognitivo: Json
          eixo_educacional: Json
          eixo_socioemocional: Json
          fontes: Json
          id: string
          modelo_usado: string | null
          plano_acao: Json
          publico_alvo: string
          rota_roteador: string | null
        }
        Insert: {
          aluno_id: string
          criado_em?: string
          criado_por: string
          eixo_cognitivo?: Json
          eixo_educacional?: Json
          eixo_socioemocional?: Json
          fontes?: Json
          id?: string
          modelo_usado?: string | null
          plano_acao?: Json
          publico_alvo: string
          rota_roteador?: string | null
        }
        Update: {
          aluno_id?: string
          criado_em?: string
          criado_por?: string
          eixo_cognitivo?: Json
          eixo_educacional?: Json
          eixo_socioemocional?: Json
          fontes?: Json
          id?: string
          modelo_usado?: string | null
          plano_acao?: Json
          publico_alvo?: string
          rota_roteador?: string | null
        }
        Relationships: []
      }
      documento_chunks: {
        Row: {
          aluno_id: string
          criado_em: string
          criado_por: string
          documento_id: string
          embedding: string | null
          id: string
          metadados: Json | null
          ordem: number
          texto: string
        }
        Insert: {
          aluno_id: string
          criado_em?: string
          criado_por: string
          documento_id: string
          embedding?: string | null
          id?: string
          metadados?: Json | null
          ordem: number
          texto: string
        }
        Update: {
          aluno_id?: string
          criado_em?: string
          criado_por?: string
          documento_id?: string
          embedding?: string | null
          id?: string
          metadados?: Json | null
          ordem?: number
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_chunks_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_aluno"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_aluno: {
        Row: {
          aluno_id: string
          competencias: Json | null
          criado_em: string
          criado_por: string
          erro: string | null
          id: string
          mime: string | null
          modelo_usado: string | null
          nome: string
          resumo: string | null
          rota_roteador: string | null
          sensivel: boolean
          status_ingestao: string
          storage_path: string | null
          tamanho: number | null
          tipo: string
          tom_emocional: string | null
        }
        Insert: {
          aluno_id: string
          competencias?: Json | null
          criado_em?: string
          criado_por: string
          erro?: string | null
          id?: string
          mime?: string | null
          modelo_usado?: string | null
          nome: string
          resumo?: string | null
          rota_roteador?: string | null
          sensivel?: boolean
          status_ingestao?: string
          storage_path?: string | null
          tamanho?: number | null
          tipo: string
          tom_emocional?: string | null
        }
        Update: {
          aluno_id?: string
          competencias?: Json | null
          criado_em?: string
          criado_por?: string
          erro?: string | null
          id?: string
          mime?: string | null
          modelo_usado?: string | null
          nome?: string
          resumo?: string | null
          rota_roteador?: string | null
          sensivel?: boolean
          status_ingestao?: string
          storage_path?: string | null
          tamanho?: number | null
          tipo?: string
          tom_emocional?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          must_change_password: boolean
          nome: string | null
          ultimo_login: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id: string
          must_change_password?: boolean
          nome?: string | null
          ultimo_login?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          must_change_password?: boolean
          nome?: string | null
          ultimo_login?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pulse_events: {
        Row: {
          created_at: string
          event_type: string
          external_id: string | null
          id: string
          ip: string | null
          payload: Json
          processed: boolean
          received_at: string
          source: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          external_id?: string | null
          id?: string
          ip?: string | null
          payload?: Json
          processed?: boolean
          received_at?: string
          source?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          external_id?: string | null
          id?: string
          ip?: string | null
          payload?: Json
          processed?: boolean
          received_at?: string
          source?: string
          user_agent?: string | null
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
      match_documento_chunks: {
        Args: {
          p_aluno_id: string
          p_criado_por?: string
          p_match_count?: number
          p_query_embedding: string
        }
        Returns: {
          documento_id: string
          id: string
          metadados: Json
          similarity: number
          texto: string
        }[]
      }
    }
    Enums: {
      app_role: "direcao" | "coordenacao" | "professor" | "admin" | "pais"
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
      app_role: ["direcao", "coordenacao", "professor", "admin", "pais"],
    },
  },
} as const
