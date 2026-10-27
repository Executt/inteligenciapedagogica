CREATE TABLE public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  turma_id uuid references public.turmas(id) on delete set null,
  disciplina text not null,
  bimestre text not null,
  nota numeric(4,1),
  frequencia numeric(5,2),
  origem text not null default 'integration-hub',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (aluno_id, turma_id, disciplina, bimestre)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read avaliacoes"
  ON public.avaliacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin direcao write avaliacoes"
  ON public.avaliacoes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'direcao'));

CREATE POLICY "admin direcao update avaliacoes"
  ON public.avaliacoes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'direcao'));

CREATE INDEX idx_avaliacoes_aluno ON public.avaliacoes (aluno_id);
CREATE INDEX idx_avaliacoes_turma ON public.avaliacoes (turma_id);