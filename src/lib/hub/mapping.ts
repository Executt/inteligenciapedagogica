/**
 * Integration Hub — motor de mapeamento, transformação e validação.
 * Puro (sem I/O) para ser reutilizado pelas server functions e pela pré-visualização na UI.
 */
import type { DomainEventName } from "@/lib/platform/contracts";

export const SYNC_AGGREGATES = ["student", "school", "grade"] as const;
export type SyncAggregate = (typeof SYNC_AGGREGATES)[number];

export const AGGREGATE_LABEL: Record<SyncAggregate, string> = {
  student: "Aluno (student)",
  school: "Unidade escolar (school)",
  grade: "Nota / avaliação (grade)",
};

/** Campos canônicos do contrato interno por agregado. */
export const TARGET_FIELDS: Record<SyncAggregate, Array<{ id: string; rotulo: string }>> = {
  student: [
    { id: "codigo", rotulo: "Código / matrícula" },
    { id: "nome", rotulo: "Nome completo" },
    { id: "data_nascimento", rotulo: "Data de nascimento" },
    { id: "responsavel", rotulo: "Responsável" },
    { id: "telefone_responsavel", rotulo: "Telefone do responsável" },
    { id: "email_responsavel", rotulo: "E-mail do responsável" },
    { id: "situacao", rotulo: "Situação" },
  ],
  school: [
    { id: "codigo", rotulo: "Código da unidade" },
    { id: "nome", rotulo: "Nome da unidade" },
    { id: "inep", rotulo: "INEP" },
    { id: "municipio", rotulo: "Município" },
    { id: "uf", rotulo: "UF" },
    { id: "etapa_predominante", rotulo: "Etapa predominante" },
    { id: "situacao", rotulo: "Situação" },
  ],
  grade: [
    { id: "aluno_codigo", rotulo: "Código do aluno" },
    { id: "turma_codigo", rotulo: "Código da turma" },
    { id: "disciplina", rotulo: "Disciplina" },
    { id: "bimestre", rotulo: "Bimestre" },
    { id: "nota", rotulo: "Nota" },
    { id: "frequencia", rotulo: "Frequência (%)" },
  ],
};

export const TRANSFORMS = [
  { id: "nenhuma", rotulo: "Nenhuma (copiar valor)" },
  { id: "trim", rotulo: "Remover espaços nas pontas" },
  { id: "maiuscula", rotulo: "MAIÚSCULAS" },
  { id: "minuscula", rotulo: "minúsculas" },
  { id: "titulo", rotulo: "Capitalizar Nomes" },
  { id: "somente_digitos", rotulo: "Somente dígitos" },
  { id: "numero", rotulo: "Converter para número" },
  { id: "data_iso", rotulo: "Data → ISO (aaaa-mm-dd)" },
  { id: "booleano", rotulo: "Converter para booleano" },
] as const;
export type TransformId = (typeof TRANSFORMS)[number]["id"];

export type FieldMapping = {
  id?: string;
  connector_id?: string;
  agregado: SyncAggregate;
  campo_origem: string;
  campo_destino: string;
  transformacao: TransformId | string;
  obrigatorio: boolean;
  validacao?: string | null;
  chave_deduplicacao: boolean;
  valor_padrao?: string | null;
  ordem?: number;
};

/** Lê caminhos aninhados: `aluno.responsavel.nome`. */
export function pick(row: Record<string, any>, path: string): unknown {
  return path.split(".").reduce<any>((acc, k) => (acc == null ? undefined : acc[k]), row);
}

export function applyTransform(value: unknown, transform: string): unknown {
  if (value == null || value === "") return value;
  const s = String(value);
  switch (transform) {
    case "trim":
      return s.trim();
    case "maiuscula":
      return s.toUpperCase();
    case "minuscula":
      return s.toLowerCase();
    case "titulo":
      return s
        .toLowerCase()
        .split(/\s+/)
        .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
        .join(" ");
    case "somente_digitos":
      return s.replace(/\D/g, "");
    case "numero": {
      const n = Number(s.replace(/\./g, "").replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    case "data_iso": {
      const br = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
      if (br) return `${br[3]}-${br[2]}-${br[1]}`;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    case "booleano":
      return ["1", "true", "sim", "s", "ativo", "y"].includes(s.trim().toLowerCase());
    default:
      return s;
  }
}

export type MappedRow = {
  indice: number;
  registro: Record<string, unknown>;
  chave: string;
  erros: string[];
  duplicado: boolean;
};

export type MappingResult = {
  linhas: MappedRow[];
  validos: number;
  rejeitados: number;
  duplicados: number;
  errosPorCampo: Record<string, number>;
};

/** Aplica mapeamentos, valida e detecta duplicidades (dentro do lote e contra chaves já conhecidas). */
export function applyMappings(
  rows: Array<Record<string, any>>,
  mappings: FieldMapping[],
  chavesConhecidas: string[] = [],
): MappingResult {
  const dedupe = mappings.filter((m) => m.chave_deduplicacao).map((m) => m.campo_destino);
  const vistos = new Set(chavesConhecidas.map((k) => k.toLowerCase()));
  const errosPorCampo: Record<string, number> = {};
  const linhas: MappedRow[] = [];

  rows.forEach((row, indice) => {
    const registro: Record<string, unknown> = {};
    const erros: string[] = [];

    for (const m of mappings) {
      let valor = applyTransform(pick(row, m.campo_origem), m.transformacao);
      if ((valor == null || valor === "") && m.valor_padrao) valor = m.valor_padrao;

      if (m.obrigatorio && (valor == null || valor === "")) {
        erros.push(`${m.campo_destino}: obrigatório ausente`);
        errosPorCampo[m.campo_destino] = (errosPorCampo[m.campo_destino] ?? 0) + 1;
      } else if (m.validacao && valor != null && valor !== "") {
        let ok = true;
        try {
          ok = new RegExp(m.validacao).test(String(valor));
        } catch {
          erros.push(`${m.campo_destino}: expressão de validação inválida`);
          ok = true;
        }
        if (!ok) {
          erros.push(`${m.campo_destino}: valor "${String(valor)}" não passou na validação`);
          errosPorCampo[m.campo_destino] = (errosPorCampo[m.campo_destino] ?? 0) + 1;
        }
      }
      registro[m.campo_destino] = valor ?? null;
    }

    const chave = (dedupe.length ? dedupe : Object.keys(registro).slice(0, 1))
      .map((c) => String(registro[c] ?? ""))
      .join("|")
      .toLowerCase();

    const duplicado = chave.replace(/\|/g, "") !== "" && vistos.has(chave);
    if (!duplicado) vistos.add(chave);

    linhas.push({ indice, registro, chave, erros, duplicado });
  });

  return {
    linhas,
    validos: linhas.filter((l) => l.erros.length === 0 && !l.duplicado).length,
    rejeitados: linhas.filter((l) => l.erros.length > 0).length,
    duplicados: linhas.filter((l) => l.duplicado).length,
    errosPorCampo,
  };
}

/** Evento de domínio emitido por agregado sincronizado. */
export const AGGREGATE_EVENT: Record<SyncAggregate, DomainEventName> = {
  student: "StudentUpdated",
  school: "SchoolUpdated",
  grade: "GradeUpdated",
};

/* ---------------------- Categorização de erros para indicadores ---------------------- */

export const ERROR_CATEGORIES = [
  { id: "autenticacao", rotulo: "Autenticação" },
  { id: "rede", rotulo: "Rede / indisponibilidade" },
  { id: "timeout", rotulo: "Tempo limite" },
  { id: "http", rotulo: "Resposta HTTP inválida" },
  { id: "configuracao", rotulo: "Configuração" },
  { id: "dados", rotulo: "Qualidade de dados" },
  { id: "outro", rotulo: "Não classificado" },
] as const;
export type ErrorCategory = (typeof ERROR_CATEGORIES)[number]["id"];

export function categorizeError(mensagem?: string | null): ErrorCategory {
  const m = (mensagem ?? "").toLowerCase();
  if (!m) return "outro";
  if (/(401|403|unauthorized|forbidden|token|credencial|autentic)/.test(m)) return "autenticacao";
  if (/(tempo limite|timeout|abort)/.test(m)) return "timeout";
  if (/(enotfound|econnrefused|dns|network|fetch failed|indispon)/.test(m)) return "rede";
  if (/(http [45]\d\d|status \d\d\d)/.test(m)) return "http";
  if (/(não informado|ausente|obrigat|parâmetro|configura|wsdl|base)/.test(m)) return "configuracao";
  if (/(validação|duplicid|duplicad|json|formato|registro)/.test(m)) return "dados";
  return "outro";
}
