
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('direcao', 'coordenacao', 'professor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Documentos do dossiê
CREATE TABLE IF NOT EXISTS public.documentos_aluno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('imagem','pdf','texto','planilha')),
  nome text NOT NULL,
  storage_path text,
  mime text,
  tamanho bigint,
  status_ingestao text NOT NULL DEFAULT 'PENDENTE',
  modelo_usado text,
  rota_roteador text,
  sensivel boolean NOT NULL DEFAULT false,
  tom_emocional text,
  competencias jsonb DEFAULT '[]'::jsonb,
  resumo text,
  erro text,
  criado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_docs_aluno ON public.documentos_aluno(aluno_id);
CREATE INDEX IF NOT EXISTS idx_docs_criado_por ON public.documentos_aluno(criado_por);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_aluno TO authenticated;
GRANT ALL ON public.documentos_aluno TO service_role;
ALTER TABLE public.documentos_aluno ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner all docs" ON public.documentos_aluno FOR ALL TO authenticated
  USING (auth.uid() = criado_por) WITH CHECK (auth.uid() = criado_por);

-- Chunks vetoriais
CREATE TABLE IF NOT EXISTS public.documento_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES public.documentos_aluno(id) ON DELETE CASCADE,
  aluno_id text NOT NULL,
  criado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  texto text NOT NULL,
  embedding vector(1536),
  metadados jsonb DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chunks_aluno ON public.documento_chunks(aluno_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON public.documento_chunks(documento_id);
CREATE INDEX IF NOT EXISTS idx_chunks_emb ON public.documento_chunks USING hnsw (embedding vector_cosine_ops);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documento_chunks TO authenticated;
GRANT ALL ON public.documento_chunks TO service_role;
ALTER TABLE public.documento_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner all chunks" ON public.documento_chunks FOR ALL TO authenticated
  USING (auth.uid() = criado_por) WITH CHECK (auth.uid() = criado_por);

-- Análises Edu-Córtex
CREATE TABLE IF NOT EXISTS public.cortex_analises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id text NOT NULL,
  publico_alvo text NOT NULL CHECK (publico_alvo IN ('direcao','professores','pais')),
  eixo_educacional jsonb NOT NULL DEFAULT '{}'::jsonb,
  eixo_cognitivo jsonb NOT NULL DEFAULT '{}'::jsonb,
  eixo_socioemocional jsonb NOT NULL DEFAULT '{}'::jsonb,
  plano_acao jsonb NOT NULL DEFAULT '[]'::jsonb,
  fontes jsonb NOT NULL DEFAULT '[]'::jsonb,
  modelo_usado text,
  rota_roteador text,
  criado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analises_aluno ON public.cortex_analises(aluno_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cortex_analises TO authenticated;
GRANT ALL ON public.cortex_analises TO service_role;
ALTER TABLE public.cortex_analises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner all analises" ON public.cortex_analises FOR ALL TO authenticated
  USING (auth.uid() = criado_por) WITH CHECK (auth.uid() = criado_por);

-- RAG match function
CREATE OR REPLACE FUNCTION public.match_documento_chunks(
  p_aluno_id text,
  p_query_embedding vector(1536),
  p_match_count int DEFAULT 8,
  p_criado_por uuid DEFAULT NULL
) RETURNS TABLE (
  id uuid,
  documento_id uuid,
  texto text,
  metadados jsonb,
  similarity float
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.documento_id, c.texto, c.metadados,
         1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM public.documento_chunks c
  WHERE c.aluno_id = p_aluno_id
    AND (p_criado_por IS NULL OR c.criado_por = p_criado_por)
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;
