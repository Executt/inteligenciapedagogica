import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ROLES = ["admin", "direcao", "coordenacao", "professor", "pais"] as const;
type AppRole = (typeof ROLES)[number];

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error("Falha ao verificar permissão.");
  if (!data) throw new Error("Acesso restrito a administradores.");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authList, error: e1 } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (e1) throw new Error(e1.message);

    const ids = authList.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, nome, must_change_password, ativo, ultimo_login").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get((r as any).user_id) ?? [];
      arr.push((r as any).role);
      roleMap.set((r as any).user_id, arr);
    }

    return authList.users.map((u) => {
      const p = profileMap.get(u.id) as any;
      return {
        id: u.id,
        email: u.email ?? "",
        nome: p?.nome ?? u.user_metadata?.nome ?? u.email ?? "",
        roles: roleMap.get(u.id) ?? [],
        ativo: p?.ativo ?? !(u.banned_until && new Date(u.banned_until) > new Date()),
        ultimo_login: p?.ultimo_login ?? u.last_sign_in_at ?? null,
        must_change_password: p?.must_change_password ?? true,
        created_at: u.created_at,
      };
    });
  });

const createSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(10, "Senha temporária precisa ter ao menos 10 caracteres"),
  nome: z.string().min(2, "Informe um nome"),
  role: z.enum(ROLES),
});

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof createSchema>) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;

    await supabaseAdmin.from("profiles").upsert({ id: newId, nome: data.nome, must_change_password: true, ativo: true });
    await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: data.role });

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      target_user_id: newId,
      acao: "user.create",
      entidade: "auth.users",
      entidade_id: newId,
      metadados: { email: data.email, role: data.role },
    });

    return { id: newId };
  });

const setActiveSchema = z.object({ userId: z.string().uuid(), ativo: z.boolean() });
export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof setActiveSchema>) => setActiveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode desativar a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.ativo ? "none" : "876000h", // ~100 anos
    });
    await supabaseAdmin.from("profiles").update({ ativo: data.ativo }).eq("id", data.userId);

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      target_user_id: data.userId,
      acao: data.ativo ? "user.activate" : "user.deactivate",
      entidade: "auth.users",
      entidade_id: data.userId,
    });
    return { ok: true };
  });

const setRoleSchema = z.object({ userId: z.string().uuid(), role: z.enum(ROLES) });
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof setRoleSchema>) => setRoleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Substitui roles do usuário pela role escolhida (papel único)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      target_user_id: data.userId,
      acao: "user.role_change",
      entidade: "user_roles",
      entidade_id: data.userId,
      metadados: { role: data.role },
    });
    return { ok: true };
  });

const resetSchema = z.object({ userId: z.string().uuid() });
export const forcePasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof resetSchema>) => resetSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ must_change_password: true }).eq("id", data.userId);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      target_user_id: data.userId,
      acao: "user.force_password_reset",
      entidade: "profiles",
      entidade_id: data.userId,
    });
    return { ok: true };
  });
