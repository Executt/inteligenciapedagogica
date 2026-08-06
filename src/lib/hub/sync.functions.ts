import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { applyMappings, categorizeError, AGGREGATE_EVENT, SYNC_AGGREGATES } from "@/lib/hub/mapping";
import { extractRows } from "@/lib/hub/extract";
import { EVENT_AGGREGATE } from "@/lib/hub/events";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito ao Integration Hub.");
}

const JOB_COLS =
  "id, connector_id, nome, agregado, frequencia_min, limite_registros, ativo, proxima_execucao, ultima_execucao, ultimo_status, ultima_mensagem, created_at, updated_at";

const jobSchema = z.object({
  id: z.string().uuid().optional(),
  connector_id: z.string().uuid(),
  nome: z.string().min(2).max(120),
  agregado: z.enum(SYNC_AGGREGATES),
  frequencia_min: z.number().int().min(5).max(10080).default(60),
  limite_registros: z.number().int().min(1).max(5000).default(500),
  ativo: z.boolean().default(true),
});

export const listSyncJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase.from("hub_sync_jobs").select(JOB_COLS).order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveSyncJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof jobSchema>) => jobSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { id, ...rest } = data;
    const proxima = new Date(Date.now() + rest.frequencia_min * 60_000).toISOString();
    const payload = { ...rest, proxima_execucao: proxima, criado_por: context.userId };
    const q = id
      ? context.supabase.from("hub_sync_jobs").update(payload).eq("id", id).select("id").maybeSingle()
      : context.supabase.from("hub_sync_jobs").insert(payload).select("id").maybeSingle();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return { id: row?.id as string };
  });

export const deleteSyncJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("hub_sync_jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSyncRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connector_id?: string; job_id?: string }) =>
    z.object({ connector_id: z.string().uuid().optional(), job_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    let q = context.supabase
      .from("hub_sync_runs")
      .select(
        "id, job_id, connector_id, gatilho, status, iniciado_em, finalizado_em, duracao_ms, registros_lidos, registros_validos, registros_rejeitados, registros_duplicados, eventos_publicados, categoria_erro, mensagem, detalhes, reprocessa_run_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.connector_id) q = q.eq("connector_id", data.connector_id);
    if (data.job_id) q = q.eq("job_id", data.job_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const runSchema = z.object({
  job_id: z.string().uuid(),
  reprocessa_run_id: z.string().uuid().nullish(),
  gatilho: z.enum(["manual", "agendado", "reprocessamento"]).default("manual"),
});

/** Executa uma sincronização: extrai → mapeia/valida → publica eventos → registra a execução. */
export const runSyncJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof runSchema>) => runSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);

    const { data: job, error: jobErr } = await context.supabase
      .from("hub_sync_jobs")
      .select("id, connector_id, nome, agregado, limite_registros, frequencia_min")
      .eq("id", data.job_id)
      .maybeSingle();
    if (jobErr || !job) throw new Error(jobErr?.message ?? "Agendamento não encontrado.");

    const { data: conn } = await context.supabase
      .from("hub_connectors")
      .select("id, slug, adaptador, base_url, auth_tipo, auth_config, parametros")
      .eq("id", job.connector_id)
      .maybeSingle();
    if (!conn) throw new Error("Conector não encontrado.");

    const { data: mappings } = await context.supabase
      .from("hub_field_mappings")
      .select("agregado, campo_origem, campo_destino, transformacao, obrigatorio, validacao, chave_deduplicacao, valor_padrao, ordem")
      .eq("connector_id", job.connector_id)
      .eq("agregado", job.agregado)
      .order("ordem");

    const inicio = Date.now();
    let status: "sucesso" | "erro" | "aviso" = "sucesso";
    let mensagem = "";
    let categoria: string | null = null;
    let lidos = 0, validos = 0, rejeitados = 0, duplicados = 0, publicados = 0;
    let detalhes: Record<string, any> = {};

    try {
      if (!(mappings ?? []).length) throw new Error("Nenhuma regra de mapeamento definida para este agregado.");
      const ext = await extractRows(conn as any);
      detalhes = { ...ext.detalhes };
      const rows = ext.rows.slice(0, job.limite_registros);
      lidos = rows.length;

      const res = applyMappings(rows, (mappings ?? []) as any);
      validos = res.validos;
      rejeitados = res.rejeitados;
      duplicados = res.duplicados;
      detalhes["erros_por_campo"] = res.errosPorCampo;
      detalhes["amostra_erros"] = res.linhas.filter((l) => l.erros.length).slice(0, 5).map((l) => l.erros.join("; "));

      const nomeEvento = AGGREGATE_EVENT[job.agregado as keyof typeof AGGREGATE_EVENT];
      const aPublicar = res.linhas.filter((l) => l.erros.length === 0 && !l.duplicado).slice(0, 100);
      if (aPublicar.length) {
        const correlacao = crypto.randomUUID();
        const { error: evErr } = await context.supabase.from("hub_events").insert(
          aPublicar.map((l) => ({
            nome: nomeEvento,
            agregado: EVENT_AGGREGATE[nomeEvento],
            agregado_id: String(Object.values(l.registro)[0] ?? ""),
            origem: "integration-hub",
            connector_id: conn.id,
            correlacao_id: correlacao,
            payload: l.registro,
            publicado_por: context.userId,
          })),
        );
        if (evErr) throw new Error(`Falha ao publicar eventos: ${evErr.message}`);
        publicados = aPublicar.length;
      }

      if (rejeitados || duplicados) {
        status = "aviso";
        mensagem = `${validos} válido(s), ${rejeitados} rejeitado(s), ${duplicados} duplicado(s) de ${lidos} registro(s).`;
        categoria = "dados";
      } else {
        mensagem = `${validos} registro(s) sincronizado(s); ${publicados} evento(s) publicado(s).`;
      }
    } catch (e: any) {
      status = "erro";
      mensagem = e?.name === "TimeoutError" ? "Tempo limite excedido ao contactar o destino." : String(e?.message ?? e);
      categoria = categorizeError(mensagem);
    }

    const duracao = Date.now() - inicio;
    const fim = new Date().toISOString();

    const { data: run } = await context.supabase
      .from("hub_sync_runs")
      .insert({
        job_id: job.id,
        connector_id: conn.id,
        gatilho: data.gatilho,
        status,
        finalizado_em: fim,
        duracao_ms: duracao,
        registros_lidos: lidos,
        registros_validos: validos,
        registros_rejeitados: rejeitados,
        registros_duplicados: duplicados,
        eventos_publicados: publicados,
        categoria_erro: categoria,
        mensagem,
        detalhes,
        reprocessa_run_id: data.reprocessa_run_id ?? null,
        actor_id: context.userId,
      })
      .select("id")
      .maybeSingle();

    await context.supabase
      .from("hub_sync_jobs")
      .update({
        ultima_execucao: fim,
        ultimo_status: status,
        ultima_mensagem: mensagem,
        proxima_execucao: new Date(Date.now() + job.frequencia_min * 60_000).toISOString(),
      })
      .eq("id", job.id);

    await context.supabase.from("hub_connector_logs").insert({
      connector_id: conn.id,
      operacao: data.gatilho === "reprocessamento" ? "sincronizacao-reprocesso" : "sincronizacao",
      status,
      duracao_ms: duracao,
      mensagem,
      detalhes: { agregado: job.agregado, lidos, validos, rejeitados, duplicados, publicados },
      actor_id: context.userId,
    });

    return { run_id: run?.id as string, status, mensagem, duracao_ms: duracao, lidos, validos, rejeitados, duplicados, publicados };
  });
