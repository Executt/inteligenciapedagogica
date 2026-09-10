# Retenção por escola + conectores de RH e Matrículas

Quatro entregas ligadas entre si: intervenções passam a ser dados reais do banco, alimentam o Painel de Indicadores, ganham uma visão por unidade escolar e aparecem no dossiê do aluno. Em paralelo, dois conectores oficiais (RH e Matrículas) trazem servidores, alunos, turmas e frequência para a plataforma pelo barramento de eventos.

## 1. Intervenções como dado real

- Nova tabela de intervenções ligada ao aluno e à unidade escolar, com data, tipo de contato, resultado, categoria da causa, observações, próximos passos e responsável (usuário logado).
- Tela "Registrar Intervenção" deixa de ser simulada: o campo Aluno passa a buscar alunos reais da rede (nome/matrícula) e o registro é gravado no banco, com mensagem de sucesso e limpeza do formulário como hoje.
- Acesso: cada profissional vê e registra intervenções das unidades a que está vinculado; direção e administração veem a rede toda.

## 2. Painel de Indicadores com dados reais

- Indicadores (intervenções no mês, alunos em risco, efetividade, taxa de evasão) calculados a partir das intervenções, matrículas e frequência gravadas.
- Gráficos de causas, canais de contato e evolução mensal passam a refletir os registros reais; quando ainda não houver dados, aparece o estado vazio padrão da aplicação em vez de números fictícios.
- O gráfico por escola fica clicável e leva à nova tela da unidade.

## 3. Tela de retenção por escola

- Nova aba "Por Escola" com lista das 91 unidades e seus números de retenção; ao escolher uma unidade, abre a visão detalhada:
  - resumo da unidade (alunos, alunos em risco, frequência média, intervenções no período);
  - intervenções da unidade em tabela com filtros por período, resultado e causa;
  - distribuição das causas e efetividade por canal de contato e por responsável;
  - lista dos alunos em risco da unidade com atalho para o dossiê e para registrar intervenção.

## 4. Intervenções no dossiê do aluno

- Nova seção no dossiê listando o histórico de intervenções do aluno (data, canal, resultado, causa, responsável, próximos passos) e um atalho para registrar nova intervenção já com o aluno preenchido.
- O Edu-Córtex passa a considerar esse histórico como fonte adicional na análise socioemocional.

## 5. Conector do sistema de RH da Secretaria

- Conector no Integration Hub com dois agregados novos: servidor (matrícula, nome, cargo, situação, contato) e lotação (servidor + unidade escolar + carga horária + disciplina).
- Mapeamentos prontos para os campos habituais de folha/RH, deduplicação por matrícula, validação de vínculo com unidade existente.
- Sincronização publica eventos no barramento; um consumidor grava/atualiza servidores e lotações nas tabelas oficiais, registrando inconsistências quando a unidade não existe.
- Agendamento, histórico de execuções, logs e teste de conexão reaproveitam o que já existe no Hub.

## 6. Conector do sistema de Matrículas da Secretaria

- Conector com os agregados aluno, turma, matrícula e frequência.
- Consumidores do barramento materializam: alunos, turmas por unidade/ano letivo/turno, matrículas (aluno + turma) e frequência mensal por aluno.
- Deduplicação por código do aluno e código da turma; transferências entre unidades atualizam a matrícula em vez de duplicar o aluno.
- A frequência importada alimenta diretamente o cálculo de alunos em risco da Retenção Estudantil.

## Detalhes técnicos

- Migrações: tabelas `intervencoes` e `frequencias`; índices por aluno, escola e data; GRANTs e políticas RLS por papel; triggers de `updated_at`.
- Contratos do Hub estendidos: agregados `teacher`, `staff_assignment`, `class`, `enrollment`, `attendance` em `src/lib/hub/mapping.ts`, com eventos correspondentes em `src/lib/hub/events.ts` (`TeacherCreated`, `StaffAssignmentUpdated`, `ClassCreated`, `EnrollmentUpdated`, `AttendanceImported`).
- Novo consumidor `src/lib/hub/consumers.functions.ts`: lê `hub_events` pendentes, aplica upsert idempotente nas tabelas do Core Platform, grava `hub_event_deliveries` e `importacao_inconsistencias`.
- Presets de conector em `src/lib/hub/presets.ts` (RH e Matrículas) com adaptador REST padrão, parâmetros e mapeamentos sugeridos, criados a partir de um botão "Usar modelo" no Integration Hub.
- Server functions novas: `src/lib/retencao/intervencoes.functions.ts` (criar, listar por aluno/escola, buscar alunos) e `src/lib/retencao/indicadores.functions.ts` (KPIs, séries, causas, canais, ranking por escola).
- Rotas novas: `src/routes/retencao.escolas.tsx` e `src/routes/retencao.escola.$id.tsx`, seguindo `ChartFrame`, `DataTable`, tokens Horizon e `head()` próprio.
- `src/lib/retencao-data.ts` deixa de alimentar as telas e fica apenas como referência de tipos/estado vazio.
