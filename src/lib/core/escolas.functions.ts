import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const listSchema = z
  .object({
    busca: z.string().optional(),
    tipo: z.string().optional(),
    limit: z.number().min(1).max(500).default(200),
  })
  .default({ limit: 200 });

/** Core Platform — leitura oficial das unidades escolares (fonte única de verdade). */
export const listEscolas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof listSchema>) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("escolas")
      .select("id, codigo, nome, tipo_unidade, etapa_predominante, endereco, bairro, municipio, uf, inep, telefone, email, diretor, situacao, fonte_importacao")
      .order("nome")
      .limit(data.limit);
    if (data.tipo) q = q.eq("tipo_unidade", data.tipo);
    if (data.busca) q = q.or(`nome.ilike.%${data.busca}%,bairro.ilike.%${data.busca}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  inep: z.string().max(20).optional().nullable(),
  telefone: z.string().max(40).optional().nullable(),
  email: z.string().max(160).optional().nullable(),
  diretor: z.string().max(160).optional().nullable(),
  situacao: z.enum(["ativa", "inativa"]).optional(),
});

export const updateEscola = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof updateSchema>) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("escolas").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      acao: "core.escola.update",
      entidade: "escolas",
      entidade_id: id,
      metadados: patch,
    });
    return { ok: true };
  });

/** Indicadores da rede — consumidos pela camada de Analytics. */
export const getRedeResumo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("escolas")
      .select("tipo_unidade, etapa_predominante, bairro, situacao");
    if (error) throw new Error(error.message);
    const lista = rows ?? [];
    const contar = (campo: "tipo_unidade" | "etapa_predominante" | "bairro") =>
      Object.entries(
        lista.reduce<Record<string, number>>((acc, r: any) => {
          const k = r[campo] ?? "—";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .map(([chave, total]) => ({ chave, total }))
        .sort((a, b) => b.total - a.total);

    return {
      total: lista.length,
      ativas: lista.filter((r: any) => r.situacao === "ativa").length,
      porTipo: contar("tipo_unidade"),
      porEtapa: contar("etapa_predominante"),
      porBairro: contar("bairro").slice(0, 12),
    };
  });

/** Fila de inconsistências geradas por importações e sincronizações. */
export const listInconsistencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("importacao_inconsistencias")
      .select("id, entidade, origem, registro, motivo, severidade, resolvido, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
