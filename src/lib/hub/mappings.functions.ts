import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { SYNC_AGGREGATES, applyMappings } from "@/lib/hub/mapping";
import { extractRows } from "@/lib/hub/extract";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito ao Integration Hub.");
}

const MAP_COLS =
  "id, connector_id, agregado, campo_origem, campo_destino, transformacao, obrigatorio, validacao, chave_deduplicacao, valor_padrao, ordem";

const mapSchema = z.object({
  id: z.string().uuid().optional(),
  connector_id: z.string().uuid(),
  agregado: z.enum(SYNC_AGGREGATES),
  campo_origem: z.string().min(1).max(160),
  campo_destino: z.string().min(1).max(80),
  transformacao: z.string().max(40).default("nenhuma"),
  obrigatorio: z.boolean().default(false),
  validacao: z.string().max(200).nullish(),
  chave_deduplicacao: z.boolean().default(false),
  valor_padrao: z.string().max(120).nullish(),
  ordem: z.number().int().min(0).max(999).default(0),
});

export const listMappings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connector_id?: string }) => z.object({ connector_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    let q = context.supabase.from("hub_field_mappings").select(MAP_COLS).order("agregado").order("ordem");
    if (data.connector_id) q = q.eq("connector_id", data.connector_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof mapSchema>) => mapSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase
      .from("hub_field_mappings")
      .upsert({ ...data, id: data.id ?? undefined }, { onConflict: "connector_id,agregado,campo_destino" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("hub_field_mappings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const previewSchema = z.object({
  connector_id: z.string().uuid(),
  agregado: z.enum(SYNC_AGGREGATES),
  amostra_json: z.string().max(200_000).nullish(),
  limite: z.number().int().min(1).max(50).default(10),
});

/** Pré-visualiza a transformação: usa amostra colada pelo administrador ou extrai do próprio conector. */
export const previewMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof previewSchema>) => previewSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);

    const { data: mappings } = await context.supabase
      .from("hub_field_mappings")
      .select(MAP_COLS)
      .eq("connector_id", data.connector_id)
      .eq("agregado", data.agregado)
      .order("ordem");
    if (!(mappings ?? []).length) throw new Error("Defina ao menos uma regra de mapeamento antes de pré-visualizar.");

    let rows: Array<Record<string, any>> = [];
    let fonte = "amostra";
    if (data.amostra_json && data.amostra_json.trim()) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.amostra_json);
      } catch {
        throw new Error("A amostra informada não é um JSON válido.");
      }
      rows = Array.isArray(parsed) ? (parsed as any[]) : [parsed as any];
    } else {
      const { data: conn } = await context.supabase
        .from("hub_connectors")
        .select("id, adaptador, base_url, auth_tipo, auth_config, parametros")
        .eq("id", data.connector_id)
        .maybeSingle();
      if (!conn) throw new Error("Conector não encontrado.");
      const ext = await extractRows(conn as any);
      rows = ext.rows;
      fonte = "conector";
    }

    const res = applyMappings(rows.slice(0, data.limite), (mappings ?? []) as any);
    return {
      fonte,
      total: rows.length,
      validos: res.validos,
      rejeitados: res.rejeitados,
      duplicados: res.duplicados,
      errosPorCampo: res.errosPorCampo,
      linhas: res.linhas,
    };
  });
