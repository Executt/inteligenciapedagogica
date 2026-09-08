// Dados mockados do Portal de Retenção Estudantil (pt-BR)

export type RiscoNivel = "alto" | "medio" | "baixo";

export type AlunoRisco = {
  id: string;
  nome: string;
  matricula: string;
  turma: string;
  escola: string;
  responsavel: string;
  telefone: string;
  frequencia: number;
  mediaGeral: number;
  faltasConsecutivas: number;
  risco: RiscoNivel;
  causaProvavel: string;
  ultimoContato: string;
  statusIntervencao: "Pendente" | "Em andamento" | "Resolvido";
};

export const retencaoKPIs = {
  taxaEvasao: 4.7,
  taxaEvasaoDelta: -0.8,
  alunosRisco: 128,
  alunosRiscoDelta: -12,
  intervencoesMes: 214,
  intervencoesMesDelta: 31,
  taxaRecuperacao: 68.4,
  taxaRecuperacaoDelta: 5.2,
};

export const evolucaoRetencao = [
  { mes: "Fev", evasao: 6.1, retencao: 93.9, intervencoes: 96 },
  { mes: "Mar", evasao: 5.8, retencao: 94.2, intervencoes: 124 },
  { mes: "Abr", evasao: 5.9, retencao: 94.1, intervencoes: 131 },
  { mes: "Mai", evasao: 5.4, retencao: 94.6, intervencoes: 158 },
  { mes: "Jun", evasao: 5.5, retencao: 94.5, intervencoes: 147 },
  { mes: "Jul", evasao: 5.2, retencao: 94.8, intervencoes: 118 },
  { mes: "Ago", evasao: 5.0, retencao: 95.0, intervencoes: 176 },
  { mes: "Set", evasao: 4.7, retencao: 95.3, intervencoes: 214 },
];

export const evasaoPorEscola = [
  { escola: "EMEF Machado de Assis", evasao: 3.2, risco: 18 },
  { escola: "EMEF Cecília Meireles", evasao: 4.1, risco: 22 },
  { escola: "EE Paulo Freire", evasao: 6.8, risco: 47 },
  { escola: "EMEF Monteiro Lobato", evasao: 5.4, risco: 26 },
  { escola: "EMEF Carlos Drummond", evasao: 3.9, risco: 15 },
];

export const causasEvasao = [
  { causa: "Pedagógica", casos: 46 },
  { causa: "Familiar", casos: 34 },
  { causa: "Financeira", casos: 23 },
  { causa: "Saúde", casos: 15 },
  { causa: "Outros", casos: 10 },
];

export const canaisContato = [
  { canal: "WhatsApp", sucesso: 118, semResposta: 41 },
  { canal: "Ligação", sucesso: 62, semResposta: 55 },
  { canal: "E-mail", sucesso: 28, semResposta: 63 },
  { canal: "Presencial", sucesso: 44, semResposta: 9 },
];

export const alunosRisco: AlunoRisco[] = [
  { id: "ar1", nome: "Lucas Henrique Silva", matricula: "2026004512", turma: "6º B", escola: "EE Paulo Freire", responsavel: "Roberto Silva (pai)", telefone: "(11) 98812-4471", frequencia: 68, mediaGeral: 4.6, faltasConsecutivas: 7, risco: "alto", causaProvavel: "Familiar", ultimoContato: "2026-09-02", statusIntervencao: "Em andamento" },
  { id: "ar2", nome: "Mariana Costa Souza", matricula: "2026004833", turma: "9º B", escola: "EE Paulo Freire", responsavel: "Luciana Souza (mãe)", telefone: "(11) 99145-2210", frequencia: 71, mediaGeral: 5.1, faltasConsecutivas: 5, risco: "alto", causaProvavel: "Pedagógica", ultimoContato: "2026-08-28", statusIntervencao: "Pendente" },
  { id: "ar3", nome: "Enzo Barbosa Pereira", matricula: "2026003147", turma: "8º A", escola: "EMEF Monteiro Lobato", responsavel: "Rogério Pereira (pai)", telefone: "(11) 97733-8090", frequencia: 74, mediaGeral: 5.4, faltasConsecutivas: 4, risco: "alto", causaProvavel: "Financeira", ultimoContato: "2026-09-04", statusIntervencao: "Em andamento" },
  { id: "ar4", nome: "Helena Carvalho Dias", matricula: "2026002890", turma: "7º A", escola: "EMEF Cecília Meireles", responsavel: "Patrícia Lima (mãe)", telefone: "(11) 98120-3355", frequencia: 79, mediaGeral: 6.0, faltasConsecutivas: 3, risco: "medio", causaProvavel: "Saúde", ultimoContato: "2026-08-19", statusIntervencao: "Em andamento" },
  { id: "ar5", nome: "Miguel Araújo Rocha", matricula: "2026001204", turma: "5º B", escola: "EMEF Machado de Assis", responsavel: "Cristina Ribeiro (mãe)", telefone: "(11) 96604-7712", frequencia: 82, mediaGeral: 6.2, faltasConsecutivas: 2, risco: "medio", causaProvavel: "Pedagógica", ultimoContato: "2026-09-01", statusIntervencao: "Pendente" },
  { id: "ar6", nome: "Sofia Martins Cardoso", matricula: "2026003620", turma: "6º A", escola: "EE Paulo Freire", responsavel: "Fernanda Cardoso (mãe)", telefone: "(11) 98455-9902", frequencia: 84, mediaGeral: 6.4, faltasConsecutivas: 2, risco: "medio", causaProvavel: "Familiar", ultimoContato: "2026-08-25", statusIntervencao: "Resolvido" },
  { id: "ar7", nome: "Davi Gonçalves Pinto", matricula: "2026004070", turma: "9º A", escola: "EMEF Monteiro Lobato", responsavel: "André Nunes (pai)", telefone: "(11) 97012-6633", frequencia: 88, mediaGeral: 6.9, faltasConsecutivas: 1, risco: "baixo", causaProvavel: "Pedagógica", ultimoContato: "2026-08-12", statusIntervencao: "Resolvido" },
  { id: "ar8", nome: "Isabela Ramos Correia", matricula: "2026002455", turma: "5º A", escola: "EMEF Machado de Assis", responsavel: "Marcos Ferreira (pai)", telefone: "(11) 99688-1240", frequencia: 90, mediaGeral: 7.1, faltasConsecutivas: 0, risco: "baixo", causaProvavel: "Outros", ultimoContato: "2026-07-30", statusIntervencao: "Resolvido" },
  { id: "ar9", nome: "Théo Machado Andrade", matricula: "2026005011", turma: "8º A", escola: "EMEF Cecília Meireles", responsavel: "Luciana Souza (mãe)", telefone: "(11) 98221-0074", frequencia: 73, mediaGeral: 5.2, faltasConsecutivas: 6, risco: "alto", causaProvavel: "Pedagógica", ultimoContato: "2026-09-05", statusIntervencao: "Pendente" },
  { id: "ar10", nome: "Alice Monteiro Guerra", matricula: "2026005388", turma: "7º A", escola: "EE Paulo Freire", responsavel: "Cristina Ribeiro (mãe)", telefone: "(11) 96777-3311", frequencia: 81, mediaGeral: 6.1, faltasConsecutivas: 3, risco: "medio", causaProvavel: "Financeira", ultimoContato: "2026-08-30", statusIntervencao: "Em andamento" },
];

export type ConversaRetencao = {
  id: string;
  responsavel: string;
  aluno: string;
  canal: "WhatsApp" | "SMS" | "E-mail";
  naoLidas: number;
  ultimaMensagem: string;
  horario: string;
  mensagens: { id: string; de: "escola" | "responsavel"; texto: string; horario: string }[];
};

export const conversasRetencao: ConversaRetencao[] = [
  {
    id: "c1",
    responsavel: "Roberto Silva",
    aluno: "Lucas Henrique Silva · 6º B",
    canal: "WhatsApp",
    naoLidas: 2,
    ultimaMensagem: "Podemos conversar amanhã às 9h?",
    horario: "14:32",
    mensagens: [
      { id: "m1", de: "escola", texto: "Bom dia, Sr. Roberto. Notamos 7 faltas consecutivas do Lucas. Está tudo bem em casa?", horario: "09:12" },
      { id: "m2", de: "responsavel", texto: "Bom dia. Estamos passando por uma mudança de endereço, ficou difícil o transporte.", horario: "10:05" },
      { id: "m3", de: "escola", texto: "Entendemos. Podemos avaliar o passe escolar municipal e um plano de reposição das atividades.", horario: "11:40" },
      { id: "m4", de: "responsavel", texto: "Podemos conversar amanhã às 9h?", horario: "14:32" },
    ],
  },
  {
    id: "c2",
    responsavel: "Luciana Souza",
    aluno: "Mariana Costa Souza · 9º B",
    canal: "WhatsApp",
    naoLidas: 0,
    ultimaMensagem: "Obrigada pelo acompanhamento.",
    horario: "Ontem",
    mensagens: [
      { id: "m1", de: "escola", texto: "Olá, Luciana. A Mariana foi incluída no grupo de reforço de Matemática nas terças e quintas.", horario: "08:20" },
      { id: "m2", de: "responsavel", texto: "Obrigada pelo acompanhamento.", horario: "08:44" },
    ],
  },
  {
    id: "c3",
    responsavel: "Rogério Pereira",
    aluno: "Enzo Barbosa Pereira · 8º A",
    canal: "SMS",
    naoLidas: 1,
    ultimaMensagem: "Não consegui comparecer à reunião.",
    horario: "Seg",
    mensagens: [
      { id: "m1", de: "escola", texto: "Sr. Rogério, confirmamos a reunião de segunda às 15h com a coordenação.", horario: "13:00" },
      { id: "m2", de: "responsavel", texto: "Não consegui comparecer à reunião.", horario: "16:22" },
    ],
  },
  {
    id: "c4",
    responsavel: "Patrícia Lima",
    aluno: "Helena Carvalho Dias · 7º A",
    canal: "E-mail",
    naoLidas: 0,
    ultimaMensagem: "Enviei o atestado médico em anexo.",
    horario: "19/08",
    mensagens: [
      { id: "m1", de: "responsavel", texto: "Enviei o atestado médico em anexo.", horario: "10:11" },
      { id: "m2", de: "escola", texto: "Recebido, obrigado. As faltas serão justificadas e o material será disponibilizado.", horario: "10:58" },
    ],
  },
];

export const respostasRapidas = [
  "Confirmar reunião com a coordenação",
  "Solicitar justificativa de faltas",
  "Informar grupo de reforço",
  "Enviar orientações de transporte escolar",
];
