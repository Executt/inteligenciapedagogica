import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  PULSE_DEFAULTS,
  PULSE_SETTING_KEY,
  randomToken,
  sha256Hex,
  type PulseIngestConfig,
} from "@/lib/pulse/hash";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito.");
}

async function readConfig(supabase: any): Promise<PulseIngestConfig> {
  const { data } = await supabase
    .from("app_settings")
    .select("valor")
    .eq("chave", PULSE_SETTING_KEY)
    .maybeSingle();
  return { ...PULSE_DEFAULTS, ...((data?.valor ?? {}) as PulseIngestConfig) };
}

async function writeConfig(supabase: any, userId: string, valor: PulseIngestConfig) {
  const { error } = await supabase.from("app_settings").upsert({
    chave: PULSE_SETTING_KEY,
    valor,
    atualizado_por: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

const listSchema = z.object({
  limit: z.number().min(1).max(200).default(50),
  event_type: z.string().optional(),
}).default({ limit: 50 });

export const listPulseEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof listSchema>) => listSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("pulse_events")
      .select("id, source, event_type, external_id, payload, ip, user_agent, processed, received_at")
      .order("received_at", { ascending: false })
      .limit(data.limit);
    if (data.event_type) q = q.eq("event_type", data.event_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPulseIngestStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const cfg = await readConfig(context.supabase);
    const envConfigured = Boolean(process.env["PULSE_INGEST_TOKEN"]);
    const { count } = await context.supabase
      .from("pulse_events")
      .select("id", { count: "exact", head: true });
    const { count: nonces } = await context.supabase
      .from("pulse_ingest_nonces")
      .select("id", { count: "exact", head: true });

    return {
      configured: envConfigured || Boolean(cfg.token_hash),
      envConfigured,
      total: count ?? 0,
      noncesAtivos: nonces ?? 0,
      tokenPrefix: cfg.token_prefix ?? null,
      rotatedAt: cfg.rotated_at ?? null,
      requireSignature: cfg.require_signature ?? PULSE_DEFAULTS.require_signature,
      skewSeconds: cfg.skew_seconds ?? PULSE_DEFAULTS.skew_seconds,
      allowEnvToken: cfg.allow_env_token ?? PULSE_DEFAULTS.allow_env_token,
    };
  });

/** Gera um novo token, guarda apenas o hash e devolve o valor em claro UMA única vez. */
export const rotatePulseToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const cfg = await readConfig(context.supabase);
    const token = randomToken();
    const hash = await sha256Hex(token);
    const rotatedAt = new Date().toISOString();

    await writeConfig(context.supabase, context.userId, {
      ...cfg,
      token_hash: hash,
      token_prefix: token.slice(0, 12),
      rotated_at: rotatedAt,
    });

    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      acao: "pulse.token.rotate",
      entidade: "app_settings",
      entidade_id: PULSE_SETTING_KEY,
      metadados: { token_prefix: token.slice(0, 12) },
    });

    return { token, rotatedAt, tokenPrefix: token.slice(0, 12) };
  });

export const revokePulseToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const cfg = await readConfig(context.supabase);
    await writeConfig(context.supabase, context.userId, {
      ...cfg,
      token_hash: null,
      token_prefix: null,
      rotated_at: new Date().toISOString(),
    });
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      acao: "pulse.token.revoke",
      entidade: "app_settings",
      entidade_id: PULSE_SETTING_KEY,
      metadados: {},
    });
    return { ok: true };
  });

const securitySchema = z.object({
  require_signature: z.boolean(),
  skew_seconds: z.number().min(30).max(3600),
  allow_env_token: z.boolean(),
});

export const setPulseSecurity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof securitySchema>) => securitySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const cfg = await readConfig(context.supabase);
    await writeConfig(context.supabase, context.userId, { ...cfg, ...data });
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      acao: "pulse.security.update",
      entidade: "app_settings",
      entidade_id: PULSE_SETTING_KEY,
      metadados: data,
    });
    return { ok: true };
  });
