
## O que vou entregar

Quatro blocos, todos funcionais e integrados ao Lovable Cloud (backend), com RLS por papel.

### 1. Autenticação completa
- **`/auth`**: validação com zod, mensagens de erro amigáveis em PT-BR mapeadas do Supabase (credenciais inválidas, e-mail não confirmado, rate limit, etc.), estado de loading, exibição de erro inline.
- **Força de senha**: mínimo 10 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 símbolo — indicador visual (fraca/média/forte) no signup e no reset.
- **Troca no 1º acesso (política geral)**: coluna `must_change_password` na tabela `profiles`. Trigger cria `profiles` automaticamente em `auth.users` com `must_change_password=true`. Superadmin existente recebe `true` via backfill.
- **`/reset-password`** (rota pública): usada tanto pelo fluxo "esqueci minha senha" (`resetPasswordForEmail`) quanto pelo fluxo forçado. Após `updateUser({ password })`, marca `must_change_password=false`.
- **Guarda de troca forçada**: no `_authenticated/route.tsx`, após confirmar sessão, consulta `profiles.must_change_password` e redireciona para `/reset-password?forced=1` até ser trocada.

### 2. Gestão de Usuários (`/configuracoes/usuarios`)
- Acesso restrito a `admin` (superadmin). Tela lista todos os usuários (nome, e-mail, role, ativo, último login).
- Ações: **criar** (e-mail + senha temporária + role, força troca no 1º acesso), **desativar/reativar** (banir via Auth Admin API), **alterar role** (grava em `user_roles`).
- ServerFn com `requireSupabaseAuth` + `has_role(uid,'admin')` + `supabaseAdmin` (carregado dentro do handler) para Auth Admin API.

### 3. Logs de Auditoria (`/configuracoes/auditoria`)
- Tabela `audit_logs` (actor_id, target_user_id, action, entity, metadata jsonb, ip, user_agent, created_at).
- **Ações capturadas**: login sucesso, login falha, logout, criação de usuário, desativação, mudança de role, troca de senha, alteração de configurações.
- Trigger em `user_roles` (INSERT/DELETE) grava automaticamente.
- ServerFn `logAuditEvent` para eventos que vêm do cliente (login/logout/falha).
- Tela com filtros por usuário (busca) e faixa de data. Só admin lê.

### 4. Módulo Configurações (`/configuracoes`)
Shell com sidebar de abas, cada aba é uma sub-rota. Todas persistem em `app_settings` (chave/valor jsonb) — sem envio real de e-mail/SMS agora, conforme sua escolha.

Abas:
- **Usuários** (item 2 acima)
- **Auditoria** (item 3 acima)
- **IA — Modelos open source** (Ollama endpoint, modelos disponíveis, timeout)
- **IA — Modelos pagos** (OpenAI, Anthropic, Google — chave via `add_secret`, refs armazenadas)
- **Bases de Conhecimento** (buckets, coleções vetoriais, política de retenção)
- **Banco de Dados** (info read-only: host mascarado, versão, tamanho — via `supabase--read_query`)
- **Repositório de artefatos** (URL do registry, política de imagens, retenção)
- **Configuração do Córtex** (limites de tokens, modelo padrão por rota, temperatura, top-k RAG)
- **SMTP** (host, porta, usuário, from, TLS) — só armazena
- **SMS** (provider, sender id, endpoint) — só armazena
- **WhatsApp** (phone number id, business account id, template default) — só armazena

Só `admin` acessa. Botões "testar conexão" ficam desabilitados com tooltip "Ative uma integração real para testar".

## Detalhes técnicos

**Migração SQL nova** (uma só, com GRANTs):
```
- CREATE TABLE profiles(id uuid PK ref auth.users, nome text, must_change_password bool default true, ativo bool default true, ultimo_login timestamptz, created_at, updated_at)
- CREATE TABLE app_settings(chave text PK, valor jsonb, atualizado_por uuid, atualizado_em timestamptz)
- CREATE TABLE audit_logs(id, actor_id, target_user_id, acao text, entidade text, entidade_id text, metadados jsonb, ip text, user_agent text, criado_em timestamptz)
- GRANTs para authenticated (profiles: read own + admin all; app_settings/audit_logs: admin only)
- RLS + policies usando has_role(auth.uid(),'admin')
- Trigger on auth.users AFTER INSERT -> insert profile com must_change_password=true
- Trigger on user_roles AFTER INSERT/DELETE -> insert em audit_logs
- Backfill: profile do superadmin com must_change_password=true
- Trigger updated_at nos dois
```

**ServerFns novas** (`src/lib/admin/*.functions.ts`):
- `listUsers`, `createUser`, `setUserActive`, `setUserRole`, `getProfile`, `updateProfile`
- `logAuditEvent`, `listAuditLogs`
- `getSetting`, `setSetting`, `listSettings`

Todas com `requireSupabaseAuth` + checagem de role via `has_role` RPC. Mutações administrativas usam `supabaseAdmin` importado dentro do handler.

**Rotas novas**:
```text
src/routes/reset-password.tsx                       (pública)
src/routes/_authenticated/configuracoes/route.tsx   (shell + gate admin)
src/routes/_authenticated/configuracoes/index.tsx   (redir p/ usuários)
src/routes/_authenticated/configuracoes/usuarios.tsx
src/routes/_authenticated/configuracoes/auditoria.tsx
src/routes/_authenticated/configuracoes/ia-oss.tsx
src/routes/_authenticated/configuracoes/ia-pagas.tsx
src/routes/_authenticated/configuracoes/bases.tsx
src/routes/_authenticated/configuracoes/banco.tsx
src/routes/_authenticated/configuracoes/artefatos.tsx
src/routes/_authenticated/configuracoes/cortex.tsx
src/routes/_authenticated/configuracoes/smtp.tsx
src/routes/_authenticated/configuracoes/sms.tsx
src/routes/_authenticated/configuracoes/whatsapp.tsx
```

**Ajustes**:
- `_authenticated/route.tsx`: adiciona check de `must_change_password` e link "Configurações" no `AppShell` quando o usuário for admin.
- `auth.tsx`: refactor com zod, mensagens mapeadas, indicador de força.
- `AppShell.tsx`: item de menu "Configurações" só para admin.

## Fora de escopo (não implemento agora)
- Envio real de e-mail/SMS/WhatsApp e testes de conexão.
- MFA/TOTP.
- SSO SAML governamental.
- Rotação automática de segredos.

Se aprovar, começo pela migração (aprovação separada do Cloud) e sigo com o código.
