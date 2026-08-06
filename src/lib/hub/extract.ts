/**
 * Integration Hub — extração de registros a partir de um conector.
 * Usa apenas APIs web (fetch) — adaptadores de execução por agente não são extraídos aqui.
 */
export type ExtractResult = { rows: Array<Record<string, any>>; detalhes: Record<string, string | number> };

function buildHeaders(auth_tipo: string, auth: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (auth_tipo === "bearer" && auth["token"]) headers["authorization"] = `Bearer ${auth["token"]}`;
  if (auth_tipo === "api_key" && auth["api_key"]) headers[auth["header"] || "x-api-key"] = auth["api_key"];
  if (auth_tipo === "basic" && auth["usuario"]) {
    headers["authorization"] = `Basic ${btoa(`${auth["usuario"]}:${auth["senha"] ?? ""}`)}`;
  }
  return headers;
}

function normalizeRows(json: unknown, raiz?: string): Array<Record<string, any>> {
  let node: any = json;
  if (raiz) node = raiz.split(".").reduce<any>((acc, k) => (acc == null ? undefined : acc[k]), json);
  if (Array.isArray(node)) return node.filter((r) => r && typeof r === "object");
  if (node && typeof node === "object") {
    const arr = Object.values(node).find((v) => Array.isArray(v));
    if (Array.isArray(arr)) return arr.filter((r) => r && typeof r === "object");
    return [node as Record<string, any>];
  }
  return [];
}

export async function extractRows(conn: {
  adaptador: string;
  base_url?: string | null;
  auth_tipo: string;
  auth_config?: Record<string, string> | null;
  parametros?: Record<string, string> | null;
}): Promise<ExtractResult> {
  const params = conn.parametros ?? {};
  const headers = buildHeaders(conn.auth_tipo, conn.auth_config ?? {});
  const timeout = Number(params["timeout_ms"] ?? 15000) || 15000;

  if (conn.adaptador === "rest") {
    if (!conn.base_url) throw new Error("Endereço base não informado.");
    const url = `${conn.base_url.replace(/\/$/, "")}${params["path"] ?? ""}`;
    const res = await fetch(url, {
      method: params["metodo"] || "GET",
      headers,
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`Resposta HTTP ${res.status} ${res.statusText}.`);
    const json = await res.json();
    return { rows: normalizeRows(json, params["raiz"]), detalhes: { http_status: res.status, url } };
  }

  if (conn.adaptador === "graphql") {
    if (!conn.base_url) throw new Error("Endereço base não informado.");
    const res = await fetch(conn.base_url, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ query: params["query"] || "query { __typename }" }),
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`Resposta HTTP ${res.status} ${res.statusText}.`);
    const json: any = await res.json();
    if (json?.errors?.length) throw new Error(String(json.errors[0]?.message ?? "Erro GraphQL."));
    return { rows: normalizeRows(json?.data, params["raiz"]), detalhes: { http_status: res.status } };
  }

  if (conn.adaptador === "json" || conn.adaptador === "csv") {
    if (!conn.base_url) throw new Error("Endereço do arquivo não informado no endereço base.");
    const res = await fetch(conn.base_url, { headers, signal: AbortSignal.timeout(timeout) });
    if (!res.ok) throw new Error(`Resposta HTTP ${res.status} ${res.statusText}.`);
    const texto = await res.text();
    if (conn.adaptador === "json") return { rows: normalizeRows(JSON.parse(texto), params["raiz"]), detalhes: { http_status: res.status } };
    const sep = params["delimitador"] || ";";
    const [cab, ...corpo] = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
    const cols = (cab ?? "").split(sep).map((c) => c.trim());
    const rows = corpo.map((l) => Object.fromEntries(l.split(sep).map((v, i) => [cols[i] ?? `col_${i}`, v.trim()])));
    return { rows, detalhes: { http_status: res.status, colunas: cols.length } };
  }

  throw new Error(
    "Este adaptador exige agente de integração na rede da Secretaria — a extração automática não é executada pela plataforma.",
  );
}
