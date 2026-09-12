import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const TIPOS_CONTATO = ["WhatsApp", "E-mail", "Ligação Telefônica", "Reunião Presencial"] as const;
export const RESULTADOS = ["Sucesso", "Sem Resposta", "Recusa", "Remarcado"] as const;
export const CATEGORIAS_CAUSA = ["Pedagógica", "Financeira", "Familiar", "Saúde", "Outros"] as const;

const buscaSchema = z.object({ termo: z.string().max(120).optional() }).default({});

/** Busca de alunos reais da rede (nome ou matrícula) para vincular à intervenção. */
export const buscarAlunos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof buscaSchema>) => buscaSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("alunos")
      .select("id, codigo, nome, situacao, matriculas(situacao, turmas(nome, escola_id, escolas(nome)))")
      .order("nome")
      .limit(20);
    const termo = data.termo?.trim();
    if (termo) q = q.or(`nome.ilike.%${termo}%,codigo.ilike.%${termo}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((a: any) => {
      const mat = (a.matriculas ?? []).find((m: any) => m.situacao === "ativa") ?? a.matriculas?.[0];
      return {
        id: a.id as string,
        codigo: a.codigo as string,
        nome: a.nome as string,
        turma: (mat?.turmas?.nome as string) ?? null,
        escolaId: (mat?.turmas?.escola_id as string) ?? null,
        escolaNome: (mat?.turmas?.escolas?.nome as string) ?? null,
      };
    });
  });

const criarSchema = z.object({
  alunoId: z.string().uuid(),
  escolaId: z.string().uuid().nullable().optional(),
  dataIntervencao: z.string().min(10).max(10),
  tipoContato: z.enum(TIPOS_CONTATO),
  resultado: z.enum(RESULTADOS),
  categoriaCausa: z.enum(CATEGORIAS_CAUSA),
  observacoes: z.string().max(2000).optional(),
  proximosPassos: z.string().max(2000).optional(),
  responsavel: z.string().min(2).max(120),
});

/** Grava a intervenção no Core Platform e registra na auditoria. */
export const criarIntervencao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof criarSchema>) => criarSchema.parse(d))
  .handler(async ({ data, context }) => {
    let escolaId = data.escolaId ?? null;
    if (!escolaId) {
      const { data: mat } = await context.supabase
        .from("matriculas")
        .select("turmas(escola_id)")
        .eq("aluno_id", data.alunoId)
        .limit(1);
      escolaId = ((mat?.[0] as any)?.turmas?.escola_id as string) ?? null;
    }

    const { data: row, error } = await context.supabase
      .from("intervencoes")
      .insert({
        aluno_id: data.alunoId,
        escola_id: escolaId,
        data_intervencao: data.dataIntervencao,
        tipo_contato: data.tipoContato,
        resultado: data.resultado,
        categoria_causa: data.categoriaCausa,
        observacoes: data.observacoes ?? null,
        proximos_passos: data.proximosPassos ?? null,
        responsavel: data.responsavel,
        criado_por: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      acao: "retencao.intervencao.create",
      entidade: "intervencoes",
      entidade_id: row?.id ?? null,
      metadados: { aluno_id: data.alunoId, escola_id: escolaId, resultado: data.resultado },
    });

    return { ok: true, id: row?.id ?? null };
  });

const listaSchema = z
  .object({
    alunoId: z.string().uuid().optional(),
    escolaId: z.string().uuid().optional(),
    desde: z.string().max(10).optional(),
    resultado: z.string().max(40).optional(),
    causa: z.string().max(40).optional(),
    limit: z.number().min(1).max(500).default(200),
  })
  .default({ limit: 200 });

export type IntervencaoRow = {
  id: string;
  data_intervencao: string;
  tipo_contato: string;
  resultado: string;
  categoria_causa: string;
  observacoes: string | null;
  proximos_passos: string | null;
  responsavel: string;
  aluno: { id: string; nome: string; codigo: string } | null;
  escola: { id: string; nome: string } | null;
};

/** Lista intervenções por aluno e/ou unidade escolar, com filtros de período e resultado. */
export const listIntervencoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof listaSchema>) => listaSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<IntervencaoRow[]> => {
    let q = context.supabase
      .from("intervencoes")
      .select(
        "id, data_intervencao, tipo_contato, resultado, categoria_causa, observacoes, proximos_passos, responsavel, alunos(id, nome, codigo), escolas(id, nome)",
      )
      .order("data_intervencao", { ascending: false })
      .limit(data.limit);
    if (data.alunoId) q = q.eq("aluno_id", data.alunoId);
    if (data.escolaId) q = q.eq("escola_id", data.escolaId);
    if (data.desde) q = q.gte("data_intervencao", data.desde);
    if (data.resultado) q = q.eq("resultado", data.resultado);
    if (data.causa) q = q.eq("categoria_causa", data.causa);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      data_intervencao: r.data_intervencao,
      tipo_contato: r.tipo_contato,
      resultado: r.resultado,
      categoria_causa: r.categoria_causa,
      observacoes: r.observacoes,
      proximos_passos: r.proximos_passos,
      responsavel: r.responsavel,
      aluno: r.alunos ? { id: r.alunos.id, nome: r.alunos.nome, codigo: r.alunos.codigo } : null,
      escola: r.escolas ? { id: r.escolas.id, nome: r.escolas.nome } : null,
    }));
  });
