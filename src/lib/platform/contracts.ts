/**
 * Fase 1 — Contratos da arquitetura em 5 camadas do Edu-Gov.
 *
 *   Administration   → /configuracoes (painéis existentes)
 *   Analytics        → indicadores derivados do Core
 *   AI Services      → src/lib/cortex + src/lib/ai-gateway.server.ts
 *   Integration Hub  → src/lib/hub (conectores, adaptadores, barramento, fluxos)
 *   Core Platform    → src/lib/core (dados mestres oficiais da Secretaria)
 *
 * Regras invioláveis:
 *  1. O Core Platform é a única fonte de verdade de escolas, turmas, alunos e servidores.
 *  2. Nenhum módulo auxiliar mantém cópia desses dados.
 *  3. Módulos não se comunicam diretamente: publicam e consomem eventos no barramento.
 *  4. Sistemas externos nunca acessam o banco — apenas o Integration Hub.
 */

export const PLATFORM_LAYERS = [
  "core",
  "integration-hub",
  "ai-services",
  "analytics",
  "administration",
] as const;
export type PlatformLayer = (typeof PLATFORM_LAYERS)[number];

/** Eventos de domínio do barramento interno. */
export const DOMAIN_EVENTS = [
  "StudentCreated",
  "StudentUpdated",
  "StudentTransferred",
  "SchoolCreated",
  "SchoolUpdated",
  "TeacherCreated",
  "ClassCreated",
  "AttendanceImported",
  "GradeUpdated",
  "CouncilMeetingCreated",
] as const;
export type DomainEventName = (typeof DOMAIN_EVENTS)[number];

export type DomainEvent<T = unknown> = {
  nome: DomainEventName;
  origem: PlatformLayer;
  ocorridoEm: string;
  correlacaoId?: string;
  payload: T;
};

/** Tipos de adaptador previstos pelo Integration Hub. */
export const ADAPTER_TYPES = [
  "rest",
  "graphql",
  "soap",
  "postgresql",
  "sqlserver",
  "oracle",
  "mysql",
  "mariadb",
  "sqlite",
  "mongodb",
  "ldap",
  "active-directory",
  "openldap",
  "csv",
  "excel",
  "xml",
  "json",
  "sftp",
] as const;
export type AdapterType = (typeof ADAPTER_TYPES)[number];

/** Origem da autenticação de um usuário (coexistência com o Root atual). */
export const AUTH_ORIGINS = ["ROOT", "LOCAL", "LDAP", "AD", "OAUTH"] as const;
export type AuthOrigin = (typeof AUTH_ORIGINS)[number];

export const AUTH_ORIGIN_LABEL: Record<AuthOrigin, string> = {
  ROOT: "Root (Super Administrador)",
  LOCAL: "Usuário local",
  LDAP: "LDAP",
  AD: "Active Directory",
  OAUTH: "OAuth2",
};

/** Contrato mínimo de um adaptador do Integration Hub. */
export type AdapterContract = {
  tipo: AdapterType;
  rotulo: string;
  /** Executável no runtime da plataforma ou exige agente/proxy externo. */
  execucao: "nativo" | "agente";
  capacidades: Array<"testar" | "listar" | "ler" | "escrever">;
};
