import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Row = {
  data_intervencao: string;
  tipo_contato: string;
  resultado: string;
  categoria_causa: string;
  responsavel: string;
  aluno_id: string;
  escola_id: string | null;
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function mesLabel(iso: string) {
  const m = Number(iso.slice(5, 7)) - 1;
  return MESES[m] ?? iso.slice(5, 7);
}

function agrupar<T extends string>(rows: Row[], key: (r: Row) => T) {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const k = key(r);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function pct(parte: number, total: number) {
  return total > 0 ? Number(((parte / total) * 100).toFixed(1)) : 0;
}

/** Indicadores consolidados da rede, calculados a partir das intervenções e matrículas reais. */
export const getRetencaoIndicadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const hoje = new Date();
    const inicioSerie = new Date(hoje.getFullYear(), hoje.getMonth() - 7, 1).toISOString().slice(0, 10);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
    const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().slice(0, 10);

    const [{ data: intRows, error: intErr }, { data: matRows, error: matErr }, { data: escolas, error: escErr }] =
      await Promise.all([
        context.supabase
          .from("intervencoes")
          .select("data_intervencao, tipo_contato, resultado, categoria_causa, responsavel, aluno_id, escola_id")
          .gte("data_intervencao", inicioSerie)
          .limit(5000),
        context.supabase.from("matriculas").select("situacao, turmas(escola_id)").limit(20000),
        context.supabase.from("escolas").select("id, nome").order("nome"),
      ]);
    if (intErr) throw new Error(intErr.message);
    if (matErr) throw new Error(matErr.message);
    if (escErr) throw new Error(escErr.message);

    const rows = (intRows ?? []) as Row[];
    const nomeEscola = new Map((escolas ?? []).map((e: any) => [e.id as string, e.nome as string]));

    const doMes = rows.filter((r) => r.data_intervencao >= inicioMes);
    const doMesAnterior = rows.filter(
      (r) => r.data_intervencao >= inicioMesAnterior && r.data_intervencao < inicioMes,
    );

    const matriculas = (matRows ?? []) as any[];
    const evadidos = matriculas.filter((m) => ["evadida", "evadido", "cancelada", "transferida"].includes(m.situacao));
    const taxaEvasao = pct(evadidos.length, matriculas.length);

    const alunosRisco = new Set(rows.filter((r) => r.resultado !== "Sucesso").map((r) => r.aluno_id)).size;
    const efetividade = pct(rows.filter((r) => r.resultado === "Sucesso").length, rows.length);

    // Série mensal dos últimos 8 meses
    const serie: { mes: string; intervencoes: number; sucesso: number; efetividade: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const prefix = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
      const doPeriodo = rows.filter((r) => r.data_intervencao.startsWith(prefix));
      const sucesso = doPeriodo.filter((r) => r.resultado === "Sucesso").length;
      serie.push({
        mes: mesLabel(`${prefix}-01`),
        intervencoes: doPeriodo.length,
        sucesso,
        efetividade: pct(sucesso, doPeriodo.length),
      });
    }

    const causas = Object.entries(agrupar(rows, (r) => r.categoria_causa))
      .map(([causa, casos]) => ({ causa, casos }))
      .sort((a, b) => b.casos - a.casos);

    const canaisMap = rows.reduce<Record<string, { sucesso: number; semResposta: number }>>((acc, r) => {
      const k = r.tipo_contato;
      acc[k] = acc[k] ?? { sucesso: 0, semResposta: 0 };
      if (r.resultado === "Sucesso") acc[k].sucesso += 1;
      else acc[k].semResposta += 1;
      return acc;
    }, {});
    const canais = Object.entries(canaisMap).map(([canal, v]) => ({ canal, ...v }));

    const porEscolaMap = rows.reduce<Record<string, { total: number; sucesso: number; alunos: Set<string> }>>(
      (acc, r) => {
        const k = r.escola_id ?? "sem-unidade";
        acc[k] = acc[k] ?? { total: 0, sucesso: 0, alunos: new Set() };
        acc[k].total += 1;
        if (r.resultado === "Sucesso") acc[k].sucesso += 1;
        else acc[k].alunos.add(r.aluno_id);
        return acc;
      },
      {},
    );
    const porEscola = Object.entries(porEscolaMap)
      .map(([id, v]) => ({
        escolaId: id === "sem-unidade" ? null : id,
        escola: nomeEscola.get(id) ?? "Sem unidade vinculada",
        intervencoes: v.total,
        risco: v.alunos.size,
        efetividade: pct(v.sucesso, v.total),
      }))
      .sort((a, b) => b.risco - a.risco || b.intervencoes - a.intervencoes)
      .slice(0, 12);

    return {
      kpis: {
        taxaEvasao,
        alunosRisco,
        intervencoesMes: doMes.length,
        intervencoesMesDelta: doMes.length - doMesAnterior.length,
        efetividade,
        totalIntervencoes: rows.length,
      },
      serie,
      causas,
      canais,
      porEscola,
    };
  });

const escolaSchema = z.object({ escolaId: z.string().uuid() });

/** Retenção detalhada de uma unidade escolar. */
export const getEscolaRetencao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof escolaSchema>) => escolaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: escola, error: escErr }, { data: intRows, error: intErr }, { data: turmas, error: turErr }] =
      await Promise.all([
        context.supabase
          .from("escolas")
          .select("id, nome, tipo_unidade, bairro, municipio, situacao, diretor")
          .eq("id", data.escolaId)
          .maybeSingle(),
        context.supabase
          .from("intervencoes")
          .select(
            "id, data_intervencao, tipo_contato, resultado, categoria_causa, responsavel, aluno_id, observacoes, proximos_passos, alunos(id, nome, codigo)",
          )
          .eq("escola_id", data.escolaId)
          .order("data_intervencao", { ascending: false })
          .limit(1000),
        context.supabase.from("turmas").select("id, nome, matriculas(id, situacao)").eq("escola_id", data.escolaId),
      ]);
    if (escErr) throw new Error(escErr.message);
    if (intErr) throw new Error(intErr.message);
    if (turErr) throw new Error(turErr.message);

    const rows = (intRows ?? []) as any[];
    const matriculas = (turmas ?? []).flatMap((t: any) => t.matriculas ?? []);
    const sucesso = rows.filter((r) => r.resultado === "Sucesso").length;

    const causas = Object.entries(
      rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.categoria_causa] = (acc[r.categoria_causa] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([causa, casos]) => ({ causa, casos }))
      .sort((a, b) => b.casos - a.casos);

    const canaisMap = rows.reduce<Record<string, { sucesso: number; semResposta: number }>>((acc, r) => {
      acc[r.tipo_contato] = acc[r.tipo_contato] ?? { sucesso: 0, semResposta: 0 };
      if (r.resultado === "Sucesso") acc[r.tipo_contato].sucesso += 1;
      else acc[r.tipo_contato].semResposta += 1;
      return acc;
    }, {});

    const responsaveisMap = rows.reduce<Record<string, { total: number; sucesso: number }>>((acc, r) => {
      acc[r.responsavel] = acc[r.responsavel] ?? { total: 0, sucesso: 0 };
      acc[r.responsavel].total += 1;
      if (r.resultado === "Sucesso") acc[r.responsavel].sucesso += 1;
      return acc;
    }, {});

    const riscoMap = new Map<string, { id: string; nome: string; codigo: string; pendentes: number; ultima: string }>();
    for (const r of rows) {
      if (r.resultado === "Sucesso" || !r.alunos) continue;
      const atual = riscoMap.get(r.alunos.id);
      riscoMap.set(r.alunos.id, {
        id: r.alunos.id,
        nome: r.alunos.nome,
        codigo: r.alunos.codigo,
        pendentes: (atual?.pendentes ?? 0) + 1,
        ultima: atual?.ultima ?? r.data_intervencao,
      });
    }

    return {
      escola: escola ?? null,
      resumo: {
        matriculas: matriculas.length,
        turmas: (turmas ?? []).length,
        intervencoes: rows.length,
        efetividade: pct(sucesso, rows.length),
        alunosRisco: riscoMap.size,
      },
      intervencoes: rows.map((r) => ({
        id: r.id,
        data_intervencao: r.data_intervencao,
        tipo_contato: r.tipo_contato,
        resultado: r.resultado,
        categoria_causa: r.categoria_causa,
        responsavel: r.responsavel,
        observacoes: r.observacoes,
        proximos_passos: r.proximos_passos,
        aluno: r.alunos ? { id: r.alunos.id, nome: r.alunos.nome, codigo: r.alunos.codigo } : null,
      })),
      causas,
      canais: Object.entries(canaisMap).map(([canal, v]) => ({ canal, ...v })),
      responsaveis: Object.entries(responsaveisMap)
        .map(([responsavel, v]) => ({ responsavel, total: v.total, efetividade: pct(v.sucesso, v.total) }))
        .sort((a, b) => b.total - a.total),
      alunosRisco: [...riscoMap.values()].sort((a, b) => b.pendentes - a.pendentes),
    };
  });

/** Ranking de retenção por unidade escolar (lista da aba "Por Escola"). */
export const listEscolasRetencao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: escolas, error: escErr }, { data: intRows, error: intErr }] = await Promise.all([
      context.supabase.from("escolas").select("id, nome, tipo_unidade, bairro, situacao").order("nome"),
      context.supabase.from("intervencoes").select("escola_id, resultado, aluno_id").limit(5000),
    ]);
    if (escErr) throw new Error(escErr.message);
    if (intErr) throw new Error(intErr.message);

    const rows = (intRows ?? []) as any[];
    return (escolas ?? []).map((e: any) => {
      const dela = rows.filter((r) => r.escola_id === e.id);
      const sucesso = dela.filter((r) => r.resultado === "Sucesso").length;
      const risco = new Set(dela.filter((r) => r.resultado !== "Sucesso").map((r) => r.aluno_id)).size;
      return {
        id: e.id as string,
        nome: e.nome as string,
        tipo: e.tipo_unidade as string,
        bairro: e.bairro as string | null,
        situacao: e.situacao as string,
        intervencoes: dela.length,
        alunosRisco: risco,
        efetividade: pct(sucesso, dela.length),
      };
    });
  });
