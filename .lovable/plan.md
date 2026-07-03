# Plano: Edu-Córtex (Stack completa — Cloud + RAG)

Construir o orquestrador cognitivo do Edu-Gov com ingestão multimodal, RAG pgvector, roteamento de modelos e relatórios nos 3 eixos (Educacional / Cognitivo / Socioemocional) + plano de ação.

## Etapa 1 — Infra (Lovable Cloud)

Ativar Lovable Cloud e provisionar:

- **Storage bucket** `dossies` (privado), com RLS por `auth.uid()` no path `userId/alunoId/...`.
- **Auth**: e-mail/senha + Google (para direção/coordenação/professores).
- **Tabela `user_roles`** (`app_role` enum: `direcao`, `coordenacao`, `professor`) + função `has_role` (padrão obrigatório).
- **pgvector** extensão + tabelas:
  - `documentos_aluno` (id, aluno_id, tipo `imagem|pdf|texto|planilha`, nome, storage_path, mime, tamanho, status_ingestao, tom_emocional, competencias jsonb, criado_em, criado_por).
  - `documento_chunks` (id, documento_id, aluno_id, ordem, texto, embedding `vector(3072)`, metadados jsonb) com índice HNSW cosine.
  - `cortex_analises` (id, aluno_id, eixo_educacional jsonb, eixo_cognitivo jsonb, eixo_socioemocional jsonb, plano_acao jsonb, publico_alvo, fontes jsonb, modelo_usado, custo_estimado, criado_em, criado_por).
- **GRANTs** obrigatórios (`authenticated`, `service_role`) + RLS scoped em `auth.uid()` cruzando com `user_roles`.

## Etapa 2 — Roteador de modelos (Lovable AI Gateway)

Server functions (`createServerFn`) usando `@ai-sdk/openai-compatible` + Lovable AI Gateway:

- **Rota "local-like" (econômica)** → `google/gemini-3.1-flash-lite` para: extração de entidades em relatos, sumarização, tom emocional, embeddings query, classificação simples.
- **Rota "premium multimodal"** → `google/gemini-3-pro-image` p/ OCR de provas manuscritas / laudos escaneados, e `google/gemini-2.5-pro` para raciocínio final consolidado nos 3 eixos.
- **Embeddings** → `google/gemini-embedding-001` (3072-d).

O roteador (`src/lib/cortex/router.server.ts`) decide por: mime, tamanho, presença de imagem, e flag `sensivel` (LGPD). Cada análise persiste `modelo_usado` para transparência.

## Etapa 3 — Pipeline de ingestão

Server function `ingestDocumento({ alunoId, storagePath })`:

1. Baixa do bucket via `supabaseAdmin`.
2. Detecta tipo → roteador escolhe modelo.
3. **Imagem** → Gemini multimodal (OCR + análise estrutural: erros recorrentes).
4. **PDF/texto** → extrai texto, faz chunking (~1200 chars, overlap 150), gera embeddings, salva em `documento_chunks`.
5. **CSV/XLSX** → parser (`papaparse` / `xlsx`) → estatísticas (média, desvio, quedas) armazenadas em `documentos_aluno.competencias`.
6. Atualiza `status_ingestao` = `PROCESSADO` + `tom_emocional` + competências BNCC citadas.

## Etapa 4 — RAG + Geração da análise

Server function `gerarAnaliseCortex({ alunoId, publico })`:

1. Busca notas/frequência estruturadas (mock atual + tabelas futuras).
2. Embed da query "perfil integral do aluno" → busca top-8 chunks via `match_documento_chunks(alunoId, query_embedding)`.
3. Monta prompt clínico com contexto RAG + regra **Zero Alucinação** ("se faltar dado, declare").
4. Chama `gemini-2.5-pro` com `Output.object` estruturado nos 3 eixos + `plano_acao[]` (com `publico_alvo`, `prazo`, `acao`, `responsavel_sugerido`).
5. Persiste em `cortex_analises`.

## Etapa 5 — UI

- Nova rota **`/cortex`** — console do orquestrador: seletor de aluno, feed de decisões de roteamento (qual modelo, por quê, custo estimado), timeline de ingestões.
- Painel **"Análise Edu-Córtex"** integrado em **`/aluno/:id`** (nova aba):
  - Upload multimodal (drag-drop imagem/PDF/CSV) com progresso de ingestão.
  - Lista de documentos do dossiê com badge de status e modelo usado.
  - Botão **"Gerar análise integral"** → escolhe público (Direção / Professores / Pais) → renderiza os 3 eixos em cards + timeline do plano de ação com badges de público-alvo.
  - Toggle "citações RAG" mostrando trechos-fonte de cada insight.
- Estado empty transparente ("RAG sem contexto suficiente — envie mais evidências").

## Etapa 6 — Segurança & LGPD

- Toda ingestão passa por `requireSupabaseAuth`.
- Flag `sensivel` bloqueia envio ao gateway externo → roteia para prompt mais restrito no modelo `flash-lite` (proxy do "local").
- Logs de acesso a dossiês em `cortex_audit`.
- Nenhum secret no cliente; `LOVABLE_API_KEY` só em server functions.

## Detalhes técnicos

- Stack: TanStack Start + `createServerFn` + `@ai-sdk/openai-compatible` apontando para `https://ai.gateway.lovable.dev/v1` com header `Lovable-API-Key`.
- Parsers: `pdf-parse` (worker-compat check antes; fallback: enviar PDF direto ao Gemini como `file`), `papaparse`, `xlsx`.
- Chunking: função utilitária pura em `src/lib/cortex/chunk.ts`.
- Batching de embeddings: ≤ 100 inputs por request (limite Gemini).
- `_authenticated/cortex` e `_authenticated/aluno/$id` (mover rotas sensíveis para o layout protegido gerenciado).

## Escopo desta primeira entrega

Vou entregar Etapas 1–5 completas com o pipeline funcionando ponta-a-ponta para **texto/PDF/imagem** (planilhas CSV entram como leitura estatística simples). Auditoria detalhada (Etapa 6 logs) fica como camada mínima (RLS + `criado_por`), sem tela de auditoria ainda.

Confirma que sigo com esse plano?
