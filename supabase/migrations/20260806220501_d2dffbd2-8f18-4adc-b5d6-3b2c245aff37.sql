CREATE TABLE public.hub_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid NOT NULL REFERENCES public.hub_connectors(id) ON DELETE CASCADE,
  nome text NOT NULL,
  agregado text NOT NULL DEFAULT 'student',
  frequencia_min integer NOT NULL DEFAULT 60,
  limite_registros integer NOT NULL DEFAULT 500,
  ativo boolean NOT NULL DEFAULT true,
  proxima_execucao timestamptz,
  ultima_execucao timestamptz,
  ultimo_status text,
  ultima_mensagem text,
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_sync_jobs TO authenticated;
GRANT ALL ON public.hub_sync_jobs TO service_role;
ALTER TABLE public.hub_sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam agendamentos" ON public.hub_sync_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER hub_sync_jobs_set_updated_at BEFORE UPDATE ON public.hub_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX hub_sync_jobs_connector_idx ON public.hub_sync_jobs(connector_id);

CREATE TABLE public.hub_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.hub_sync_jobs(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES public.hub_connectors(id) ON DELETE CASCADE,
  gatilho text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'executando',
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  duracao_ms integer,
  registros_lidos integer NOT NULL DEFAULT 0,
  registros_validos integer NOT NULL DEFAULT 0,
  registros_rejeitados integer NOT NULL DEFAULT 0,
  registros_duplicados integer NOT NULL DEFAULT 0,
  eventos_publicados integer NOT NULL DEFAULT 0,
  categoria_erro text,
  mensagem text,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  reprocessa_run_id uuid REFERENCES public.hub_sync_runs(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.hub_sync_runs TO authenticated;
GRANT ALL ON public.hub_sync_runs TO service_role;
ALTER TABLE public.hub_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem execucoes" ON public.hub_sync_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins registram execucoes" ON public.hub_sync_runs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX hub_sync_runs_connector_idx ON public.hub_sync_runs(connector_id, created_at DESC);

CREATE TABLE public.hub_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid NOT NULL REFERENCES public.hub_connectors(id) ON DELETE CASCADE,
  agregado text NOT NULL DEFAULT 'student',
  campo_origem text NOT NULL,
  campo_destino text NOT NULL,
  transformacao text NOT NULL DEFAULT 'nenhuma',
  obrigatorio boolean NOT NULL DEFAULT false,
  validacao text,
  chave_deduplicacao boolean NOT NULL DEFAULT false,
  valor_padrao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connector_id, agregado, campo_destino)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_field_mappings TO authenticated;
GRANT ALL ON public.hub_field_mappings TO service_role;
ALTER TABLE public.hub_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam mapeamentos" ON public.hub_field_mappings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER hub_field_mappings_set_updated_at BEFORE UPDATE ON public.hub_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX hub_field_mappings_connector_idx ON public.hub_field_mappings(connector_id, agregado, ordem);