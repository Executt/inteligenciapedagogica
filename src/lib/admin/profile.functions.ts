import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("id, nome, must_change_password, ativo, ultimo_login").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    return {
      id: context.userId,
      nome: profile?.nome ?? null,
      must_change_password: profile?.must_change_password ?? false,
      ativo: profile?.ativo ?? true,
      ultimo_login: profile?.ultimo_login ?? null,
      roles: (roles ?? []).map((r: any) => r.role as string),
    };
  });

export const markPasswordChanged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("profiles").update({ must_change_password: false }).eq("id", context.userId);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      target_user_id: context.userId,
      acao: "auth.password_change",
      entidade: "profiles",
    });
    return { ok: true };
  });

export const touchLastLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("profiles").update({ ultimo_login: new Date().toISOString() }).eq("id", context.userId);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      target_user_id: context.userId,
      acao: "auth.login",
      entidade: "auth",
    });
    return { ok: true };
  });
