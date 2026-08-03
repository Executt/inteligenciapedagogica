-- ============================================================
-- Core Platform (Master Data) — aditivo. Nada existente é alterado.
-- ============================================================

-- Origem da autenticação (aditivo; Root preservado)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_origin text NOT NULL DEFAULT 'LOCAL';

-- ---------------- escolas ----------------
CREATE TABLE public.escolas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo_unidade text NOT NULL DEFAULT 'EM',
  etapa_predominante text NOT NULL DEFAULT 'fundamental',
  inep text,
  endereco text,
  bairro text,
  municipio text NOT NULL DEFAULT 'Maricá',
  uf text NOT NULL DEFAULT 'RJ',
  cep text,
  telefone text,
  email text,
  diretor text,
  situacao text NOT NULL DEFAULT 'ativa',
  fonte_importacao text,
  metadados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escolas TO authenticated;
GRANT ALL ON public.escolas TO service_role;
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escolas leitura autenticada" ON public.escolas FOR SELECT TO authenticated USING (true);
CREATE POLICY "escolas gestao admin" ON public.escolas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'));
CREATE TRIGGER escolas_set_updated_at BEFORE UPDATE ON public.escolas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX escolas_tipo_idx ON public.escolas (tipo_unidade);
CREATE INDEX escolas_bairro_idx ON public.escolas (bairro);

-- ---------------- turmas ----------------
CREATE TABLE public.turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  codigo text,
  nome text NOT NULL,
  etapa text NOT NULL DEFAULT 'fundamental',
  ano_serie text,
  turno text NOT NULL DEFAULT 'manha',
  ano_letivo integer NOT NULL DEFAULT date_part('year', now())::int,
  capacidade integer,
  situacao text NOT NULL DEFAULT 'ativa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escola_id, nome, ano_letivo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turmas TO authenticated;
GRANT ALL ON public.turmas TO service_role;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turmas leitura autenticada" ON public.turmas FOR SELECT TO authenticated USING (true);
CREATE POLICY "turmas gestao admin" ON public.turmas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao') OR public.has_role(auth.uid(),'coordenacao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao') OR public.has_role(auth.uid(),'coordenacao'));
CREATE TRIGGER turmas_set_updated_at BEFORE UPDATE ON public.turmas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX turmas_escola_idx ON public.turmas (escola_id);

-- ---------------- alunos ----------------
CREATE TABLE public.alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  data_nascimento date,
  responsavel text,
  telefone_responsavel text,
  email_responsavel text,
  situacao text NOT NULL DEFAULT 'ativo',
  metadados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO authenticated;
GRANT ALL ON public.alunos TO service_role;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alunos leitura equipe" ON public.alunos FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao')
      OR public.has_role(auth.uid(),'coordenacao') OR public.has_role(auth.uid(),'professor'));
CREATE POLICY "alunos gestao admin" ON public.alunos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao') OR public.has_role(auth.uid(),'coordenacao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao') OR public.has_role(auth.uid(),'coordenacao'));
CREATE TRIGGER alunos_set_updated_at BEFORE UPDATE ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- matriculas ----------------
CREATE TABLE public.matriculas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  numero text,
  data_matricula date NOT NULL DEFAULT current_date,
  situacao text NOT NULL DEFAULT 'ativa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, turma_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matriculas TO authenticated;
GRANT ALL ON public.matriculas TO service_role;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matriculas leitura equipe" ON public.matriculas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao')
      OR public.has_role(auth.uid(),'coordenacao') OR public.has_role(auth.uid(),'professor'));
CREATE POLICY "matriculas gestao admin" ON public.matriculas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao') OR public.has_role(auth.uid(),'coordenacao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao') OR public.has_role(auth.uid(),'coordenacao'));
CREATE TRIGGER matriculas_set_updated_at BEFORE UPDATE ON public.matriculas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- servidores ----------------
CREATE TABLE public.servidores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula text NOT NULL UNIQUE,
  nome text NOT NULL,
  email text,
  telefone text,
  cargo text NOT NULL DEFAULT 'professor',
  situacao text NOT NULL DEFAULT 'ativo',
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servidores TO authenticated;
GRANT ALL ON public.servidores TO service_role;
ALTER TABLE public.servidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servidores leitura equipe" ON public.servidores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao')
      OR public.has_role(auth.uid(),'coordenacao') OR user_id = auth.uid());
CREATE POLICY "servidores gestao admin" ON public.servidores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'));
CREATE TRIGGER servidores_set_updated_at BEFORE UPDATE ON public.servidores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- vinculos_servidor (N unidades x N disciplinas) ----------------
CREATE TABLE public.vinculos_servidor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL REFERENCES public.servidores(id) ON DELETE CASCADE,
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  disciplina_codigo text,
  carga_horaria integer,
  situacao text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (servidor_id, escola_id, disciplina_codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vinculos_servidor TO authenticated;
GRANT ALL ON public.vinculos_servidor TO service_role;
ALTER TABLE public.vinculos_servidor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vinculos leitura autenticada" ON public.vinculos_servidor FOR SELECT TO authenticated USING (true);
CREATE POLICY "vinculos gestao admin" ON public.vinculos_servidor FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'));
CREATE TRIGGER vinculos_servidor_set_updated_at BEFORE UPDATE ON public.vinculos_servidor
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------- fila de inconsistências de importação ----------------
CREATE TABLE public.importacao_inconsistencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade text NOT NULL,
  origem text NOT NULL,
  registro jsonb NOT NULL DEFAULT '{}'::jsonb,
  motivo text NOT NULL,
  severidade text NOT NULL DEFAULT 'aviso',
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.importacao_inconsistencias TO authenticated;
GRANT ALL ON public.importacao_inconsistencias TO service_role;
ALTER TABLE public.importacao_inconsistencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inconsistencias admin" ON public.importacao_inconsistencias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'));
CREATE TRIGGER importacao_inconsistencias_set_updated_at BEFORE UPDATE ON public.importacao_inconsistencias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();