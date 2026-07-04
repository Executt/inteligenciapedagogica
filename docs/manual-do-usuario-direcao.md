# Manual do Usuário — Direção Escolar

> Guia operacional da plataforma **Edu-Gov** para diretores(as) e equipe gestora.

## Índice
1. [Primeiro Acesso](#1-primeiro-acesso)
2. [Onboarding: Ano Letivo e Dados Governamentais](#2-onboarding-ano-letivo-e-dados-governamentais)
3. [Painel Principal](#3-painel-principal)
4. [Dossiê do Aluno](#4-dossiê-do-aluno)
5. [Como Ler o Heat Map de Turmas](#5-como-ler-o-heat-map-de-turmas)
6. [Como Ler o Radar de Competências](#6-como-ler-o-radar-de-competências)
7. [Intervenções Sugeridas pela IA](#7-intervenções-sugeridas-pela-ia)
8. [Perguntas Frequentes](#8-perguntas-frequentes)

---

## 1. Primeiro Acesso

1. Acesse **https://edugov.gov.br** e clique em **Entrar**.
2. Use o e-mail funcional cadastrado pela Secretaria (ex.: `diretor@escola.gov.br`).
3. Na primeira entrada será solicitado:
   - Cadastro de senha forte (mínimo 12 caracteres, com maiúsculas, números e símbolos).
   - Ativação do **MFA** (aplicativo Google Authenticator / Microsoft Authenticator).

> 🔒 **Direção obriga MFA.** Sem o segundo fator, o acesso é bloqueado.

## 2. Onboarding: Ano Letivo e Dados Governamentais

**Passo 1 — Configurar ano letivo**
- Menu: `Configurações → Ano Letivo`.
- Informe início/fim, quantidade de bimestres, feriados regionais.

**Passo 2 — Importar dados da Secretaria**
- Menu: `Integração → Importar Dados Governamentais`.
- Arraste a planilha (`.xlsx` ou `.csv`) exportada do SEDUC/MEC.
- Selecione o tipo: **Matrículas**, **Notas** ou **Frequência**.
- Clique em **Iniciar Importação**. O sistema processa em segundo plano e mostra o progresso.

**Passo 3 — Validar**
- Ao concluir, o painel exibe: `Criados`, `Atualizados`, `Erros`.
- Erros são listados linha a linha (ex.: matrícula duplicada) — corrija na planilha e reimporte apenas as linhas com erro.

> 💡 **Dica:** faça uma importação de teste em `dev` antes da primeira carga oficial.

## 3. Painel Principal

Ao entrar, a Direção vê:

- **KPIs da escola:** total de alunos, frequência média, desempenho por bimestre, alertas ativos.
- **Heat map de turmas.**
- **Fila de intervenções sugeridas** (ordenada por severidade).
- **Últimas análises Córtex** geradas.

## 4. Dossiê do Aluno

Menu `Alunos → [aluno]` abre o dossiê com abas:

| Aba | Conteúdo |
|---|---|
| **Visão geral** | Dados cadastrais, turma, responsável |
| **Desempenho** | Notas por bimestre + gráficos de evolução |
| **Frequência** | Presença/faltas + tendência |
| **Documentos** | Upload de PDFs, imagens, planilhas, relatos |
| **Dossiê IA · RAG** | Análise consolidada nos 3 eixos + plano de ação |

**Upload de documentos:**
1. Arraste o arquivo para a área tracejada (ou clique em **Selecionar**).
2. Marque **"Documento sensível"** se contiver laudo médico, psicopedagógico ou relato disciplinar → o Córtex usará **IA local** (LGPD).
3. Acompanhe o status: `Upload → Roteamento → Extração → Embeddings → Concluído`.

**Gerar análise integral:**
- Na aba **Dossiê IA · RAG**, clique em **Gerar análise Córtex**.
- Aguarde ~15-40s. O relatório aparece com:
  - Resumo por eixo (Educacional, Cognitivo, Socioemocional).
  - Plano de ação por público (Direção, Professor, Pais).
  - **Fontes citadas** (RAG) — clique para ver o trecho original.

## 5. Como Ler o Heat Map de Turmas

- **Linhas:** turmas.
- **Colunas:** disciplinas (ou bimestres).
- **Cores:**
  - 🟢 Verde: média ≥ 7,0
  - 🟡 Amarelo: 5,0–6,9
  - 🟠 Laranja: 4,0–4,9
  - 🔴 Vermelho: < 4,0

**Como usar:** identifique concentração de células vermelhas em uma disciplina → ação pedagógica coletiva. Concentração em uma turma → conversa com o(a) professor(a) regente.

## 6. Como Ler o Radar de Competências

Radar do dossiê exibe 5–6 eixos (ex.: Leitura, Escrita, Cálculo, Atenção, Socialização):

- **Área grande e regular:** perfil equilibrado.
- **"Dente" para dentro:** competência a reforçar.
- **Comparação com a média da turma** (linha tracejada) mostra se o aluno está acima/abaixo do grupo.

## 7. Intervenções Sugeridas pela IA

Cada intervenção traz: **título**, **eixo**, **severidade** (1–5), **evidências** (documentos citados) e **público-alvo**.

Ações disponíveis:
- ✅ **Acatar** — vira plano de ação; sistema notifica responsável.
- ❌ **Rejeitar** — informe o motivo (feedback melhora as próximas sugestões).
- ↪ **Encaminhar** — envia para Coordenação ou Psicopedagoga.

> ⚠️ **A decisão é sempre humana.** A IA sugere; a Direção decide.

## 8. Perguntas Frequentes

**A IA acessa dados sensíveis dos alunos?**
Somente a **IA local** (dentro da nossa infraestrutura). Dados marcados como *sensíveis* nunca são enviados a modelos externos.

**Posso desfazer uma importação?**
Sim, dentro de 24h: `Integração → Histórico → Reverter`. Após 24h, entre em contato com o Admin.

**Como excluir um aluno definitivamente (LGPD)?**
Solicite ao Admin da rede: a exclusão é feita em até 30 dias e apaga também documentos e análises correlatas.

**Perdi o acesso ao MFA. E agora?**
Contate o Admin da Secretaria — ele emite um código de recuperação único de uso limitado.

**Onde vejo o histórico de decisões?**
Menu `Auditoria` (visível apenas para Direção e Admin) exibe todas as ações realizadas com data, usuário e IP.
