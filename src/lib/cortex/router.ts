/**
 * Roteador cognitivo — decide qual modelo usar para cada tarefa,
 * respeitando custo, privacidade (LGPD) e complexidade.
 */
export type RotaRouter =
  | { rota: "local"; modelo: string; motivo: string }
  | { rota: "premium"; modelo: string; motivo: string }
  | { rota: "multimodal"; modelo: string; motivo: string };

export type TipoArquivo = "imagem" | "pdf" | "audio" | "planilha" | "texto";

/** Modelos elegíveis por tipo de arquivo (todos disponíveis no gateway Lovable AI). */
export const MODELOS_POR_TIPO: Record<TipoArquivo, string[]> = {
  imagem: ["google/gemini-3.8-flash", "google/gemini-3.1-pro-preview", "google/gemini-3.1-flash-lite"],
  pdf: ["google/gemini-3.8-flash", "google/gemini-3.1-pro-preview", "google/gemini-3.1-flash-lite"],
  audio: ["google/gemini-3.5-transcribe", "openai/gpt-4o-transcribe", "google/gemini-3.8-flash"],
  planilha: ["google/gemini-3.1-flash-lite", "google/gemini-3.8-flash"],
  texto: ["google/gemini-3.1-flash-lite", "google/gemini-3.8-flash"],
};

/** Modelo padrão por tipo, usado quando não há configuração salva. */
export const MODELO_PADRAO_POR_TIPO: Record<TipoArquivo, string> = {
  imagem: "google/gemini-3.8-flash",
  pdf: "google/gemini-3.8-flash",
  audio: "google/gemini-3.5-transcribe",
  planilha: "google/gemini-3.1-flash-lite",
  texto: "google/gemini-3.1-flash-lite",
};

export const MODELO_SENSIVEL = "google/gemini-3.1-flash-lite";

export const MODELOS_ANALISE = [
  "google/gemini-3.1-pro-preview",
  "google/gemini-3.8-flash",
  "openai/gpt-6-astra",
];
export const MODELO_ANALISE_PADRAO = "google/gemini-3.1-pro-preview";

export type ConfigModelos = {
  porTipo?: Partial<Record<TipoArquivo, string>>;
  analise?: string;
  /** Quando true (padrão), conteúdo sensível é forçado ao modelo econômico restrito. */
  sensivelLocal?: boolean;
};

const ROTA_POR_TIPO: Record<TipoArquivo, RotaRouter["rota"]> = {
  imagem: "multimodal",
  pdf: "multimodal",
  audio: "multimodal",
  planilha: "local",
  texto: "local",
};

const DESCRICAO_TIPO: Record<TipoArquivo, string> = {
  imagem: "Imagem — pipeline multimodal com OCR e análise estrutural.",
  pdf: "PDF — leitura multimodal do documento.",
  audio: "Áudio — transcrição de fala e análise de tom.",
  planilha: "Planilha — extração tabular e sumarização.",
  texto: "Texto simples — extração de entidades e sumarização.",
};

export function rotearIngestao(input: {
  mime: string;
  tamanhoBytes: number;
  sensivel: boolean;
  config?: ConfigModelos;
  /** Modelo escolhido manualmente para este arquivo (sobrepõe a configuração). */
  modeloManual?: string;
}): RotaRouter {
  const { mime, tamanhoBytes, sensivel, config, modeloManual } = input;
  const tipo = detectarTipo(mime);
  const sensivelLocal = config?.sensivelLocal ?? true;

  if (sensivel && sensivelLocal && !modeloManual) {
    return {
      rota: "local",
      modelo: MODELO_SENSIVEL,
      motivo: "Dado marcado como sensível (LGPD) — mantém prompt restrito no modelo econômico.",
    };
  }

  const modelo =
    modeloManual ?? config?.porTipo?.[tipo] ?? MODELO_PADRAO_POR_TIPO[tipo];

  const origem = modeloManual
    ? "modelo definido manualmente no upload"
    : config?.porTipo?.[tipo]
      ? "modelo definido nas configurações para este tipo de arquivo"
      : "modelo padrão do tipo";

  return {
    rota: ROTA_POR_TIPO[tipo],
    modelo,
    motivo: `${DESCRICAO_TIPO[tipo]} (${(tamanhoBytes / 1024).toFixed(1)} KB) — ${origem}.`,
  };
}

export function rotearAnaliseFinal(
  publico: "direcao" | "professores" | "pais",
  config?: ConfigModelos,
): RotaRouter {
  return {
    rota: "premium",
    modelo: config?.analise ?? MODELO_ANALISE_PADRAO,
    motivo: `Raciocínio consolidado nos 3 eixos para o público "${publico}".`,
  };
}

export function detectarTipo(mime: string): TipoArquivo {
  if (mime.startsWith("image/")) return "imagem";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("audio/") || mime === "video/webm" || mime === "video/mp4") return "audio";
  if (mime.includes("csv") || mime.includes("excel") || mime.includes("spreadsheet")) return "planilha";
  return "texto";
}

/** Container do áudio exigido pelo bloco input_audio do gateway. */
export function formatoAudio(mime: string, nome: string): string {
  const m = mime.toLowerCase();
  if (m.includes("wav")) return "wav";
  if (m.includes("mpeg") || m.includes("mp3")) return "mp3";
  if (m.includes("webm")) return "webm";
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "m4a";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("flac")) return "flac";
  const ext = nome.split(".").pop()?.toLowerCase();
  if (ext && ["wav", "mp3", "webm", "m4a", "ogg", "aac", "flac"].includes(ext)) return ext;
  return "mp3";
}
