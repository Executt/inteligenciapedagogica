CREATE TABLE public.intervencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  escola_id uuid REFERENCES public.escolas(id) ON DELETE SET NULL,
  data_intervencao date NOT NULL DEFAULT current_date,
  tipo_contato text NOT NULL,
  resultado text NOT NULL,
  categoria_causa text NOT NULL,
  observacoes text,
  proximos_passos text,
  responsavel text NOT NULL,
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.intervencoes TO authenticated;
GRANT ALL ON public.intervencoes TO service_role;

ALTER TABLE public.intervencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intervencoes leitura equipe" ON public.intervencoes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao')
      OR public.has_role(auth.uid(),'coordenacao') OR public.has_role(auth.uid(),'professor'));

CREATE POLICY "intervencoes registro equipe" ON public.intervencoes FOR INSERT TO authenticated
  WITH CHECK (criado_por = auth.uid() AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao')
    OR public.has_role(auth.uid(),'coordenacao') OR public.has_role(auth.uid(),'professor')));

CREATE POLICY "intervencoes edicao autor ou gestao" ON public.intervencoes FOR UPDATE TO authenticated
  USING (criado_por = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'))
  WITH CHECK (criado_por = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'));

CREATE POLICY "intervencoes exclusao gestao" ON public.intervencoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'direcao'));

CREATE INDEX intervencoes_aluno_idx ON public.intervencoes (aluno_id);
CREATE INDEX intervencoes_escola_idx ON public.intervencoes (escola_id);
CREATE INDEX intervencoes_data_idx ON public.intervencoes (data_intervencao DESC);

CREATE TRIGGER intervencoes_set_updated_at BEFORE UPDATE ON public.intervencoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();