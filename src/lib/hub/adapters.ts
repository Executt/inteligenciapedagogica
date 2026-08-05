/**
 * Integration Hub — catálogo de adaptadores.
 * Camada de Adaptadores: traduz protocolos externos para o contrato interno do Edu-Gov.
 * Nenhum sistema externo acessa o banco diretamente — sempre passa por um conector daqui.
 */
import type { AdapterType } from "@/lib/platform/contracts";

export type AdapterFamily = "api" | "banco" | "diretorio" | "arquivo";

export type AdapterDef = {
  tipo: AdapterType;
  rotulo: string;
  familia: AdapterFamily;
  /** `nativo` roda no runtime da plataforma; `agente` exige proxy/agente na rede da Secretaria. */
  execucao: "nativo" | "agente";
  /** Campos exibidos no formulário de parâmetros do conector. */
  campos: Array<{ id: string; rotulo: string; placeholder?: string; obrigatorio?: boolean }>;
};

const API_FIELDS = [
  { id: "path", rotulo: "Caminho / operação", placeholder: "/v1/alunos" },
  { id: "metodo", rotulo: "Método", placeholder: "GET" },
  { id: "timeout_ms", rotulo: "Timeout (ms)", placeholder: "10000" },
];

const DB_FIELDS = [
  { id: "host", rotulo: "Host", placeholder: "10.0.0.20", obrigatorio: true },
  { id: "porta", rotulo: "Porta", placeholder: "5432" },
  { id: "database", rotulo: "Base", placeholder: "gestao_escolar" },
  { id: "schema", rotulo: "Schema", placeholder: "public" },
  { id: "query", rotulo: "Consulta de leitura", placeholder: "SELECT * FROM alunos" },
];

export const ADAPTERS: AdapterDef[] = [
  { tipo: "rest", rotulo: "REST / HTTP", familia: "api", execucao: "nativo", campos: API_FIELDS },
  {
    tipo: "graphql",
    rotulo: "GraphQL",
    familia: "api",
    execucao: "nativo",
    campos: [
      { id: "query", rotulo: "Query de teste", placeholder: "query { __typename }" },
      { id: "timeout_ms", rotulo: "Timeout (ms)", placeholder: "10000" },
    ],
  },
  {
    tipo: "soap",
    rotulo: "SOAP / WSDL",
    familia: "api",
    execucao: "nativo",
    campos: [
      { id: "wsdl", rotulo: "URL do WSDL", placeholder: "https://.../servico?wsdl" },
      { id: "soap_action", rotulo: "SOAPAction", placeholder: "urn:ListarAlunos" },
    ],
  },
  { tipo: "postgresql", rotulo: "PostgreSQL", familia: "banco", execucao: "agente", campos: DB_FIELDS },
  { tipo: "sqlserver", rotulo: "SQL Server", familia: "banco", execucao: "agente", campos: DB_FIELDS },
  { tipo: "oracle", rotulo: "Oracle", familia: "banco", execucao: "agente", campos: DB_FIELDS },
  { tipo: "mysql", rotulo: "MySQL", familia: "banco", execucao: "agente", campos: DB_FIELDS },
  { tipo: "mariadb", rotulo: "MariaDB", familia: "banco", execucao: "agente", campos: DB_FIELDS },
  { tipo: "sqlite", rotulo: "SQLite", familia: "banco", execucao: "agente", campos: DB_FIELDS },
  { tipo: "mongodb", rotulo: "MongoDB", familia: "banco", execucao: "agente", campos: DB_FIELDS },
  { tipo: "ldap", rotulo: "LDAP", familia: "diretorio", execucao: "agente", campos: DB_FIELDS },
  { tipo: "active-directory", rotulo: "Active Directory", familia: "diretorio", execucao: "agente", campos: DB_FIELDS },
  { tipo: "csv", rotulo: "CSV", familia: "arquivo", execucao: "nativo", campos: [{ id: "delimitador", rotulo: "Delimitador", placeholder: ";" }] },
  { tipo: "excel", rotulo: "Excel (XLSX)", familia: "arquivo", execucao: "nativo", campos: [{ id: "aba", rotulo: "Planilha", placeholder: "Alunos" }] },
  { tipo: "xml", rotulo: "XML", familia: "arquivo", execucao: "nativo", campos: [{ id: "raiz", rotulo: "Nó raiz", placeholder: "alunos" }] },
  { tipo: "json", rotulo: "JSON", familia: "arquivo", execucao: "nativo", campos: [{ id: "raiz", rotulo: "Nó raiz", placeholder: "data" }] },
  { tipo: "sftp", rotulo: "SFTP", familia: "arquivo", execucao: "agente", campos: [{ id: "host", rotulo: "Host" }, { id: "caminho", rotulo: "Caminho remoto" }] },
];

export const ADAPTER_BY_TYPE = Object.fromEntries(ADAPTERS.map((a) => [a.tipo, a])) as Record<AdapterType, AdapterDef>;

export const AUTH_TIPOS = [
  { id: "none", rotulo: "Sem autenticação" },
  { id: "api_key", rotulo: "API Key (header)" },
  { id: "bearer", rotulo: "Bearer token" },
  { id: "basic", rotulo: "Basic (usuário/senha)" },
  { id: "oauth2", rotulo: "OAuth2 client credentials" },
  { id: "mtls", rotulo: "mTLS (certificado)" },
] as const;

export const DIRECOES = [
  { id: "entrada", rotulo: "Entrada (consome do sistema externo)" },
  { id: "saida", rotulo: "Saída (publica para o sistema externo)" },
  { id: "bidirecional", rotulo: "Bidirecional" },
] as const;

/** Campos de autenticação nunca são devolvidos em claro para o front-end. */
export const SENSITIVE_AUTH_KEYS = ["token", "senha", "password", "client_secret", "api_key", "certificado", "chave"];

export function maskAuthConfig(cfg: Record<string, unknown> | null | undefined) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cfg ?? {})) {
    out[k] = SENSITIVE_AUTH_KEYS.some((s) => k.toLowerCase().includes(s)) && v ? "••••••••" : v;
  }
  return out;
}
