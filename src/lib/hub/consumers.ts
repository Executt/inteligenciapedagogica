/**
 * Integration Hub — consumidores do Core Platform.
 *
 * Aplicam os eventos do barramento às tabelas mestres (alunos, escolas, turmas,
 * servidores, avaliações) de forma idempotente: a chave natural de cada agregado
 * (código/matrícula) define se o registro é criado ou atualizado.
 *
 * Server-only: importado apenas por server functions do Hub.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainEventName } from "@/lib/platform/contracts";

type Resultado = { aplicado: boolean; mensagem: string };

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const txt = (v: unknown): string | null => {
  const s = v == null ? "" : String(v).trim();
  return s || null;
};

async function upsertPorChave(
  supabase: SupabaseClient,
  tabela: string,
  colunaChave: string,
  chave: string,
  dados: Record<string, unknown>,
): Promise<Resultado> {
  const { data: existente, error: selErr } = await supabase
    .from(tabela)
    .select("id")
    .eq(colunaChave, chave)
    .maybeSingle();
  if (selErr) return { aplicado: false, mensagem: selErr.message };

  if (existente) {
    const { error } = await supabase.from(tabela).update(dados).eq("id", existente.id);
    return error ? { aplicado: false, mensagem: error.message } : { aplicado: true, mensagem: `${tabela} atualizado (${chave}).` };
  }
  const { error } = await supabase.from(tabela).insert({ ...dados, [colunaChave]: chave });
  return error ? { aplicado: false, mensagem: error.message } : { aplicado: true, mensagem: `${tabela} criado (${chave}).` };
}

async function escolaIdPorCodigo(supabase: SupabaseClient, codigo: unknown): Promise<string | null> {
  const c = txt(codigo);
  if (!c) return null;
  const { data } = await supabase.from("escolas").select("id").eq("codigo", c).maybeSingle();
  return (data?.id as string) ?? null;
}

/** Aplica um evento do barramento ao Core Platform. Retorna o resultado da persistência. */
export async function applyEventToCore(
  supabase: SupabaseClient,
  nome: DomainEventName,
  payload: Record<string, unknown>,
): Promise<Resultado> {
  switch (nome) {
    case "StudentCreated":
    case "StudentUpdated": {
      const codigo = txt(payload.codigo);
      if (!codigo) return { aplicado: false, mensagem: "Evento sem código do aluno." };
      return upsertPorChave(supabase, "alunos", "codigo", codigo, {
        nome: txt(payload.nome) ?? "Sem nome",
        data_nascimento: txt(payload.data_nascimento),
        responsavel: txt(payload.responsavel),
        telefone_responsavel: txt(payload.telefone_responsavel),
        email_responsavel: txt(payload.email_responsavel),
        situacao: txt(payload.situacao) ?? "ativo",
        metadados: { origem: "integration-hub" },
      });
    }

    case "StudentTransferred": {
      const codigo = txt(payload.codigo ?? payload.aluno_codigo);
      if (!codigo) return { aplicado: false, mensagem: "Evento sem código do aluno." };
      const { data: aluno } = await supabase.from("alunos").select("id").eq("codigo", codigo).maybeSingle();
      if (!aluno) return { aplicado: false, mensagem: `Aluno ${codigo} não encontrado para transferência.` };
      const { error } = await supabase
        .from("matriculas")
        .update({ situacao: "transferida" })
        .eq("aluno_id", aluno.id)
        .eq("situacao", "ativa");
      return error ? { aplicado: false, mensagem: error.message } : { aplicado: true, mensagem: `Transferência registrada para ${codigo}.` };
    }

    case "SchoolCreated":
    case "SchoolUpdated": {
      const codigo = txt(payload.codigo);
      if (!codigo) return { aplicado: false, mensagem: "Evento sem código da unidade." };
      return upsertPorChave(supabase, "escolas", "codigo", codigo, {
        nome: txt(payload.nome) ?? "Sem nome",
        inep: txt(payload.inep),
        municipio: txt(payload.municipio) ?? "",
        uf: txt(payload.uf),
        etapa_predominante: txt(payload.etapa_predominante),
        situacao: txt(payload.situacao) ?? "ativa",
      });
    }

    case "TeacherCreated": {
      const matricula = txt(payload.matricula);
      if (!matricula) return { aplicado: false, mensagem: "Evento sem matrícula funcional." };
      const res = await upsertPorChave(supabase, "servidores", "matricula", matricula, {
        nome: txt(payload.nome) ?? "Sem nome",
        email: txt(payload.email),
        telefone: txt(payload.telefone),
        cargo: txt(payload.cargo),
        situacao: txt(payload.situacao) ?? "ativo",
        metadados: { origem: "integration-hub" },
      });
      if (!res.aplicado) return res;

      // Lotação: vínculo do servidor à unidade escolar (e disciplina, quando informada).
      const escolaId = await escolaIdPorCodigo(supabase, payload.escola_codigo);
      if (escolaId) {
        const { data: servidor } = await supabase.from("servidores").select("id").eq("matricula", matricula).maybeSingle();
        if (servidor) {
          const disciplina = txt(payload.disciplina_codigo);
          let q = supabase
            .from("vinculos_servidor")
            .select("id")
            .eq("servidor_id", servidor.id)
            .eq("escola_id", escolaId);
          q = disciplina ? q.eq("disciplina_codigo", disciplina) : q.is("disciplina_codigo", null);
          const { data: vinc } = await q.maybeSingle();
          if (!vinc) {
            await supabase.from("vinculos_servidor").insert({
              servidor_id: servidor.id,
              escola_id: escolaId,
              disciplina_codigo: disciplina,
              carga_horaria: num(payload.carga_horaria),
              situacao: "ativo",
            });
          }
        }
      }
      return { aplicado: true, mensagem: `${res.mensagem} Lotação sincronizada.` };
    }

    case "ClassCreated": {
      const codigo = txt(payload.codigo);
      if (!codigo) return { aplicado: false, mensagem: "Evento sem código da turma." };
      const escolaId = await escolaIdPorCodigo(supabase, payload.escola_codigo);
      return upsertPorChave(supabase, "turmas", "codigo", codigo, {
        nome: txt(payload.nome) ?? codigo,
        escola_id: escolaId,
        etapa: txt(payload.etapa),
        ano_serie: txt(payload.ano_serie),
        turno: txt(payload.turno),
        ano_letivo: num(payload.ano_letivo),
        capacidade: num(payload.capacidade),
        situacao: txt(payload.situacao) ?? "ativa",
      });
    }

    case "GradeUpdated":
    case "AttendanceImported": {
      const alunoCodigo = txt(payload.aluno_codigo);
      if (!alunoCodigo) return { aplicado: false, mensagem: "Evento sem código do aluno." };
      const { data: aluno } = await supabase.from("alunos").select("id").eq("codigo", alunoCodigo).maybeSingle();
      if (!aluno) return { aplicado: false, mensagem: `Aluno ${alunoCodigo} não encontrado.` };

      let turmaId: string | null = null;
      const turmaCodigo = txt(payload.turma_codigo);
      if (turmaCodigo) {
        const { data: turma } = await supabase.from("turmas").select("id").eq("codigo", turmaCodigo).maybeSingle();
        turmaId = (turma?.id as string) ?? null;
      }

      const disciplina = txt(payload.disciplina) ?? "Geral";
      const bimestre = txt(payload.bimestre) ?? "Único";
      const dados = {
        aluno_id: aluno.id,
        turma_id: turmaId,
        disciplina,
        bimestre,
        nota: nome === "GradeUpdated" ? num(payload.nota) : null,
        frequencia: num(payload.frequencia),
        origem: "integration-hub",
      };

      let q = supabase
        .from("avaliacoes")
        .select("id")
        .eq("aluno_id", aluno.id)
        .eq("disciplina", disciplina)
        .eq("bimestre", bimestre);
      q = turmaId ? q.eq("turma_id", turmaId) : q.is("turma_id", null);
      const { data: existente } = await q.maybeSingle();

      const { error } = existente
        ? await supabase.from("avaliacoes").update(dados).eq("id", existente.id)
        : await supabase.from("avaliacoes").insert(dados);
      return error
        ? { aplicado: false, mensagem: error.message }
        : { aplicado: true, mensagem: `Avaliação de ${alunoCodigo} (${disciplina}/${bimestre}) sincronizada.` };
    }

    case "CouncilMeetingCreated":
      return { aplicado: true, mensagem: "Evento registrado para o Analytics (sem persistência no Core)." };

    default:
      return { aplicado: false, mensagem: `Evento ${nome} sem consumidor no Core Platform.` };
  }
}
