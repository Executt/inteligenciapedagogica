/**
 * Integration Hub — conectores oficiais da Secretaria.
 *
 * Instala, de forma idempotente (por slug), o conector, os agendamentos de
 * sincronização, as regras de mapeamento e as assinaturas do barramento para:
 *  - RH da Secretaria: servidores, cargos e lotações (agregado teacher);
 *  - Matrículas da Secretaria: alunos, turmas e frequência (student/class/grade).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito ao Integration Hub.");
}

type Mapeamento = {
  agregado: string;
  campo_origem: string;
  campo_destino: string;
  transformacao: string;
  obrigatorio: boolean;
  validacao?: string | null;
  chave_deduplicacao: boolean;
  valor_padrao?: string | null;
  ordem: number;
};

type Preset = {
  slug: string;
  nome: string;
  descricao: string;
  eventos: string[];
  jobs: Array<{ nome: string; agregado: string; frequencia_min: number }>;
  mapeamentos: Mapeamento[];
  assinaturas: Array<{ consumidor: string; evento: string }>;
};

const PRESET_RH: Preset = {
  slug: "rh-secretaria",
  nome: "RH da Secretaria",
  descricao:
    "Sincroniza servidores, cargos e lotações do sistema de RH da Secretaria para o Core Platform (servidores e vínculos por unidade escolar).",
  eventos: ["TeacherCreated"],
  jobs: [{ nome: "Servidores e lotações", agregado: "teacher", frequencia_min: 360 }],
  mapeamentos: [
    { agregado: "teacher", campo_origem: "matricula", campo_destino: "matricula", transformacao: "trim", obrigatorio: true, chave_deduplicacao: true, ordem: 1 },
    { agregado: "teacher", campo_origem: "nome", campo_destino: "nome", transformacao: "titulo", obrigatorio: true, chave_deduplicacao: false, ordem: 2 },
    { agregado: "teacher", campo_origem: "email", campo_destino: "email", transformacao: "minuscula", obrigatorio: false, validacao: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", chave_deduplicacao: false, ordem: 3 },
    { agregado: "teacher", campo_origem: "telefone", campo_destino: "telefone", transformacao: "somente_digitos", obrigatorio: false, chave_deduplicacao: false, ordem: 4 },
    { agregado: "teacher", campo_origem: "cargo", campo_destino: "cargo", transformacao: "trim", obrigatorio: true, chave_deduplicacao: false, ordem: 5 },
    { agregado: "teacher", campo_origem: "lotacao", campo_destino: "escola_codigo", transformacao: "trim", obrigatorio: false, chave_deduplicacao: false, ordem: 6 },
    { agregado: "teacher", campo_origem: "disciplina", campo_destino: "disciplina_codigo", transformacao: "trim", obrigatorio: false, chave_deduplicacao: false, ordem: 7 },
    { agregado: "teacher", campo_origem: "carga_horaria", campo_destino: "carga_horaria", transformacao: "numero", obrigatorio: false, chave_deduplicacao: false, ordem: 8 },
    { agregado: "teacher", campo_origem: "situacao", campo_destino: "situacao", transformacao: "minuscula", obrigatorio: false, chave_deduplicacao: false, valor_padrao: "ativo", ordem: 9 },
  ],
  assinaturas: [
    { consumidor: "core-platform", evento: "TeacherCreated" },
    { consumidor: "analytics", evento: "TeacherCreated" },
  ],
};

const PRESET_MATRICULAS: Preset = {
  slug: "matriculas-secretaria",
  nome: "Matrículas da Secretaria",
  descricao:
    "Sincroniza alunos, turmas e frequência do sistema de Matrículas da Secretaria, publicando cada registro no barramento de eventos do Edu-Gov.",
  eventos: ["StudentCreated", "StudentUpdated", "ClassCreated", "GradeUpdated", "AttendanceImported"],
  jobs: [
    { nome: "Alunos", agregado: "student", frequencia_min: 360 },
    { nome: "Turmas", agregado: "class", frequencia_min: 360 },
    { nome: "Notas e frequência", agregado: "grade", frequencia_min: 720 },
  ],
  mapeamentos: [
    { agregado: "student", campo_origem: "matricula", campo_destino: "codigo", transformacao: "trim", obrigatorio: true, chave_deduplicacao: true, ordem: 1 },
    { agregado: "student", campo_origem: "nome", campo_destino: "nome", transformacao: "titulo", obrigatorio: true, chave_deduplicacao: false, ordem: 2 },
    { agregado: "student", campo_origem: "nascimento", campo_destino: "data_nascimento", transformacao: "data_iso", obrigatorio: false, chave_deduplicacao: false, ordem: 3 },
    { agregado: "student", campo_origem: "responsavel", campo_destino: "responsavel", transformacao: "titulo", obrigatorio: false, chave_deduplicacao: false, ordem: 4 },
    { agregado: "student", campo_origem: "telefone", campo_destino: "telefone_responsavel", transformacao: "somente_digitos", obrigatorio: false, chave_deduplicacao: false, ordem: 5 },
    { agregado: "student", campo_origem: "email", campo_destino: "email_responsavel", transformacao: "minuscula", obrigatorio: false, chave_deduplicacao: false, ordem: 6 },
    { agregado: "student", campo_origem: "situacao", campo_destino: "situacao", transformacao: "minuscula", obrigatorio: false, chave_deduplicacao: false, valor_padrao: "ativo", ordem: 7 },
    { agregado: "class", campo_origem: "codigo", campo_destino: "codigo", transformacao: "trim", obrigatorio: true, chave_deduplicacao: true, ordem: 1 },
    { agregado: "class", campo_origem: "nome", campo_destino: "nome", transformacao: "trim", obrigatorio: true, chave_deduplicacao: false, ordem: 2 },
    { agregado: "class", campo_origem: "escola", campo_destino: "escola_codigo", transformacao: "trim", obrigatorio: true, chave_deduplicacao: false, ordem: 3 },
    { agregado: "class", campo_origem: "etapa", campo_destino: "etapa", transformacao: "trim", obrigatorio: false, chave_deduplicacao: false, ordem: 4 },
    { agregado: "class", campo_origem: "serie", campo_destino: "ano_serie", transformacao: "trim", obrigatorio: false, chave_deduplicacao: false, ordem: 5 },
    { agregado: "class", campo_origem: "turno", campo_destino: "turno", transformacao: "trim", obrigatorio: false, chave_deduplicacao: false, ordem: 6 },
    { agregado: "class", campo_origem: "ano_letivo", campo_destino: "ano_letivo", transformacao: "numero", obrigatorio: false, chave_deduplicacao: false, ordem: 7 },
    { agregado: "grade", campo_origem: "matricula_aluno", campo_destino: "aluno_codigo", transformacao: "trim", obrigatorio: true, chave_deduplicacao: true, ordem: 1 },
    { agregado: "grade", campo_origem: "turma", campo_destino: "turma_codigo", transformacao: "trim", obrigatorio: false, chave_deduplicacao: false, ordem: 2 },
    { agregado: "grade", campo_origem: "disciplina", campo_destino: "disciplina", transformacao: "trim", obrigatorio: true, chave_deduplicacao: false, ordem: 3 },
    { agregado: "grade", campo_origem: "bimestre", campo_destino: "bimestre", transformacao: "trim", obrigatorio: true, chave_deduplicacao: false, valor_padrao: "Único", ordem: 4 },
    { agregado: "grade", campo_origem: "nota", campo_destino: "nota", transformacao: "numero", obrigatorio: false, chave_deduplicacao: false, ordem: 5 },
    { agregado: "grade", campo_origem: "frequencia", campo_destino: "frequencia", transformacao: "numero", obrigatorio: false, chave_deduplicacao: false, ordem: 6 },
  ],
  assinaturas: [
    { consumidor: "core-platform", evento: "StudentCreated" },
    { consumidor: "core-platform", evento: "StudentUpdated" },
    { consumidor: "core-platform", evento: "ClassCreated" },
    { consumidor: "core-platform", evento: "GradeUpdated" },
    { consumidor: "core-platform", evento: "AttendanceImported" },
    { consumidor: "analytics", evento: "StudentCreated" },
    { consumidor: "analytics", evento: "GradeUpdated" },
  ],
};

const PRESETS: Record<string, Preset> = { rh: PRESET_RH, matriculas: PRESET_MATRICULAS };

/** Instala (ou atualiza) um conector oficial da Secretaria com jobs, mapeamentos e assinaturas. */
export const installPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { preset: string }) => z.object({ preset: z.enum(["rh", "matriculas"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const preset = PRESETS[data.preset];
    const sb = context.supabase;

    // 1. Conector (idempotente por slug)
    let { data: conn } = await sb.from("hub_connectors").select("id").eq("slug", preset.slug).maybeSingle();
    if (!conn) {
      const { data: criado, error } = await sb
        .from("hub_connectors")
        .insert({
          nome: preset.nome,
          slug: preset.slug,
          descricao: preset.descricao,
          adaptador: "rest",
          direcao: "entrada",
          auth_tipo: "bearer",
          auth_config: {},
          parametros: { metodo: "GET", timeout_ms: "15000" },
          eventos_publicados: preset.eventos,
          situacao: "inativo",
          criado_por: context.userId,
        })
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      conn = criado;
    } else {
      await sb
        .from("hub_connectors")
        .update({ nome: preset.nome, descricao: preset.descricao, eventos_publicados: preset.eventos })
        .eq("id", conn.id);
    }
    const connectorId = conn!.id as string;

    // 2. Agendamentos de sincronização
    for (const job of preset.jobs) {
      const { data: existente } = await sb
        .from("hub_sync_jobs")
        .select("id")
        .eq("connector_id", connectorId)
        .eq("agregado", job.agregado)
        .maybeSingle();
      if (existente) {
        await sb.from("hub_sync_jobs").update({ nome: job.nome, frequencia_min: job.frequencia_min }).eq("id", existente.id);
      } else {
        await sb.from("hub_sync_jobs").insert({
          connector_id: connectorId,
          nome: job.nome,
          agregado: job.agregado,
          frequencia_min: job.frequencia_min,
          limite_registros: 1000,
          ativo: true,
          proxima_execucao: new Date(Date.now() + job.frequencia_min * 60_000).toISOString(),
          criado_por: context.userId,
        });
      }
    }

    // 3. Regras de mapeamento (substitui as do preset, preserva customizações de outros agregados)
    const agregados = [...new Set(preset.mapeamentos.map((m) => m.agregado))];
    await sb.from("hub_field_mappings").delete().eq("connector_id", connectorId).in("agregado", agregados);
    const { error: mapErr } = await sb
      .from("hub_field_mappings")
      .insert(preset.mapeamentos.map((m) => ({ ...m, connector_id: connectorId })));
    if (mapErr) throw new Error(mapErr.message);

    // 4. Assinaturas do barramento
    for (const sub of preset.assinaturas) {
      await sb
        .from("hub_event_subscriptions")
        .upsert({ consumidor: sub.consumidor, evento: sub.evento, ativo: true }, { onConflict: "consumidor,evento" });
    }

    await sb.from("audit_logs").insert({
      actor_id: context.userId,
      acao: "hub.preset.install",
      entidade: "hub_connectors",
      entidade_id: connectorId,
      metadados: { preset: data.preset, slug: preset.slug },
    });

    return {
      ok: true,
      connector_id: connectorId,
      nome: preset.nome,
      jobs: preset.jobs.length,
      mapeamentos: preset.mapeamentos.length,
      assinaturas: preset.assinaturas.length,
    };
  });
