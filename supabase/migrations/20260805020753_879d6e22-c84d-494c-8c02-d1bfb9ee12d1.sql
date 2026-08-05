-- ===== Integration Hub =====
CREATE TABLE public.hub_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  camada text NOT NULL DEFAULT 'integration-hub',
  adaptador text NOT NULL,
  direcao text NOT NULL DEFAULT 'entrada' CHECK (direcao IN ('entrada','saida','bidirecional')),
  base_url text,
  auth_tipo text NOT NULL DEFAULT 'none' CHECK (auth_tipo IN ('none','api_key','bearer','basic','oauth2','mtls')),
  auth_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  parametros jsonb NOT NULL DEFAULT '{}'::jsonb,
  eventos_publicados text[] NOT NULL DEFAULT '{}',
  situacao text NOT NULL DEFAULT 'inativo' CHECK (situacao IN ('ativo','inativo','erro')),
  ultimo_teste_em timestamptz,
  ultimo_teste_status text,
  ultimo_teste_mensagem text,
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_connectors TO authenticated;
GRANT ALL ON public.hub_connectors TO service_role;
ALTER TABLE public.hub_connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_connectors_admin_all" ON public.hub_connectors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER hub_connectors_set_updated_at BEFORE UPDATE ON public.hub_connectors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.hub_connector_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id uuid NOT NULL REFERENCES public.hub_connectors(id) ON DELETE CASCADE,
  operacao text NOT NULL,
  status text NOT NULL CHECK (status IN ('sucesso','erro','aviso')),
  duracao_ms integer,
  mensagem text,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hub_connector_logs_conn_idx ON public.hub_connector_logs (connector_id, created_at DESC);
GRANT SELECT, INSERT ON public.hub_connector_logs TO authenticated;
GRANT ALL ON public.hub_connector_logs TO service_role;
ALTER TABLE public.hub_connector_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_logs_admin_select" ON public.hub_connector_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "hub_logs_admin_insert" ON public.hub_connector_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.hub_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  agregado text NOT NULL,
  agregado_id text,
  origem text NOT NULL DEFAULT 'core',
  connector_id uuid REFERENCES public.hub_connectors(id) ON DELETE SET NULL,
  correlacao_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','processando','processado','erro','descartado')),
  tentativas integer NOT NULL DEFAULT 0,
  erro text,
  publicado_por uuid REFERENCES auth.users(id),
  processado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hub_events_status_idx ON public.hub_events (status, created_at DESC);
CREATE INDEX hub_events_nome_idx ON public.hub_events (nome, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.hub_events TO authenticated;
GRANT ALL ON public.hub_events TO service_role;
ALTER TABLE public.hub_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_events_admin_all" ON public.hub_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.hub_event_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consumidor text NOT NULL,
  evento text NOT NULL,
  connector_id uuid REFERENCES public.hub_connectors(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consumidor, evento)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hub_event_subscriptions TO authenticated;
GRANT ALL ON public.hub_event_subscriptions TO service_role;
ALTER TABLE public.hub_event_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_subs_admin_all" ON public.hub_event_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER hub_subs_set_updated_at BEFORE UPDATE ON public.hub_event_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.hub_event_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.hub_events(id) ON DELETE CASCADE,
  consumidor text NOT NULL,
  status text NOT NULL CHECK (status IN ('sucesso','erro','ignorado')),
  duracao_ms integer,
  mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hub_deliveries_event_idx ON public.hub_event_deliveries (event_id, created_at DESC);
GRANT SELECT, INSERT ON public.hub_event_deliveries TO authenticated;
GRANT ALL ON public.hub_event_deliveries TO service_role;
ALTER TABLE public.hub_event_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub_deliveries_admin_select" ON public.hub_event_deliveries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "hub_deliveries_admin_insert" ON public.hub_event_deliveries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Assinaturas padrão do barramento interno
INSERT INTO public.hub_event_subscriptions (consumidor, evento) VALUES
  ('analytics', 'StudentCreated'),
  ('analytics', 'GradeUpdated'),
  ('analytics', 'SchoolCreated'),
  ('ai-services', 'StudentUpdated'),
  ('ai-services', 'GradeUpdated'),
  ('administration', 'TeacherCreated');