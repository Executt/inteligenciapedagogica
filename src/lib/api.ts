// Mock API layer — pronto para futura conexão com backend Node.js
// Rotas lógicas: /api/v1/import/gov-data, /api/v1/students/:id/metrics, /api/v1/ai/generate-report
import {
  escolas, turmas, alunos, getEscolaKPIs, getDesempenhoTurmas, getEvolucaoMensal,
  getHeatmapTurma, getAlunoNotasTimeline, getSocioemocional, getIntervencoes, getSugestoesIA,
  type Escola, type Turma, type Aluno,
} from "./mock-data";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// GET /api/v1/entidades/escolas
export async function fetchEscolas(): Promise<Escola[]> {
  await delay(350);
  return escolas;
}
export async function fetchTurmas(escolaId?: string): Promise<Turma[]> {
  await delay(300);
  return escolaId ? turmas.filter((t) => t.escolaId === escolaId) : turmas;
}
export async function fetchAlunos(turmaId?: string): Promise<Aluno[]> {
  await delay(300);
  return turmaId ? alunos.filter((a) => a.turmaId === turmaId) : alunos;
}
export async function fetchAluno(id: string): Promise<Aluno | undefined> {
  await delay(250);
  return alunos.find((a) => a.id === id);
}
export async function fetchTurma(id: string): Promise<Turma | undefined> {
  await delay(250);
  return turmas.find((t) => t.id === id);
}

// GET /api/v1/escolas/:id/kpis
export async function fetchEscolaDashboard(escolaId: string) {
  await delay(500);
  return {
    kpis: getEscolaKPIs(escolaId),
    desempenhoTurmas: getDesempenhoTurmas(),
    evolucao: getEvolucaoMensal(),
  };
}

// GET /api/v1/turmas/:id/analytics
export async function fetchTurmaAnalytics(turmaId: string) {
  await delay(500);
  const alunosTurma = alunos.filter((a) => a.turmaId === turmaId);
  return {
    turma: turmas.find((t) => t.id === turmaId),
    heatmap: getHeatmapTurma(turmaId),
    alunos: alunosTurma,
    atencaoImediata: alunosTurma.filter((a) => a.risco !== "baixo"),
  };
}

// GET /api/v1/students/:id/metrics
export async function fetchAlunoMetrics(alunoId: string) {
  await delay(500);
  return {
    aluno: alunos.find((a) => a.id === alunoId),
    timeline: getAlunoNotasTimeline(alunoId),
    socioemocional: getSocioemocional(alunoId),
    intervencoes: getIntervencoes(alunoId),
  };
}

// GET /api/v1/ai/sugestoes
export async function fetchSugestoesIA() {
  await delay(600);
  return getSugestoesIA();
}

// POST /api/v1/import/gov-data
export async function uploadDocumento(_file: File, onProgress?: (p: number) => void) {
  for (let p = 0; p <= 100; p += 8) {
    await delay(120);
    onProgress?.(Math.min(p, 100));
  }
  return { ok: true, jobId: `job_${Date.now()}`, ocrStatus: "PROCESSADO" };
}

// POST /api/v1/ai/generate-report
export async function generateReport(payload: {
  publico: "direcao" | "professores" | "pais";
  escopo: string;
}) {
  await delay(1200);
  const tomMap = {
    direcao: "estratégico, com métricas agregadas e recomendações macro",
    professores: "operacional, com foco pedagógico e ações por disciplina",
    pais: "acolhedor, em linguagem acessível e sem jargão técnico",
  };
  return {
    id: `rep_${Date.now()}`,
    publico: payload.publico,
    escopo: payload.escopo,
    tom: tomMap[payload.publico],
    corpo: `Relatório ${payload.publico.toUpperCase()} — ${payload.escopo}\n\nGerado com tom ${tomMap[payload.publico]}. Cruzamento de 428 pontos de dados (notas, frequência, relatos e documentos OCR). Recomenda-se leitura conjunta com o Painel de Intervenção Pedagógica.`,
  };
}
