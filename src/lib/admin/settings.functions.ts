import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito.");
}

export const listSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("app_settings").select("chave, valor, updated_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const getSchema = z.object({ chave: z.string().min(1) });
export const getSetting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof getSchema>) => getSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("app_settings").select("valor").eq("chave", data.chave).maybeSingle();
    if (error) throw new Error(error.message);
    return row?.valor ?? null;
  });

const setSchema = z.object({ chave: z.string().min(1), valor: z.record(z.any()) });
export const setSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof setSchema>) => setSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("app_settings").upsert({
      chave: data.chave,
      valor: data.valor,
      atualizado_por: context.userId,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      acao: "settings.update",
      entidade: "app_settings",
      entidade_id: data.chave,
      metadados: { chaves: Object.keys(data.valor) },
    });
    return { ok: true };
  });
