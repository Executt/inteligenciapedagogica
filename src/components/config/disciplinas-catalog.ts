/** Catálogo base de disciplinas e unidades escolares (Edu-Gov). */

export type Etapa = "fundamental" | "medio";

export type Disciplina = {
  id: string;
  nome: string;
  codigo: string;
  area: string;
  etapas: Etapa[];
  cargaHoraria: number;
  ativa: boolean;
  recursos: Recurso[];
};

export type Recurso = {
  id: string;
  titulo: string;
  tipo: "livro" | "documento" | "apostila" | "video" | "bncc";
  referencia: string;
  ano?: number;
};

export const ETAPA_LABEL: Record<Etapa, string> = {
  fundamental: "Ensino Fundamental",
  medio: "Ensino Médio",
};

export const AREAS = [
  "Linguagens",
  "Matemática",
  "Ciências da Natureza",
  "Ciências Humanas",
  "Ensino Religioso",
  "Formação Técnica e Profissional",
  "Itinerários Formativos",
] as const;

export const UNIDADES_ESCOLARES = [
  { id: "u1", nome: "EE Prof. Ana Rosa Gonçalves", inep: "35004521", municipio: "São Paulo" },
  { id: "u2", nome: "EE Dom Pedro II", inep: "35010877", municipio: "São Paulo" },
  { id: "u3", nome: "EMEF Vila Progresso", inep: "35022190", municipio: "Guarulhos" },
  { id: "u4", nome: "EE Cel. Fernando Prestes", inep: "35031044", municipio: "Campinas" },
  { id: "u5", nome: "CEU Jardim Paulista", inep: "35044812", municipio: "São Paulo" },
  { id: "u6", nome: "EE Monteiro Lobato", inep: "35055123", municipio: "Osasco" },
];

function d(
  id: string,
  nome: string,
  codigo: string,
  area: string,
  etapas: Etapa[],
  cargaHoraria: number,
  recursos: Recurso[] = [],
): Disciplina {
  return { id, nome, codigo, area, etapas, cargaHoraria, ativa: true, recursos };
}

/** Catálogo completo pré-cadastrado, conforme BNCC (Fundamental Anos Finais e Médio). */
export const DISCIPLINAS_SEED: Disciplina[] = [
  d("d01", "Língua Portuguesa", "LP", "Linguagens", ["fundamental", "medio"], 200, [
    { id: "r1", titulo: "BNCC — Língua Portuguesa", tipo: "bncc", referencia: "MEC/BNCC v2018 · cap. 4.1", ano: 2018 },
    { id: "r2", titulo: "Português Contemporâneo — Diálogo, Reflexão e Uso", tipo: "livro", referencia: "PNLD 2021 · Ed. Moderna", ano: 2021 },
  ]),
  d("d02", "Arte", "ART", "Linguagens", ["fundamental", "medio"], 80),
  d("d03", "Educação Física", "EDF", "Linguagens", ["fundamental", "medio"], 80),
  d("d04", "Língua Inglesa", "ING", "Linguagens", ["fundamental", "medio"], 80, [
    { id: "r3", titulo: "It Fits — Inglês", tipo: "livro", referencia: "PNLD 2021 · Ed. FTD", ano: 2021 },
  ]),
  d("d05", "Língua Espanhola", "ESP", "Linguagens", ["medio"], 40),
  d("d06", "Matemática", "MAT", "Matemática", ["fundamental", "medio"], 200, [
    { id: "r4", titulo: "BNCC — Matemática", tipo: "bncc", referencia: "MEC/BNCC v2018 · cap. 4.3", ano: 2018 },
    { id: "r5", titulo: "Matemática Contexto & Aplicações", tipo: "livro", referencia: "PNLD 2021 · Ed. Ática", ano: 2021 },
    { id: "r6", titulo: "Caderno de recomposição de aprendizagem", tipo: "documento", referencia: "SEDUC-SP · 2025", ano: 2025 },
  ]),
  d("d07", "Ciências", "CIE", "Ciências da Natureza", ["fundamental"], 120),
  d("d08", "Biologia", "BIO", "Ciências da Natureza", ["medio"], 80),
  d("d09", "Física", "FIS", "Ciências da Natureza", ["medio"], 80),
  d("d10", "Química", "QUI", "Ciências da Natureza", ["medio"], 80),
  d("d11", "História", "HIS", "Ciências Humanas", ["fundamental", "medio"], 80, [
    { id: "r7", titulo: "História, Sociedade & Cidadania", tipo: "livro", referencia: "PNLD 2021 · Ed. FTD", ano: 2021 },
  ]),
  d("d12", "Geografia", "GEO", "Ciências Humanas", ["fundamental", "medio"], 80),
  d("d13", "Filosofia", "FIL", "Ciências Humanas", ["medio"], 40),
  d("d14", "Sociologia", "SOC", "Ciências Humanas", ["medio"], 40),
  d("d15", "Ensino Religioso", "ERE", "Ensino Religioso", ["fundamental"], 40),
  d("d16", "Projeto de Vida", "PDV", "Itinerários Formativos", ["fundamental", "medio"], 80),
  d("d17", "Tecnologia e Inovação", "TEC", "Itinerários Formativos", ["fundamental", "medio"], 40),
  d("d18", "Educação Financeira", "EFI", "Itinerários Formativos", ["fundamental", "medio"], 40),
  d("d19", "Redação e Produção Textual", "RED", "Linguagens", ["medio"], 40),
  d("d20", "Empreendedorismo", "EMP", "Formação Técnica e Profissional", ["medio"], 40),
  d("d21", "Mundo do Trabalho", "MDT", "Formação Técnica e Profissional", ["medio"], 40),
  d("d22", "Iniciação Científica", "ICI", "Itinerários Formativos", ["medio"], 40),
  d("d23", "Libras", "LIB", "Linguagens", ["fundamental", "medio"], 40),
  d("d24", "Robótica Educacional", "ROB", "Itinerários Formativos", ["fundamental", "medio"], 40),
];

export const DISCIPLINAS_SETTING_KEY = "academico.disciplinas";
export const PROFISSIONAIS_SETTING_KEY = "academico.profissionais";
