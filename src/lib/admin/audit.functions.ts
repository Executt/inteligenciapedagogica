import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

const logSchema = z.object({
  acao: z.string().min(1),
  entidade: z.string().nullish(),
  entidade_id: z.string().nullish(),
  metadados: z.record(z.any()).optional(),
  target_user_id: z.string().uuid().nullish(),
  // Aceita eventos "anônimos" de tentativa de login (usuário não autenticado)
  actor_email: z.string().email().nullish(),
});

// Log autenticado (usuário logado registrando algo sobre si mesmo, ex.: logout)
export const logAuditEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof logSchema>) => logSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ip = safeIp();
    const ua = getRequestHeader("user-agent") ?? null;
    const { error } = await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      target_user_id: data.target_user_id ?? context.userId,
      acao: data.acao,
      entidade: data.entidade ?? null,
      entidade_id: data.entidade_id ?? null,
      metadados: data.metadados ?? {},
      ip,
      user_agent: ua,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Log público — usado para tentativas de login falhas antes de haver sessão.
export const logPublicAuthEvent = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof logSchema>) => logSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = safeIp();
    const ua = getRequestHeader("user-agent") ?? null;
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: null,
      actor_email: data.actor_email ?? null,
      acao: data.acao,
      entidade: data.entidade ?? "auth",
      metadados: data.metadados ?? {},
      ip,
      user_agent: ua,
    });
    return { ok: true };
  });

const listSchema = z.object({
  desde: z.string().optional(),
  ate: z.string().optional(),
  busca: z.string().optional(),
  limit: z.number().min(1).max(500).default(200),
});

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof listSchema>) => listSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Acesso restrito.");

    let q = context.supabase
      .from("audit_logs")
      .select("id, actor_id, actor_email, target_user_id, acao, entidade, entidade_id, metadados, ip, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.desde) q = q.gte("created_at", data.desde);
    if (data.ate) q = q.lte("created_at", data.ate);
    if (data.busca && data.busca.length > 0) {
      q = q.or(`acao.ilike.%${data.busca}%,actor_email.ilike.%${data.busca}%,entidade.ilike.%${data.busca}%`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

function safeIp(): string | null {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? null;
  } catch {
    return null;
  }
}
