# Database Schema — Edu-Gov

> Engenharia de dados: dicionário Prisma, estratégia vetorial (RAG) e políticas de backup.

## Índice
1. [Visão Geral](#1-visão-geral)
2. [Dicionário de Dados (Prisma)](#2-dicionário-de-dados-prisma)
3. [Estratégia Vetorial (pgvector)](#3-estratégia-vetorial-pgvector)
4. [Índices e Performance](#4-índices-e-performance)
5. [Retenção, Backup e DR](#5-retenção-backup-e-dr)
6. [LGPD — Ciclo de Vida do Dado](#6-lgpd--ciclo-de-vida-do-dado)

---

## 1. Visão Geral

Dois bancos lógicos convivem no mesmo cluster PostgreSQL 15:

- **Relacional operacional** — entidades de negócio (escolas, alunos, avaliações, intervenções).
- **Vetorial (pgvector)** — chunks de documentos + embeddings para RAG.

Chaves primárias: `UUID v4` (`gen_random_uuid()`). Timestamps: `TIMESTAMPTZ` com `now()` default.

## 2. Dicionário de Dados (Prisma)

```prisma
// schema.prisma
generator client { provider = "prisma-client-js" }
datasource db    { provider = "postgresql"; url = env("DATABASE_URL") }

enum AppRole { admin direcao coordenacao professor }
enum StatusIngestao { PENDENTE PROCESSANDO CONCLUIDO ERRO }
enum StatusIntervencao { SUGERIDA ACEITA REJEITADA EM_ANDAMENTO CONCLUIDA }

model Escola {
  id           String   @id @default(uuid()) @db.Uuid
  inep         String   @unique
  nome         String
  municipio    String
  uf           String   @db.Char(2)
  turmas       Turma[]
  criadoEm     DateTime @default(now())
}

model Turma {
  id          String   @id @default(uuid()) @db.Uuid
  escolaId    String   @db.Uuid
  escola      Escola   @relation(fields: [escolaId], references: [id])
  serie       String   // "5o Ano", "3a Serie EM"
  turno       String   // "MATUTINO" | "VESPERTINO" | "NOTURNO"
  anoLetivo   Int
  alunos      Aluno[]
  @@unique([escolaId, serie, turno, anoLetivo])
}

model Aluno {
  id             String        @id @default(uuid()) @db.Uuid
  turmaId        String        @db.Uuid
  turma          Turma         @relation(fields: [turmaId], references: [id])
  matricula      String        @unique
  nome           String
  dataNasc       DateTime      @db.Date
  responsavel    Json?         // {nome, cpf_mascarado, contato}
  avaliacoes     Avaliacao[]
  documentos     Documento[]
  intervencoes   Intervencao[]
  criadoEm       DateTime      @default(now())
}

model Avaliacao {
  id         String   @id @default(uuid()) @db.Uuid
  alunoId    String   @db.Uuid
  aluno      Aluno    @relation(fields: [alunoId], references: [id])
  disciplina String
  bimestre   Int
  nota       Decimal  @db.Decimal(5,2)
  faltas     Int      @default(0)
  aplicadaEm DateTime @default(now())
  @@index([alunoId, disciplina, bimestre])
}

model Documento {
  id             String          @id @default(uuid()) @db.Uuid
  alunoId        String          @db.Uuid
  aluno          Aluno           @relation(fields: [alunoId], references: [id])
  nome           String
  mime           String
  tamanho        BigInt
  storagePath    String          // s3://dossies/{alunoId}/{uuid}
  sensivel       Boolean         @default(false)
  status         StatusIngestao  @default(PENDENTE)
  rotaRoteador   String?         // "local" | "multimodal" | "sintese"
  modeloUsado    String?
  resumo         String?
  competencias   Json            @default("[]")
  tomEmocional   String?
  criadoPor      String          @db.Uuid
  criadoEm       DateTime        @default(now())
  chunks         DocumentoChunk[]
  @@index([alunoId, status])
}

model DocumentoChunk {
  id           String    @id @default(uuid()) @db.Uuid
  documentoId  String    @db.Uuid
  documento    Documento @relation(fields: [documentoId], references: [id], onDelete: Cascade)
  alunoId      String    @db.Uuid
  ordem        Int
  texto        String    @db.Text
  embedding    Unsupported("vector(1536)")?
  metadados    Json      @default("{}")
  criadoPor    String    @db.Uuid
  criadoEm     DateTime  @default(now())
  @@index([documentoId, ordem])
}

model Intervencao {
  id             String              @id @default(uuid()) @db.Uuid
  alunoId        String              @db.Uuid
  aluno          Aluno               @relation(fields: [alunoId], references: [id])
  origem         String              // "IA" | "PROFESSOR" | "DIRECAO"
  publicoAlvo    String              // "DIRECAO" | "PROFESSOR" | "PAIS"
  titulo         String
  descricao      String              @db.Text
  eixo           String              // "EDUCACIONAL" | "COGNITIVO" | "SOCIOEMOCIONAL"
  severidade     Int                 // 1..5
  status         StatusIntervencao   @default(SUGERIDA)
  evidencias     Json                // refs a documento_chunks
  criadoEm       DateTime            @default(now())
  atualizadoEm   DateTime            @updatedAt
  @@index([alunoId, status])
}
```

> **Observação:** relacionamentos entre `Escola → Turma → Aluno` são obrigatórios (não nulos). Cascatas de exclusão são bloqueadas exceto em `DocumentoChunk` (segue o `Documento` pai).

## 3. Estratégia Vetorial (pgvector)

Objetivo: recuperar evidências textuais quando o Córtex de IA precisa consolidar o dossiê.

**Pipeline:**
1. Upload em S3 (`dossies/{alunoId}/{uuid}`).
2. Ingestor detecta MIME.
3. Extração:
   - PDF/texto → parser + chunking (≈1200 chars, overlap 150).
   - Imagem/PDF escaneado → **OCR multimodal** (Gemini Flash) → texto → chunking.
   - CSV/XLSX → parser + estatísticas em `competencias`.
4. Cada chunk vira embedding 1536d (`text-embedding-3-small`).
5. Grava em `documento_chunks` com `aluno_id` denormalizado (filtro barato).

**Consulta (SQL):**

```sql
SELECT c.id, c.documento_id, c.texto, c.metadados,
       1 - (c.embedding <=> $query) AS similarity
FROM documento_chunks c
WHERE c.aluno_id = $aluno
  AND c.embedding IS NOT NULL
ORDER BY c.embedding <=> $query
LIMIT 8;
```

## 4. Índices e Performance

| Índice | Tipo | Motivo |
|---|---|---|
| `avaliacao(aluno_id, disciplina, bimestre)` | B-tree | Séries temporais por matéria |
| `documento(aluno_id, status)` | B-tree | Filas de ingestão |
| `documento_chunk(documento_id, ordem)` | B-tree | Reconstituição de contexto |
| `documento_chunk.embedding` | **HNSW cosine** (m=16, ef_construction=64) | Busca vetorial ANN |
| `intervencao(aluno_id, status)` | B-tree | Painéis por aluno |

`VACUUM ANALYZE` diário; `REINDEX CONCURRENTLY` mensal em `documento_chunk`.

## 5. Retenção, Backup e DR

| Ativo | Onde | Retenção | Backup |
|---|---|---|---|
| PostgreSQL relacional | RDS Multi-AZ | 7 anos (compliance educacional) | `pg_dump` diário + snapshots RDS 35d |
| Vetores (chunks) | mesma instância | 5 anos após ano letivo | idem |
| Documentos brutos | S3 `dossies` (KMS) | 7 anos | Versionamento + Object Lock (Governance) |
| Logs de auditoria | Loki + S3 Glacier | 5 anos | Imutável |

Testes de restauração trimestrais (**Game Day**). RPO 15 min, RTO 2h.

## 6. LGPD — Ciclo de Vida do Dado

- **Coleta:** consentimento do responsável legal registrado por `Aluno.responsavel`.
- **Uso:** documentos marcados `sensivel=true` **nunca** deixam a VPC (roteador força modelo local).
- **Direito ao esquecimento:** endpoint `DELETE /api/v1/alunos/:id` executa purge em cascata (avaliações, documentos, chunks, embeddings) e emite evento de auditoria.
- **Anonimização para IA externa:** pipeline substitui nome, matrícula, CPF por tokens `[[ALUNO_1]]`, `[[MATRICULA]]` antes de enviar para Gemini.

> ⚠️ Dados de menores exigem tratamento reforçado — **nunca** logar payloads brutos; usar hashing SHA-256 em logs quando referência for necessária.
