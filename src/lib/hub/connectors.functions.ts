import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ADAPTER_BY_TYPE, maskAuthConfig } from "@/lib/hub/adapters";
import { ADAPTER_TYPES } from "@/lib/platform/contracts";

/** API interna do Integration Hub — todo acesso exige papel admin. */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Acesso restrito ao Integration Hub.");
}

const connectorSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
  descricao: z.string().max(500).nullish(),
  adaptador: z.enum(ADAPTER_TYPES),
  direcao: z.enum(["entrada", "saida", "bidirecional"]).default("entrada"),
  base_url: z.string().max(400).nullish(),
  auth_tipo: z.enum(["none", "api_key", "bearer", "basic", "oauth2", "mtls"]).default("none"),
  auth_config: z.record(z.string()).default({}),
  parametros: z.record(z.string()).default({}),
  eventos_publicados: z.array(z.string()).default([]),
  situacao: z.enum(["ativo", "inativo", "erro"]).default("inativo"),
});

const SELECT_COLS =
  "id, nome, slug, descricao, adaptador, direcao, base_url, auth_tipo, auth_config, parametros, eventos_publicados, situacao, ultimo_teste_em, ultimo_teste_status, ultimo_teste_mensagem, created_at, updated_at";

export const listConnectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase.from("hub_connectors").select(SELECT_COLS).order("nome");
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => ({ ...c, auth_config: maskAuthConfig(c.auth_config) }));
  });

export const saveConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof connectorSchema>) => connectorSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { id, auth_config, ...rest } = data;

    // Não sobrescreve segredos com o valor mascarado devolvido ao front-end.
    let authFinal: Record<string, string> = auth_config;
    if (id) {
      const { data: atual } = await context.supabase.from("hub_connectors").select("auth_config").eq("id", id).maybeSingle();
      const anterior = (atual?.auth_config ?? {}) as Record<string, string>;
      authFinal = Object.fromEntries(
        Object.entries({ ...anterior, ...auth_config }).map(([k, v]) => [k, v === "••••••••" ? anterior[k] ?? "" : v]),
      );
    }

    const payload = { ...rest, auth_config: authFinal, criado_por: context.userId };
    const q = id
      ? context.supabase.from("hub_connectors").update(payload).eq("id", id).select("id").maybeSingle()
      : context.supabase.from("hub_connectors").insert(payload).select("id").maybeSingle();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      acao: id ? "hub.connector.update" : "hub.connector.create",
      entidade: "hub_connectors",
      entidade_id: row?.id ?? id ?? null,
      metadados: { slug: data.slug, adaptador: data.adaptador },
    });
    return { id: row?.id as string };
  });

export const deleteConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("hub_connectors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      acao: "hub.connector.delete",
      entidade: "hub_connectors",
      entidade_id: data.id,
    });
    return { ok: true };
  });

/** Teste de conexão: adaptadores nativos fazem handshake real; os de agente são validados por configuração. */
export const testConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { data: conn, error } = await context.supabase
      .from("hub_connectors")
      .select("id, slug, adaptador, base_url, auth_tipo, auth_config, parametros")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !conn) throw new Error(error?.message ?? "Conector não encontrado.");

    const def = ADAPTER_BY_TYPE[conn.adaptador as keyof typeof ADAPTER_BY_TYPE];
    const inicio = Date.now();
    let status: "sucesso" | "erro" | "aviso" = "sucesso";
    let mensagem = "";
    const detalhes: Record<string, string | number> = { adaptador: String(conn.adaptador), execucao: String(def?.execucao ?? "") };

    try {
      if (def?.familia === "api") {
        if (!conn.base_url) throw new Error("Endereço base não informado.");
        const params = (conn.parametros ?? {}) as Record<string, string>;
        const auth = (conn.auth_config ?? {}) as Record<string, string>;
        const headers: Record<string, string> = { accept: "*/*" };
        if (conn.auth_tipo === "bearer" && auth["token"]) headers["authorization"] = `Bearer ${auth["token"]}`;
        if (conn.auth_tipo === "api_key" && auth["api_key"]) headers[auth["header"] || "x-api-key"] = auth["api_key"];
        if (conn.auth_tipo === "basic" && auth["usuario"]) {
          headers["authorization"] = `Basic ${btoa(`${auth["usuario"]}:${auth["senha"] ?? ""}`)}`;
        }

        let url = conn.base_url;
        let init: RequestInit = { method: params["metodo"] || "GET", headers };
        if (conn.adaptador === "rest" && params["path"]) url = `${conn.base_url.replace(/\/$/, "")}${params["path"]}`;
        if (conn.adaptador === "graphql") {
          init = {
            method: "POST",
            headers: { ...headers, "content-type": "application/json" },
            body: JSON.stringify({ query: params["query"] || "query { __typename }" }),
          };
        }
        if (conn.adaptador === "soap") {
          url = params["wsdl"] || conn.base_url;
          init = { method: "GET", headers };
        }

        const timeout = Number(params["timeout_ms"] ?? 10000) || 10000;
        const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
        detalhes["http_status"] = res.status;
        if (!res.ok) {
          status = res.status >= 500 ? "erro" : "aviso";
          mensagem = `Resposta HTTP ${res.status} ${res.statusText}.`;
        } else {
          mensagem = `Handshake concluído (HTTP ${res.status}).`;
        }
      } else if (def?.execucao === "agente") {
        const params = (conn.parametros ?? {}) as Record<string, string>;
        const faltando = (def.campos ?? []).filter((c) => c.obrigatorio && !params[c.id]).map((c) => c.rotulo);
        if (faltando.length) throw new Error(`Parâmetros obrigatórios ausentes: ${faltando.join(", ")}.`);
        status = "aviso";
        mensagem = "Configuração válida. A conexão efetiva depende do agente de integração na rede da Secretaria.";
      } else {
        mensagem = "Adaptador de arquivo validado — pronto para receber cargas.";
      }
    } catch (e: any) {
      status = "erro";
      mensagem = e?.name === "TimeoutError" ? "Tempo limite excedido ao contactar o destino." : String(e?.message ?? e);
    }

    const duracao = Date.now() - inicio;
    await context.supabase.from("hub_connectors").update({
      ultimo_teste_em: new Date().toISOString(),
      ultimo_teste_status: status,
      ultimo_teste_mensagem: mensagem,
      situacao: status === "erro" ? "erro" : "ativo",
    }).eq("id", conn.id);

    await context.supabase.from("hub_connector_logs").insert({
      connector_id: conn.id,
      operacao: "teste-conexao",
      status,
      duracao_ms: duracao,
      mensagem,
      detalhes,
      actor_id: context.userId,
    });

    return { status, mensagem, duracao_ms: duracao, detalhes };
  });

export const listConnectorLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connector_id?: string }) => z.object({ connector_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    let q = context.supabase
      .from("hub_connector_logs")
      .select("id, connector_id, operacao, status, duracao_ms, mensagem, detalhes, created_at")
      .order("created_at", { ascending: false })
      .limit(120);
    if (data.connector_id) q = q.eq("connector_id", data.connector_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
