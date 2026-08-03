# Evolução Edu-Gov — Plataforma em 5 Camadas

Objetivo: evoluir a plataforma preservando 100% do que existe. Nada é recriado ou removido.
O usuário Root (`superadmin@edugov.gov.br`) permanece intacto: credenciais, papéis, políticas e autenticação inalteradas.

## Separação arquitetural

```text
   Administration  (/configuracoes — já existe, ganha novas abas)
   ------------------------------------------------------------
   Analytics       (indicadores executivos, risco, frequência)
   AI Services     (já existe: ai-gateway + cortex router + RAG)
   Integration Hub (NOVO: connectors, adapters, bus, workflows, mapping, gateway)
   Core Platform   (Master Data oficial: escolas, turmas, alunos, servidores)
```

Regra: módulos não se falam direto — publicam/consomem eventos no barramento. Nenhum sistema externo toca o banco: só via Integration Hub.

---

## Fase 1 — Fundação arquitetural e governança

- Documentar as 5 camadas em `docs/arquitetura-5-camadas.md` + diagrama Mermaid atualizado em `docs/arquitetura-e-tech-stack.md`.
- Criar `docs/relatorio-de-impacto.md` (registro incremental de cada fase).
- Criar contrato de camadas em `src/lib/platform/` (tipos de evento, contratos de conector, contrato do AI Service).
- Sem migration. Sem risco funcional.
- Aceite: docs publicadas e tipos compilando (`tsgo`).
- Rollback: reverter arquivos de docs/tipos (não há dependência em runtime ainda).

## Fase 2 — Core Platform (Master Data)

Hoje escolas/turmas/alunos vêm de mock (`src/lib/api.ts` + `mock-data.ts`). Passam a ter tabelas oficiais.

- Migration incremental (apenas CREATE): `escolas`, `turmas`, `alunos`, `servidores`, `matriculas`, `vinculos_servidor` (unidade + disciplina, reaproveitando o modelo já usado no ProfissionaisPanel).
- GRANTs explícitos + RLS por papel via `has_role()`; nenhuma política existente é alterada.
- `src/lib/api.ts` mantém a mesma assinatura pública: passa a ler do banco com fallback para mock quando vazio, para as telas continuarem renderizando desde o primeiro acesso.
- Server functions em `src/lib/core/*.functions.ts` (CRUD autenticado).
- Aceite: `/escola`, `/turmas`, `/alunos`, `/entidades`, `/aluno/$id` funcionam sem regressão; dados persistem.
- Riscos: divergência mock/real. Mitigação: fallback e contrato de tipos único.
- Rollback: flag de leitura volta ao mock; tabelas permanecem sem uso.

## Fase 3 — Integration Hub

- Migration: `integracao_conectores` (id, nome, descrição, tipo, status, versão, auth, parâmetros), `integracao_execucoes`, `integracao_eventos`, `integracao_fluxos`, `integracao_mapeamentos`, `integracao_logs`.
- **Adapters** em `src/lib/hub/adapters/` com interface única (`testar`, `listar`, `ler`, `escrever`): REST, GraphQL, SOAP, PostgreSQL, SQL Server, Oracle, MySQL, MariaDB, SQLite, MongoDB, LDAP, AD, OpenLDAP, CSV, Excel, XML, JSON, SFTP. Adapters sem suporte no runtime edge são registrados com status "requer agente" e proxy HTTP, sem quebrar o núcleo.
- **Barramento de eventos** interno persistido (`integracao_eventos`): `StudentCreated/Updated/Transferred`, `SchoolCreated`, `TeacherCreated`, `AttendanceImported`, `GradeUpdated`, `CouncilMeetingCreated`. Interface `publish/subscribe` preparada para RabbitMQ/Kafka.
- **Workflow Engine**: origem → transformações → validações → destino, com política de sincronização e de conflito, retentativa exponencial, auditoria em `audit_logs`.
- **Data Mapping visual**: UI de mapeamento campo-a-campo (concatenar, dividir, converter tipo, expressão, valor padrão, validação) sem código.
- **API Gateway interno** `/api/v1/*`: autenticação, autorização por papel, rate limiting, versionamento, cache, auditoria e OpenAPI. Estrutura já preparada para `/api/v2`. O endpoint Pulse atual continua funcionando sem alteração.
- **Painel de monitoramento**: integrações ativas/falhas, tempo médio, volume, filas, taxa de sucesso/erro, histórico.
- Nova rota `/_authenticated/hub` + abas no módulo de configuração.
- Aceite: criar um conector REST, mapear campos, rodar fluxo, ver evento no barramento e execução no painel.
- Riscos: limites do runtime para drivers de banco. Mitigação: modo agente/proxy.
- Rollback: desabilitar conectores (status inativo); rotas do Hub isoladas do restante.

## Fase 4 — Autenticação estendida e Segurança

- Coexistência: Root inalterado. Novo campo `auth_origin` em `profiles` (`ROOT | LOCAL | LDAP | AD | OAUTH`), default `LOCAL`; Root marcado `ROOT` sem tocar credenciais/papéis.
- Tabelas: `auth_provedores` (LDAP/AD/OpenLDAP/OAuth2), `auth_grupo_papel` (mapeia grupo do diretório → `app_role`), `auth_sync_execucoes`, `auth_sessoes`.
- Sincronização LDAP/AD: usuários, grupos, OUs, departamentos, e-mails, telefones; manual, agendada e incremental.
- Segurança: RBAC por permissão sobre `user_roles`, MFA (TOTP) para usuários locais, criptografia de credenciais de conector via secret manager, expiração de token configurável, logs de autenticação e de integração, trilha por usuário.
- OAuth2 apenas estruturado (sem provider ativo).
- Aceite: login Root inalterado; provedor LDAP configurável e sincronização registrada; MFA opcional funcional.
- Riscos: bloqueio de acesso. Mitigação: MFA opt-in; Root nunca sujeito a novas regras.
- Rollback: desativar provedor; `auth_origin` é aditivo.

## Fase 5 — Importação das unidades escolares

- Requer o PDF oficial da rede municipal (não está anexado — precisa ser reenviado).
- Importador inteligente: extração do PDF, normalização, deduplicação, validação de endereço, criação de registros completos em `escolas` e fila de inconsistências para revisão manual.
- Reaproveita adapters/workflow da Fase 3 para futuras sincronizações automáticas.
- Aceite: escolas importadas conferem com o PDF; inconsistências listadas.
- Rollback: importação por lote identificável e reversível.

## Fase 6 — AI Services (ampliação) e Conselho Pedagógico

- Formalizar `src/lib/ai/service.ts` como única porta de IA (providers intercambiáveis: Lovable AI, OpenAI, Azure, Anthropic, Gemini, local). Nenhum componente conhece o modelo.
- Capacidades: análise pedagógica (já existe), risco de evasão, análise de frequência, resumo de reuniões, geração de atas, recomendações de intervenção, apoio ao Conselho Pedagógico, indicadores executivos.
- Tabelas: `conselho_reunioes`, `conselho_atas`, `conselho_participantes`, `risco_evasao`; evento `CouncilMeetingCreated`.
- Rota `/_authenticated/conselho`.
- Aceite: reunião registrada, ata gerada, risco calculado por aluno/turma.
- Rollback: rotas novas removíveis; Córtex atual intocado.

## Fase 7 — Analytics

- Indicadores executivos consolidados (rede, escola, turma) a partir do Core + eventos; sem duplicar dados.
- Painel executivo reaproveitando os componentes Recharts existentes.
- Aceite: indicadores coerentes com o Core; sem regressão nos dashboards atuais.

---

## Dependências

Fase 1 → 2 → 3 → (4, 5, 6) → 7. Fase 5 depende de 3 e do PDF. Fase 6 depende de 2.

## Detalhes técnicos

- Migrations sempre aditivas: `CREATE TABLE` + `GRANT` + `ENABLE RLS` + `CREATE POLICY`. Nenhum `DROP`/`ALTER` em tabelas, políticas, funções ou usuários existentes.
- Server logic em `createServerFn` (`*.functions.ts`); chamadas externas em `src/routes/api/v1/*` e `api/public/*` com verificação de assinatura.
- Reuso obrigatório: `AppShell`, painéis de `src/components/config`, `SettingsForm`, `app_settings`, `audit_logs`, `has_role()`, `ai-gateway.server.ts`, `cortex/router.ts`.
- Documentação atualizada em `/docs` a cada fase, com relatório de impacto e diagrama.

## Próximo passo

Aprovando, começo pelas Fases 1 e 2 (fundação + Core Platform), pois todo o resto depende do Master Data oficial.
