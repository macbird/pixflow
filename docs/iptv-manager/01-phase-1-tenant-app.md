# Fase 1 — App do revendedor (tenant)

Referência funcional: `CLIENTE-MANAGER-SPEC-TEMP.md` (§6, §12–§15).

**Objetivo:** produto completo para o revendedor operar clientes, cobrança automática, PIX, WhatsApp, dashboard, logs e fila de renovação no servidor.

**Não inclui:** painel `super_admin` (**Fase 2** — concluída) nem cobrança SaaS da plataforma (**Fase 2.5**).

**Melhorias:** integrar [09-improvements-p0-p1.md](./09-improvements-p0-p1.md) (P0 obrigatório recomendado + P1).

### Roadmap atualizado (pós Fase 2)

| Fase | Escopo | Este documento |
|------|--------|----------------|
| **1** (passos 1–3, 7) | CRUD, dashboard, UX, ativações pendentes no dashboard | ✅ Concluído (verificado 04/06/2026) |
| **2** | Admin plataforma | Ver [02-phase-2-admin-panel.md](./02-phase-2-admin-panel.md) |
| **2.5** | Plataforma cobra tenants (SaaS) | [10-billing-dual-layer.md](./10-billing-dual-layer.md) — **implementar antes do Passo 4 abaixo** |
| **3** | Tenant cobra clientes (PIX, faturas) | Passos 4–6 abaixo |
| **4–5** | Automação WA + renovações | Passos 5–6 + jobs |

O **núcleo `billing`** nasce na Fase 2.5 (`Invoice` com `scope: platform | tenant`). O Passo 4 deste guia passa a ser a **Fase 3** no [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md).

---

## Passo 1 — Scaffold e core (semana 1)

### Cursor: prompt sugerido

> Crie monorepo pnpm com apps/api (Fastify+TS+Prisma) e apps/web (Vite+React+TS+PWA), packages/shared com Zod. Docker compose postgres+redis. Módulo core com tenant middleware. Siga docs/client-manager/06-pwa-responsive.md.

### Checklist

- [ ] Monorepo `client-manager` com workspaces
- [ ] `docker-compose.yml`: PostgreSQL 16, Redis 7
- [ ] Prisma schema inicial: `account`, `account_user`
- [ ] Módulo `auth`: register, login, refresh, JWT com `tenantId` + `role`
- [ ] Módulo `core`: `tenant-context` middleware, error handler, logger
- [ ] Front: **PWA** (`vite-plugin-pwa`, manifest, ícones 192/512) — ver [06-pwa-responsive.md](./06-pwa-responsive.md)
- [ ] Front: **AppShell responsivo** (sidebar desktop + drawer/nav mobile)
- [ ] Front: **`shared/ui/lists/`** — CardList, EntityCard, ListToolbar, FilterSheet ([07](./07-mobile-cards-ux.md))
- [ ] Front: `/login`, `/register` (cadastro simples §2.1 spec) — layout mobile OK
- [ ] Conta nova → `status = active` (sem trial)
- [ ] E-mail único global em `account_user`
- [ ] **P0.2** `GET /api/health` (db + redis)
- [ ] **P1.1** Manifest PWA com shortcuts (stubs de rota ok)

### Critério de pronto

Novo revendedor registra, loga e vê layout vazio autenticado. PWA instalável em HTTPS (ou localhost). Layout usável em 375px de largura.

---

## Passo 2 — Catálogo tenant (semana 2)

### Módulos

- `plans` — CRUD
- `servers` — CRUD + `panel_url`
- `tags` — CRUD

### Front

- [ ] `/plans`, `/servers`
- [ ] Settings mínimo (opcional neste passo)

### Critério de pronto

API e telas de plano/servidor/tag isoladas por `tenant_id`.

---

## Passo 3 — Clientes finais e conexões (semana 2–3)

### Módulos

- `customers`
- `connections` (sub-recurso ou mesmo módulo com pasta `connections/`)

### Regras

- **Telefone obrigatório** — Zod + API rejeitam create/update sem `phone`
- **P0.6** Normalizar telefone E.164 (BR)
- **P1.3** Busca `q` (nome, telefone, MAC)
- **P1.5** Exibir `notes` truncadas no card
- MAC **pode repetir**
- Alerta (não bloquear) se conexões &gt; `plan.max_connections`
- `connection_history` ao mudar MAC/servidor

### Front

- [ ] `/customers` — **CardList** de clientes (nome, telefone, plano, status, vencimento); FAB; FilterSheet
- [ ] `/customers/:id` — formulário 1 coluna; conexões em **sub-cards** (não tabela); link abrir painel
- [ ] **P0.5** Botões copiar telefone / abrir wa.me no card ou detalhe
- [ ] **P1.2** Pull-to-refresh na lista clientes

### Critério de pronto

CRUD completo de cliente com N conexões.

---

## Passo 4 — Billing tenant + PIX adapter (= **Fase 3**)

> **Pré-requisito:** Fase **2.5** entregue (billing core + faturas `scope=platform`). Reutilizar o mesmo módulo com `scope=tenant`.

### Módulos

- `billing` — `invoice`, `payment` (já existentes; filtrar `scope=tenant`)
- `tenant_payment_credentials` — N credenciais PSP por revendedor (Asaas, Mercado Pago, …)
- `tenant_payment_routing_rules` — limiares por `amountCents` (ex.: anual → Asaas fixo; mensal → percentual)
- `integrations/payment` — `PaymentRouter` + factory multi-PSP

Ver [03-integrations-pix-whatsapp.md](./03-integrations-pix-whatsapp.md) e [10-billing-dual-layer.md](./10-billing-dual-layer.md).

### Checklist

- [ ] Criar fatura manual e automática (`billing_cycle_key`)
- [ ] `POST /invoices/:id/generate-payment` (alias `generate-pix`) — router escolhe PSP por `amountCents`; adapter define EMV ou link
- [ ] Webhook `POST /api/webhooks/payment/:tenantSlug/:provider` com idempotência (P0.3)
- [ ] Baixa manual `POST /payments` (method=manual)
- [ ] Front: `/invoices`, `/payments`, aba no cliente

### Checklist melhorias

- [ ] **P0.3** Idempotência webhook (`provider_payment_id` UNIQUE)
- [ ] **P0.5** Copiar PIX + toast no detalhe fatura
- [ ] **P1.6** Aba/ seção pagamentos em `/customers/:id`

### Critério de pronto

Fatura gera PIX sandbox e webhook marca como paga.

---

## Passo 5 — Automação D-N + WhatsApp (semana 5–6)

### Módulos

- `automation` — `billing_automation_config`, `BillingAutomationJob`
- `messaging` — templates, `WhatsAppProvider`, fila envio

### Fluxo (spec §6.2)

1. Job diário no `send_time` do tenant  
2. Clientes com vencimento em `days_before_due` (default **3**, programável)  
3. Criar fatura → PIX → WhatsApp template  

### Front

- [ ] `/automation` — configurar dias, horário, toggles, template

### Critério de pronto

Job de teste dispara cobrança para cliente com vencimento simulado.

---

## Passo 6 — Pagamento → renovação + relatórios (semana 6–7)

### Módulos

- `renewals` — `server_renewal_task`
- `reports` — diário + pós-pagamento

### Fluxo (spec §6.3–6.4)

- Webhook/manual pago → `server_renewal_task.status = pending_server_renewal`
- Relatório ao tenant (e-mail e/ou WhatsApp para o revendedor)
- Job diário vencimentos (§14 spec)

### Front

- [ ] `/renewals` — fila + “Marcar renovado no servidor”
- [ ] **P0.5** wa.me + copiar telefone no card renovação
- [ ] **P1.2** Pull-to-refresh em `/renewals`
- [ ] **P1.4** Card KPI “Pendentes renovação” no dashboard (ou aqui como stub)

### Critério de pronto

Após PIX confirmado, item aparece em `/renewals`; marcar como renovado muda status.

---

## Passo 7 — Dashboard + logs + settings (semana 7–8)

### Módulos

- `dashboard` — agregações (sem lógica de negócio duplicada; chamar services ou SQL views)
- `audit` — `audit_log`

### Front

- [ ] `/` dashboard (home) + **P1.4** KPI renovações pendentes → `/renewals`
- [ ] `/logs` + **P0.4** audit log nas ações críticas
- [ ] `/settings` — **mesmo layout que admin**, porém: provider PIX/WhatsApp do **revendedor**; **preço do app = read-only** (vem do plano SaaS); preço dos **clientes** continua em `/plans`

### Critério de pronto

Fase 1 utilizável em produção no VPS (1 revendedor real).

---

## Passo 8 — Deploy barato (semana 8)

- [ ] `docker-compose.prod.yml` + Nginx + **SSL (obrigatório para PWA)**
- [ ] Variáveis de ambiente documentadas
- [ ] Webhook URL registrada no sandbox Asaas
- [ ] **P0.7** Backup Postgres (`scripts/backup-db.sh` + cron)
- [ ] Lighthouse: PWA installable + teste instalação Android/iOS
- [ ] Revisão responsiva nas 5 telas principais (clientes, renovações, dashboard, login, settings)
- [ ] **P0.1** Seed tenant demo (`pnpm db:seed`)
- [ ] Revisar checklist [09-improvements-p0-p1.md](./09-improvements-p0-p1.md)

---

## Definição de “Fase 1 concluída”

| Item | OK |
|------|-----|
| Register + login tenant | |
| Clientes + conexões + planos + servidores | |
| Automação D-N → fatura + PIX + WhatsApp | |
| Webhook baixa + fila renovação servidor | |
| Dashboard + logs + relatórios | |
| **PWA + listas em cards** (§06 + §07) | |
| **Melhorias P0** (§09) | |
| **Melhorias P1** (§09 — ou logo após go-live) | |
| Código em módulos/features (review arquitetura §00) | |
