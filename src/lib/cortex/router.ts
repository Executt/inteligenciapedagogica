/**
 * Roteador cognitivo — decide qual modelo usar para cada tarefa,
 * respeitando custo, privacidade (LGPD) e complexidade.
 */
export type RotaRouter =
  | { rota: "local"; modelo: string; motivo: string }
  | { rota: "premium"; modelo: string; motivo: string }
  | { rota: "multimodal"; modelo: string; motivo: string };

export function rotearIngestao(input: {
  mime: string;
  tamanhoBytes: number;
  sensivel: boolean;
}): RotaRouter {
  const { mime, tamanhoBytes, sensivel } = input;
  if (sensivel) {
    return {
      rota: "local",
      modelo: "google/gemini-3.1-flash-lite",
      motivo: "Dado marcado como sensível (LGPD) — mantém prompt restrito no modelo econômico.",
    };
  }
  if (mime.startsWith("image/")) {
    return {
      rota: "multimodal",
      modelo: "google/gemini-2.5-flash",
      motivo: "Imagem — pipeline multimodal com OCR e análise estrutural.",
    };
  }
  if (mime === "application/pdf") {
    return {
      rota: "multimodal",
      modelo: "google/gemini-2.5-flash",
      motivo: `PDF (${(tamanhoBytes / 1024).toFixed(1)} KB) — leitura multimodal do documento.`,
    };
  }
  return {
    rota: "local",
    modelo: "google/gemini-3.1-flash-lite",
    motivo: "Texto simples — extração de entidades e sumarização no modelo econômico.",
  };
}

export function rotearAnaliseFinal(publico: "direcao" | "professores" | "pais"): RotaRouter {
  return {
    rota: "premium",
    modelo: "google/gemini-2.5-pro",
    motivo: `Raciocínio consolidado nos 3 eixos para o público "${publico}".`,
  };
}

export function detectarTipo(mime: string): "imagem" | "pdf" | "texto" | "planilha" {
  if (mime.startsWith("image/")) return "imagem";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("csv") || mime.includes("excel") || mime.includes("spreadsheet")) return "planilha";
  return "texto";
}
