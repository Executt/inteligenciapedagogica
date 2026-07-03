// Realistic mock data for Edu-Gov (pt-BR)

export type Escola = {
  id: string;
  nome: string;
  codigoInep: string;
  municipio: string;
  totalAlunos: number;
  totalTurmas: number;
};

export type Turma = {
  id: string;
  nome: string;
  ano: string;
  turno: "Manhã" | "Tarde" | "Noite";
  escolaId: string;
  totalAlunos: number;
  mediaGeral: number;
};

export type Aluno = {
  id: string;
  nome: string;
  matricula: string;
  turmaId: string;
  idade: number;
  responsavel: string;
  risco: "baixo" | "medio" | "alto";
  mediaGeral: number;
  frequencia: number;
};

export const escolas: Escola[] = [
  { id: "e1", nome: "EMEF Machado de Assis", codigoInep: "35123456", municipio: "São Paulo - SP", totalAlunos: 842, totalTurmas: 28 },
  { id: "e2", nome: "EMEF Cecília Meireles", codigoInep: "35123457", municipio: "São Paulo - SP", totalAlunos: 612, totalTurmas: 21 },
  { id: "e3", nome: "EE Paulo Freire", codigoInep: "35123458", municipio: "Guarulhos - SP", totalAlunos: 1104, totalTurmas: 36 },
  { id: "e4", nome: "EMEF Monteiro Lobato", codigoInep: "35123459", municipio: "Osasco - SP", totalAlunos: 528, totalTurmas: 18 },
];

export const turmas: Turma[] = [
  { id: "t1", nome: "5º A", ano: "5º ano", turno: "Manhã", escolaId: "e1", totalAlunos: 28, mediaGeral: 7.4 },
  { id: "t2", nome: "5º B", ano: "5º ano", turno: "Manhã", escolaId: "e1", totalAlunos: 30, mediaGeral: 6.8 },
  { id: "t3", nome: "6º A", ano: "6º ano", turno: "Manhã", escolaId: "e1", totalAlunos: 32, mediaGeral: 7.1 },
  { id: "t4", nome: "6º B", ano: "6º ano", turno: "Tarde", escolaId: "e1", totalAlunos: 29, mediaGeral: 6.2 },
  { id: "t5", nome: "7º A", ano: "7º ano", turno: "Tarde", escolaId: "e1", totalAlunos: 31, mediaGeral: 7.6 },
  { id: "t6", nome: "8º A", ano: "8º ano", turno: "Tarde", escolaId: "e1", totalAlunos: 27, mediaGeral: 7.9 },
  { id: "t7", nome: "9º A", ano: "9º ano", turno: "Manhã", escolaId: "e1", totalAlunos: 26, mediaGeral: 8.1 },
  { id: "t8", nome: "9º B", ano: "9º ano", turno: "Manhã", escolaId: "e1", totalAlunos: 28, mediaGeral: 5.9 },
];

const nomesBR = [
  "Ana Beatriz Ribeiro", "Lucas Henrique Silva", "Mariana Costa Souza", "Pedro Almeida Ferreira",
  "Júlia Rodrigues Lima", "Gabriel Oliveira Nunes", "Sofia Martins Cardoso", "Enzo Barbosa Pereira",
  "Helena Carvalho Dias", "Miguel Araújo Rocha", "Laura Fernandes Melo", "Davi Gonçalves Pinto",
  "Isabela Ramos Correia", "Arthur Teixeira Moura", "Manuela Vieira Castro", "Bernardo Pires Lopes",
  "Valentina Duarte Freitas", "Heitor Cunha Batista", "Cecília Nogueira Sales", "Théo Machado Andrade",
  "Alice Monteiro Guerra", "Ravi Cavalcanti Torres", "Lívia Farias Bittencourt", "Noah Sampaio Xavier",
  "Maitê Mendes Peixoto", "Benício Tavares Antunes", "Antonella Reis Coelho", "Samuel Franco Aguiar",
];

const responsaveis = [
  "Cristina Ribeiro (mãe)", "Roberto Silva (pai)", "Luciana Souza (mãe)", "Marcos Ferreira (pai)",
  "Patrícia Lima (mãe)", "André Nunes (pai)", "Fernanda Cardoso (mãe)", "Rogério Pereira (pai)",
];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const alunos: Aluno[] = (() => {
  const rand = seeded(42);
  const list: Aluno[] = [];
  let idx = 0;
  turmas.forEach((t) => {
    for (let i = 0; i < Math.min(t.totalAlunos, 12); i++) {
      const media = Math.max(2, Math.min(10, t.mediaGeral + (rand() - 0.5) * 4));
      const freq = Math.max(60, Math.min(100, 92 + (rand() - 0.5) * 25));
      const risco: Aluno["risco"] = media < 5 || freq < 75 ? "alto" : media < 6.5 || freq < 85 ? "medio" : "baixo";
      list.push({
        id: `a${idx + 1}`,
        nome: nomesBR[idx % nomesBR.length],
        matricula: `2025${String(1000 + idx).padStart(5, "0")}`,
        turmaId: t.id,
        idade: parseInt(t.ano) + 5 + Math.floor(rand() * 2),
        responsavel: responsaveis[idx % responsaveis.length],
        risco,
        mediaGeral: Number(media.toFixed(1)),
        frequencia: Number(freq.toFixed(1)),
      });
      idx++;
    }
  });
  return list;
})();

export const disciplinas = ["Português", "Matemática", "Ciências", "História", "Geografia", "Inglês", "Arte", "Ed. Física"];

export function getEscolaKPIs(_escolaId: string) {
  return {
    taxaRetencao: 92.4,
    mediaGeral: 7.2,
    alunosRisco: alunos.filter((a) => a.risco === "alto").length,
    totalAlunos: alunos.length,
    frequenciaMedia: 88.6,
    evasaoMensal: 1.8,
  };
}

export function getDesempenhoTurmas() {
  return turmas.map((t) => ({
    turma: t.nome,
    media: t.mediaGeral,
    frequencia: 85 + Math.random() * 12,
    aprovacao: 70 + Math.random() * 25,
  }));
}

export function getEvolucaoMensal() {
  const meses = ["Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov"];
  return meses.map((m, i) => ({
    mes: m,
    media: Number((6.5 + Math.sin(i / 2) * 0.6 + i * 0.05).toFixed(2)),
    frequencia: Number((88 + Math.cos(i / 2) * 3).toFixed(1)),
    evasao: Number((2.5 - i * 0.08 + Math.random() * 0.4).toFixed(2)),
  }));
}

export function getHeatmapTurma(turmaId: string) {
  const alunosTurma = alunos.filter((a) => a.turmaId === turmaId);
  const rand = seeded(turmaId.charCodeAt(1) * 31);
  return alunosTurma.map((a) => ({
    aluno: a.nome.split(" ")[0] + " " + a.nome.split(" ")[1]?.[0] + ".",
    id: a.id,
    ...Object.fromEntries(disciplinas.map((d) => [d, Number((a.mediaGeral + (rand() - 0.5) * 3).toFixed(1))])),
  }));
}

export function getAlunoNotasTimeline(alunoId: string) {
  const aluno = alunos.find((a) => a.id === alunoId);
  const base = aluno?.mediaGeral ?? 7;
  const bimestres = ["1º Bim", "2º Bim", "3º Bim", "4º Bim"];
  return bimestres.map((b, i) => ({
    bimestre: b,
    Português: Number((base + Math.sin(i) * 1.2).toFixed(1)),
    Matemática: Number((base - 0.5 + Math.cos(i) * 1.5).toFixed(1)),
    Ciências: Number((base + 0.3 + Math.sin(i / 2) * 1).toFixed(1)),
    História: Number((base + Math.cos(i / 3) * 0.8).toFixed(1)),
  }));
}

export function getSocioemocional(_alunoId: string) {
  return [
    { competencia: "Autoconhecimento", nivel: 72 },
    { competencia: "Colaboração", nivel: 85 },
    { competencia: "Empatia", nivel: 78 },
    { competencia: "Resiliência", nivel: 61 },
    { competencia: "Comunicação", nivel: 80 },
    { competencia: "Foco/Atenção", nivel: 54 },
  ];
}

export function getIntervencoes(alunoId: string) {
  return [
    { id: "i1", data: "2025-08-15", tipo: "Reforço", titulo: "Grupo de reforço em Matemática", responsavel: "Prof. Renata Alves", status: "concluído" },
    { id: "i2", data: "2025-09-02", tipo: "Família", titulo: "Reunião com responsáveis", responsavel: "Coord. Márcia Duarte", status: "concluído" },
    { id: "i3", data: "2025-10-10", tipo: "Psicopedagógico", titulo: "Encaminhamento ao NAAPA", responsavel: "Ana Paula (psicopedagoga)", status: "em andamento" },
    { id: "i4", data: "2025-11-04", tipo: "Acompanhamento", titulo: "Plano individualizado de leitura", responsavel: "Prof. Sérgio Matos", status: "planejado" },
  ].map((i) => ({ ...i, alunoId }));
}

export function getSugestoesIA() {
  return [
    {
      id: "s1",
      severidade: "alta" as const,
      titulo: "Reforço em letramento — 5º B",
      descricao: "Queda de 15% na média de Português nas últimas 3 avaliações. Sugerido plano de leitura orientada por 6 semanas com avaliação diagnóstica quinzenal.",
      alvo: "Turma 5º B · 30 alunos",
      base: "Cruzamento: notas trimestrais + relatos docentes (8 registros)",
    },
    {
      id: "s2",
      severidade: "alta" as const,
      titulo: "Acionar família — Lucas H. Silva",
      descricao: "Relatos consistentes de desatenção em 4 disciplinas e queda de frequência para 71%. Recomenda-se reunião com responsáveis nos próximos 5 dias.",
      alvo: "Aluno individual · 6º B",
      base: "Frequência + diários de classe + OCR de bilhetes",
    },
    {
      id: "s3",
      severidade: "media" as const,
      titulo: "Revisão de metodologia — Matemática 8º A",
      descricao: "Turma com desempenho abaixo do esperado em geometria (média 5,4). Sugerido uso de material manipulável e nivelamento por competências BNCC EF08MA.",
      alvo: "Turma 8º A · disciplina Matemática",
      base: "Notas por descritor + BNCC alignment",
    },
    {
      id: "s4",
      severidade: "baixa" as const,
      titulo: "Ampliar projeto de leitura — 9º A",
      descricao: "Turma apresenta ganho de 0,8 pontos após intervenção anterior. Recomenda-se replicar modelo em turmas do 8º ano.",
      alvo: "Boas práticas · 9º A",
      base: "Comparativo pré/pós intervenção",
    },
    {
      id: "s5",
      severidade: "media" as const,
      titulo: "Suporte socioemocional — 7º A",
      descricao: "Relatos de conflitos interpessoais frequentes. Sugere-se rodas de conversa semanais e formação docente em CNV.",
      alvo: "Turma 7º A",
      base: "NLP em relatos + ocorrências disciplinares",
    },
  ];
}
