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
      alunos: {
        Row: {
          codigo: string
          created_at: string
          data_nascimento: string | null
          email_responsavel: string | null
          id: string
          metadados: Json
          nome: string
          responsavel: string | null
          situacao: string
          telefone_responsavel: string | null
          updated_at: string
        }
        Insert: {
          codigo: string
          created_at?: string
          data_nascimento?: string | null
          email_responsavel?: string | null
          id?: string
          metadados?: Json
          nome: string
          responsavel?: string | null
          situacao?: string
          telefone_responsavel?: string | null
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          data_nascimento?: string | null
          email_responsavel?: string | null
          id?: string
          metadados?: Json
          nome?: string
          responsavel?: string | null
          situacao?: string
          telefone_responsavel?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      escolas: {
        Row: {
          bairro: string | null
          cep: string | null
          codigo: string
          created_at: string
          diretor: string | null
          email: string | null
          endereco: string | null
          etapa_predominante: string
          fonte_importacao: string | null
          id: string
          inep: string | null
          metadados: Json
          municipio: string
          nome: string
          situacao: string
          telefone: string | null
          tipo_unidade: string
          uf: string
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          codigo: string
          created_at?: string
          diretor?: string | null
          email?: string | null
          endereco?: string | null
          etapa_predominante?: string
          fonte_importacao?: string | null
          id?: string
          inep?: string | null
          metadados?: Json
          municipio?: string
          nome: string
          situacao?: string
          telefone?: string | null
          tipo_unidade?: string
          uf?: string
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          codigo?: string
          created_at?: string
          diretor?: string | null
          email?: string | null
          endereco?: string | null
          etapa_predominante?: string
          fonte_importacao?: string | null
          id?: string
          inep?: string | null
          metadados?: Json
          municipio?: string
          nome?: string
          situacao?: string
          telefone?: string | null
          tipo_unidade?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      hub_connector_logs: {
        Row: {
          actor_id: string | null
          connector_id: string
          created_at: string
          detalhes: Json
          duracao_ms: number | null
          id: string
          mensagem: string | null
          operacao: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          connector_id: string
          created_at?: string
          detalhes?: Json
          duracao_ms?: number | null
          id?: string
          mensagem?: string | null
          operacao: string
          status: string
        }
        Update: {
          actor_id?: string | null
          connector_id?: string
          created_at?: string
          detalhes?: Json
          duracao_ms?: number | null
          id?: string
          mensagem?: string | null
          operacao?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_connector_logs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_connectors: {
        Row: {
          adaptador: string
          auth_config: Json
          auth_tipo: string
          base_url: string | null
          camada: string
          created_at: string
          criado_por: string | null
          descricao: string | null
          direcao: string
          eventos_publicados: string[]
          id: string
          nome: string
          parametros: Json
          situacao: string
          slug: string
          ultimo_teste_em: string | null
          ultimo_teste_mensagem: string | null
          ultimo_teste_status: string | null
          updated_at: string
        }
        Insert: {
          adaptador: string
          auth_config?: Json
          auth_tipo?: string
          base_url?: string | null
          camada?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          direcao?: string
          eventos_publicados?: string[]
          id?: string
          nome: string
          parametros?: Json
          situacao?: string
          slug: string
          ultimo_teste_em?: string | null
          ultimo_teste_mensagem?: string | null
          ultimo_teste_status?: string | null
          updated_at?: string
        }
        Update: {
          adaptador?: string
          auth_config?: Json
          auth_tipo?: string
          base_url?: string | null
          camada?: string
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          direcao?: string
          eventos_publicados?: string[]
          id?: string
          nome?: string
          parametros?: Json
          situacao?: string
          slug?: string
          ultimo_teste_em?: string | null
          ultimo_teste_mensagem?: string | null
          ultimo_teste_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hub_event_deliveries: {
        Row: {
          consumidor: string
          created_at: string
          duracao_ms: number | null
          event_id: string
          id: string
          mensagem: string | null
          status: string
        }
        Insert: {
          consumidor: string
          created_at?: string
          duracao_ms?: number | null
          event_id: string
          id?: string
          mensagem?: string | null
          status: string
        }
        Update: {
          consumidor?: string
          created_at?: string
          duracao_ms?: number | null
          event_id?: string
          id?: string
          mensagem?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_event_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "hub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_event_subscriptions: {
        Row: {
          ativo: boolean
          connector_id: string | null
          consumidor: string
          created_at: string
          evento: string
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          connector_id?: string | null
          consumidor: string
          created_at?: string
          evento: string
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          connector_id?: string | null
          consumidor?: string
          created_at?: string
          evento?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_event_subscriptions_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_events: {
        Row: {
          agregado: string
          agregado_id: string | null
          connector_id: string | null
          correlacao_id: string | null
          created_at: string
          erro: string | null
          id: string
          nome: string
          origem: string
          payload: Json
          processado_em: string | null
          publicado_por: string | null
          status: string
          tentativas: number
        }
        Insert: {
          agregado: string
          agregado_id?: string | null
          connector_id?: string | null
          correlacao_id?: string | null
          created_at?: string
          erro?: string | null
          id?: string
          nome: string
          origem?: string
          payload?: Json
          processado_em?: string | null
          publicado_por?: string | null
          status?: string
          tentativas?: number
        }
        Update: {
          agregado?: string
          agregado_id?: string | null
          connector_id?: string | null
          correlacao_id?: string | null
          created_at?: string
          erro?: string | null
          id?: string
          nome?: string
          origem?: string
          payload?: Json
          processado_em?: string | null
          publicado_por?: string | null
          status?: string
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "hub_events_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_field_mappings: {
        Row: {
          agregado: string
          campo_destino: string
          campo_origem: string
          chave_deduplicacao: boolean
          connector_id: string
          created_at: string
          id: string
          obrigatorio: boolean
          ordem: number
          transformacao: string
          updated_at: string
          validacao: string | null
          valor_padrao: string | null
        }
        Insert: {
          agregado?: string
          campo_destino: string
          campo_origem: string
          chave_deduplicacao?: boolean
          connector_id: string
          created_at?: string
          id?: string
          obrigatorio?: boolean
          ordem?: number
          transformacao?: string
          updated_at?: string
          validacao?: string | null
          valor_padrao?: string | null
        }
        Update: {
          agregado?: string
          campo_destino?: string
          campo_origem?: string
          chave_deduplicacao?: boolean
          connector_id?: string
          created_at?: string
          id?: string
          obrigatorio?: boolean
          ordem?: number
          transformacao?: string
          updated_at?: string
          validacao?: string | null
          valor_padrao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hub_field_mappings_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_sync_jobs: {
        Row: {
          agregado: string
          ativo: boolean
          connector_id: string
          created_at: string
          criado_por: string | null
          frequencia_min: number
          id: string
          limite_registros: number
          nome: string
          proxima_execucao: string | null
          ultima_execucao: string | null
          ultima_mensagem: string | null
          ultimo_status: string | null
          updated_at: string
        }
        Insert: {
          agregado?: string
          ativo?: boolean
          connector_id: string
          created_at?: string
          criado_por?: string | null
          frequencia_min?: number
          id?: string
          limite_registros?: number
          nome: string
          proxima_execucao?: string | null
          ultima_execucao?: string | null
          ultima_mensagem?: string | null
          ultimo_status?: string | null
          updated_at?: string
        }
        Update: {
          agregado?: string
          ativo?: boolean
          connector_id?: string
          created_at?: string
          criado_por?: string | null
          frequencia_min?: number
          id?: string
          limite_registros?: number
          nome?: string
          proxima_execucao?: string | null
          ultima_execucao?: string | null
          ultima_mensagem?: string | null
          ultimo_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_sync_jobs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "hub_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      hub_sync_runs: {
        Row: {
          actor_id: string | null
          categoria_erro: string | null
          connector_id: string
          created_at: string
          detalhes: Json
          duracao_ms: number | null
          eventos_publicados: number
          finalizado_em: string | null
          gatilho: string
          id: string
          iniciado_em: string
          job_id: string | null
          mensagem: string | null
          registros_duplicados: number
          registros_lidos: number
          registros_rejeitados: number
          registros_validos: number
          reprocessa_run_id: string | null
          status: string
        }
        Insert: {
          actor_id?: string | null
          categoria_erro?: string | null
          connector_id: string
          created_at?: string
          detalhes?: Json
          duracao_ms?: number | null
          eventos_publicados?: number
          finalizado_em?: string | null
          gatilho?: string
          id?: string
          iniciado_em?: string
          job_id?: string | null
          mensagem?: string | null
          registros_duplicados?: number
          registros_lidos?: number
          registros_rejeitados?: number
          registros_validos?: number
          reprocessa_run_id?: string | null
          status?: string
        }
        Update: {
          actor_id?: string | null
          categoria_erro?: string | null
          connector_id?: string
          created_at?: string
          detalhes?: Json
          duracao_ms?: number | null
          eventos_publicados?: number
          finalizado_em?: string | null
          gatilho?: string
          id?: string
          iniciado_em?: string
          job_id?: string | null
          mensagem?: string | null
          registros_duplicados?: number
          registros_lidos?: number
          registros_rejeitados?: number
          registros_validos?: number
          reprocessa_run_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hub_sync_runs_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "hub_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_sync_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hub_sync_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hub_sync_runs_reprocessa_run_id_fkey"
            columns: ["reprocessa_run_id"]
            isOneToOne: false
            referencedRelation: "hub_sync_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      importacao_inconsistencias: {
        Row: {
          created_at: string
          entidade: string
          id: string
          motivo: string
          origem: string
          registro: Json
          resolvido: boolean
          resolvido_por: string | null
          severidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entidade: string
          id?: string
          motivo: string
          origem: string
          registro?: Json
          resolvido?: boolean
          resolvido_por?: string | null
          severidade?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entidade?: string
          id?: string
          motivo?: string
          origem?: string
          registro?: Json
          resolvido?: boolean
          resolvido_por?: string | null
          severidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      matriculas: {
        Row: {
          aluno_id: string
          created_at: string
          data_matricula: string
          id: string
          numero: string | null
          situacao: string
          turma_id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data_matricula?: string
          id?: string
          numero?: string | null
          situacao?: string
          turma_id: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data_matricula?: string
          id?: string
          numero?: string | null
          situacao?: string
          turma_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          auth_origin: string
          created_at: string
          id: string
          must_change_password: boolean
          nome: string | null
          ultimo_login: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          auth_origin?: string
          created_at?: string
          id: string
          must_change_password?: boolean
          nome?: string | null
          ultimo_login?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          auth_origin?: string
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
      pulse_ingest_nonces: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          nonce: string
          request_ts: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          nonce: string
          request_ts: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          nonce?: string
          request_ts?: string
        }
        Relationships: []
      }
      servidores: {
        Row: {
          cargo: string
          created_at: string
          email: string | null
          id: string
          matricula: string
          metadados: Json
          nome: string
          situacao: string
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cargo?: string
          created_at?: string
          email?: string | null
          id?: string
          matricula: string
          metadados?: Json
          nome: string
          situacao?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cargo?: string
          created_at?: string
          email?: string | null
          id?: string
          matricula?: string
          metadados?: Json
          nome?: string
          situacao?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano_letivo: number
          ano_serie: string | null
          capacidade: number | null
          codigo: string | null
          created_at: string
          escola_id: string
          etapa: string
          id: string
          nome: string
          situacao: string
          turno: string
          updated_at: string
        }
        Insert: {
          ano_letivo?: number
          ano_serie?: string | null
          capacidade?: number | null
          codigo?: string | null
          created_at?: string
          escola_id: string
          etapa?: string
          id?: string
          nome: string
          situacao?: string
          turno?: string
          updated_at?: string
        }
        Update: {
          ano_letivo?: number
          ano_serie?: string | null
          capacidade?: number | null
          codigo?: string | null
          created_at?: string
          escola_id?: string
          etapa?: string
          id?: string
          nome?: string
          situacao?: string
          turno?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
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
      vinculos_servidor: {
        Row: {
          carga_horaria: number | null
          created_at: string
          disciplina_codigo: string | null
          escola_id: string
          id: string
          servidor_id: string
          situacao: string
          updated_at: string
        }
        Insert: {
          carga_horaria?: number | null
          created_at?: string
          disciplina_codigo?: string | null
          escola_id: string
          id?: string
          servidor_id: string
          situacao?: string
          updated_at?: string
        }
        Update: {
          carga_horaria?: number | null
          created_at?: string
          disciplina_codigo?: string | null
          escola_id?: string
          id?: string
          servidor_id?: string
          situacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vinculos_servidor_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_servidor_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
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
      purge_pulse_nonces: { Args: never; Returns: undefined }
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
