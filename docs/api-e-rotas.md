# API & Rotas — Edu-Gov

> Contratos de integração no padrão OpenAPI 3.1 simplificado.

## Índice
1. [Convenções](#1-convenções)
2. [Autenticação](#2-autenticação)
3. [Escolas](#3-escolas)
4. [Alunos](#4-alunos)
5. [Ingestão de Dados Governamentais](#5-ingestão-de-dados-governamentais)
6. [Córtex de IA](#6-córtex-de-ia)
7. [Códigos de Erro](#7-códigos-de-erro)

---

## 1. Convenções

- Base URL: `https://api.edugov.gov.br/api/v1`
- Formato: JSON UTF-8.
- Datas: ISO-8601 (`2026-07-04T13:00:00Z`).
- Paginação: `?page=1&pageSize=25` → `{ data, meta: { total, page, pageSize } }`.
- Idempotência: header `Idempotency-Key` em `POST` que criam recursos.

## 2. Autenticação

Todas as rotas (exceto `/health`) exigem header:

```
Authorization: Bearer <JWT>
```

O JWT é emitido pelo provedor de identidade (Supabase Auth). Contém `sub` (user_id), `role` global (`authenticated`) e claims custom (`app_role`).

### `POST /auth/login`

**Request**
```json
{ "email": "diretor@escola.gov.br", "password": "••••••••" }
```

**Response `200`**
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "v3f9...",
  "expires_in": 3600,
  "user": { "id": "uuid", "email": "diretor@escola.gov.br", "roles": ["direcao"] }
}
```

## 3. Escolas

### `GET /escolas`
Lista escolas do usuário. Query: `uf`, `municipio`, `q`.

**Response `200`**
```json
{
  "data": [
    { "id": "uuid", "inep": "35012345", "nome": "EMEF Machado de Assis",
      "municipio": "São Paulo", "uf": "SP", "totalAlunos": 812 }
  ],
  "meta": { "total": 42, "page": 1, "pageSize": 25 }
}
```

### `POST /escolas`
Requer `admin` ou `direcao`.

```json
{ "inep": "35099887", "nome": "EMEF Cecília Meireles", "municipio": "São Paulo", "uf": "SP" }
```

Retorna `201 Created` com o recurso.

## 4. Alunos

### `GET /alunos/:id`

**Response `200`**
```json
{
  "id": "uuid",
  "matricula": "2026-000123",
  "nome": "Maria Silva",
  "turma": { "id": "uuid", "serie": "5º Ano", "turno": "MATUTINO" },
  "avaliacoes": [
    { "disciplina": "Matemática", "bimestre": 2, "nota": 6.5, "faltas": 3 }
  ],
  "alertas": [
    { "eixo": "COGNITIVO", "severidade": 3, "titulo": "Queda em interpretação de texto" }
  ]
}
```

### `POST /alunos`
```json
{ "matricula": "2026-000456", "nome": "João Souza",
  "dataNasc": "2015-08-10", "turmaId": "uuid" }
```

Códigos: `201` sucesso · `409` matrícula duplicada.

### `DELETE /alunos/:id`
Executa purge LGPD (avaliações, documentos, chunks, embeddings). Requer `admin`. Retorna `202 Accepted` + `Location` de acompanhamento.

## 5. Ingestão de Dados Governamentais

### `POST /import/gov-data`
Recebe arquivo CSV/XLSX exportado do SEDUC/MEC. Processamento assíncrono.

**Request** (`multipart/form-data`)
```
file: <planilha.xlsx>
tipo: "MATRICULAS" | "NOTAS" | "FREQUENCIA"
anoLetivo: 2026
```

**Response `202`**
```json
{ "jobId": "job_01HZ...", "status": "PENDENTE",
  "acompanhar": "/import/jobs/job_01HZ..." }
```

### `GET /import/jobs/:jobId`
```json
{ "jobId": "job_01HZ...", "status": "CONCLUIDO",
  "resumo": { "criados": 812, "atualizados": 34, "erros": 2 },
  "erros": [{ "linha": 47, "motivo": "matrícula duplicada" }] }
```

## 6. Córtex de IA

### `POST /ai/upload-context`
Anexa documento ao dossiê do aluno. Dispara pipeline (roteamento → OCR → embeddings).

**Request** (`multipart/form-data`)
```
alunoId: uuid
sensivel: true|false
file: <prova.pdf | relato.txt | foto.jpg>
```

**Response `202`**
```json
{
  "documentoId": "uuid",
  "rota": "multimodal",
  "modelo": "gemini-2.5-flash",
  "status": "PROCESSANDO"
}
```

### `POST /ai/generate-report`
Gera relatório consolidado (3 eixos) via RAG.

**Request**
```json
{ "alunoId": "uuid", "publicoAlvo": "DIRECAO" }
```

**Response `200`**
```json
{
  "id": "uuid",
  "rotaRoteador": "sintese",
  "modeloUsado": "gemini-2.5-pro",
  "eixoEducacional":     { "resumo": "...", "indicadores": { "portugues": 6.8, "matematica": 5.4 } },
  "eixoCognitivo":       { "resumo": "...", "sinais": ["dificuldade de interpretação"] },
  "eixoSocioemocional":  { "resumo": "...", "tom": "retraído", "riscos": ["isolamento"] },
  "planoAcao": [
    { "publico": "PROFESSOR", "acao": "Aplicar leitura pareada 2x/semana", "prazo": "15 dias" }
  ],
  "fontes": [
    { "documentoId": "uuid", "chunkId": "uuid", "trecho": "...", "similaridade": 0.87 }
  ]
}
```

### `POST /ai/intervencoes/:id/status`
Direção/coordenação acata, rejeita ou encaminha uma intervenção sugerida.

```json
{ "status": "ACEITA", "observacao": "Agendar reunião com responsável" }
```

## 7. Códigos de Erro

| HTTP | Código app | Significado |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Payload inválido (Zod) |
| 401 | `UNAUTHENTICATED` | JWT ausente/expirado |
| 403 | `FORBIDDEN` | Papel insuficiente (RBAC) |
| 404 | `NOT_FOUND` | Recurso inexistente ou fora de escopo |
| 409 | `CONFLICT` | Violação de unicidade |
| 413 | `PAYLOAD_TOO_LARGE` | Documento > 25 MB |
| 422 | `LGPD_RESTRICTED` | Tentativa de enviar dado sensível a modelo externo |
| 429 | `RATE_LIMITED` | Limite por escola/hora atingido |
| 500 | `INTERNAL_ERROR` | Falha não tratada |

Formato padrão:
```json
{ "error": { "code": "FORBIDDEN", "message": "Papel insuficiente", "traceId": "01HZ..." } }
```
