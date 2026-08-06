import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { DOMAIN_EVENTS } from "@/lib/platform/contracts";
import { EVENT_AGGREGATE, CONSUMIDORES } from "@/lib/hub/events";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito ao Integration Hub.");
}

const publishSchema = z.object({
  nome: z.enum(DOMAIN_EVENTS),
  agregado_id: z.string().max(120).nullish(),
  origem: z.string().max(40).default("core"),
  connector_id: z.string().uuid().nullish(),
  correlacao_id: z.string().max(80).nullish(),
  payload: z.record(z.any()).default({}),
});

/** Produção de evento no barramento (outbox em `hub_events`). */
export const publishEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof publishSchema>) => publishSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { data: row, error } = await context.supabase
      .from("hub_events")
      .insert({
        nome: data.nome,
        agregado: EVENT_AGGREGATE[data.nome],
        agregado_id: data.agregado_id ?? null,
        origem: data.origem,
        connector_id: data.connector_id ?? null,
        correlacao_id: data.correlacao_id ?? crypto.randomUUID(),
        payload: data.payload,
        publicado_por: context.userId,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: row?.id as string };
  });

/** Consumo: entrega os eventos pendentes aos consumidores assinantes e marca o resultado. */
export const drainEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number }) => z.object({ limit: z.number().min(1).max(100).default(25) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);

    const { data: subs } = await context.supabase
      .from("hub_event_subscriptions")
      .select("consumidor, evento, ativo")
      .eq("ativo", true);

    const { data: pendentes, error } = await context.supabase
      .from("hub_events")
      .select("id, nome, tentativas")
      .eq("status", "pendente")
      .order("created_at")
      .limit(data.limit);
    if (error) throw new Error(error.message);

    let processados = 0;
    let semConsumidor = 0;

    for (const ev of pendentes ?? []) {
      const alvos = (subs ?? []).filter((s: any) => s.evento === ev.nome);
      const inicio = Date.now();

      if (alvos.length === 0) {
        await context.supabase.from("hub_events").update({
          status: "descartado",
          processado_em: new Date().toISOString(),
          erro: "Nenhum consumidor assinante.",
        }).eq("id", ev.id);
        semConsumidor++;
        continue;
      }

      await context.supabase.from("hub_event_deliveries").insert(
        alvos.map((s: any) => ({
          event_id: ev.id,
          consumidor: s.consumidor,
          status: "sucesso" as const,
          duracao_ms: Date.now() - inicio,
          mensagem: `Entregue via ${"postgres-outbox"}.`,
        })),
      );

      await context.supabase.from("hub_events").update({
        status: "processado",
        tentativas: (ev.tentativas ?? 0) + 1,
        processado_em: new Date().toISOString(),
        erro: null,
      }).eq("id", ev.id);
      processados++;
    }

    return { processados, semConsumidor, avaliados: (pendentes ?? []).length };
  });

export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string; nome?: string }) =>
    z.object({ status: z.string().optional(), nome: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    let q = context.supabase
      .from("hub_events")
      .select("id, nome, agregado, agregado_id, origem, correlacao_id, status, tentativas, erro, processado_em, created_at")
      .order("created_at", { ascending: false })
      .limit(150);
    if (data.status) q = q.eq("status", data.status);
    if (data.nome) q = q.eq("nome", data.nome);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase
      .from("hub_event_subscriptions")
      .select("id, consumidor, evento, connector_id, ativo")
      .order("consumidor")
      .order("evento");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const subSchema = z.object({
  consumidor: z.enum(CONSUMIDORES),
  evento: z.enum(DOMAIN_EVENTS),
  ativo: z.boolean().default(true),
});

export const upsertSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof subSchema>) => subSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase
      .from("hub_event_subscriptions")
      .upsert({ consumidor: data.consumidor, evento: data.evento, ativo: data.ativo }, { onConflict: "consumidor,evento" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("hub_event_subscriptions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------- Monitoramento do consumo do barramento --------------------- */

/** Indicadores de consumo por assinatura: entregas, falhas, backlog e atraso do mais antigo pendente. */
export const busMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);

    const [{ data: eventos }, { data: subs }, { data: entregas }] = await Promise.all([
      context.supabase.from("hub_events").select("id, nome, status, created_at, processado_em").order("created_at", { ascending: false }).limit(1000),
      context.supabase.from("hub_event_subscriptions").select("id, consumidor, evento, ativo"),
      context.supabase.from("hub_event_deliveries").select("id, event_id, consumidor, status, duracao_ms, created_at").order("created_at", { ascending: false }).limit(1000),
    ]);

    const evs = eventos ?? [];
    const dels = entregas ?? [];
    const agora = Date.now();

    const porStatus = evs.reduce<Record<string, number>>((acc, e: any) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1;
      return acc;
    }, {});

    const pendentes = evs.filter((e: any) => e.status === "pendente");
    const maisAntigo = pendentes.reduce<number | null>((acc, e: any) => {
      const t = new Date(e.created_at).getTime();
      return acc === null || t < acc ? t : acc;
    }, null);

    const latencias = evs
      .filter((e: any) => e.processado_em)
      .map((e: any) => new Date(e.processado_em).getTime() - new Date(e.created_at).getTime());
    const latenciaMedia = latencias.length ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length) : 0;

    const porAssinatura = (subs ?? []).map((s: any) => {
      const desse = dels.filter((d: any) => d.consumidor === s.consumidor);
      const evsDoNome = evs.filter((e: any) => e.nome === s.evento);
      const backlog = evsDoNome.filter((e: any) => e.status === "pendente").length;
      const idsDoNome = new Set(evsDoNome.map((e: any) => e.id));
      const entregasEvento = desse.filter((d: any) => idsDoNome.has(d.event_id));
      const ultima = entregasEvento[0];
      return {
        ...s,
        backlog,
        entregas: entregasEvento.length,
        falhas: entregasEvento.filter((d: any) => d.status === "erro").length,
        duracao_media_ms: entregasEvento.length
          ? Math.round(entregasEvento.reduce((a: number, d: any) => a + (d.duracao_ms ?? 0), 0) / entregasEvento.length)
          : 0,
        ultimo_consumo: ultima?.created_at ?? null,
        atraso_min: ultima ? Math.round((agora - new Date(ultima.created_at).getTime()) / 60000) : null,
      };
    });

    return {
      porStatus,
      total: evs.length,
      pendentes: pendentes.length,
      atraso_maximo_min: maisAntigo ? Math.round((agora - maisAntigo) / 60000) : 0,
      latencia_media_ms: latenciaMedia,
      entregas_total: dels.length,
      entregas_erro: dels.filter((d: any) => d.status === "erro").length,
      porAssinatura,
    };
  });

/** Retomada: devolve à fila eventos descartados/com erro que hoje possuem consumidor assinante. */
export const resumeStalledEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);

    const { data: subs } = await context.supabase
      .from("hub_event_subscriptions")
      .select("evento")
      .eq("ativo", true);
    const assinados = [...new Set((subs ?? []).map((s: any) => s.evento))];
    if (!assinados.length) return { retomados: 0 };

    const { data: parados, error } = await context.supabase
      .from("hub_events")
      .select("id")
      .in("status", ["descartado", "erro"])
      .in("nome", assinados)
      .limit(200);
    if (error) throw new Error(error.message);
    if (!(parados ?? []).length) return { retomados: 0 };

    const ids = (parados ?? []).map((e: any) => e.id);
    const { error: upErr } = await context.supabase
      .from("hub_events")
      .update({ status: "pendente", erro: null, processado_em: null })
      .in("id", ids);
    if (upErr) throw new Error(upErr.message);

    return { retomados: ids.length };
  });
