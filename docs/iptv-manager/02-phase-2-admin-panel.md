# Fase 2 — Painel admin (plataforma)

Referência: spec §2.2 (login admin separado), §10 Fase 2.

**Status implementação:** ✅ **Concluída** (ver [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)).

**Próxima etapa relacionada:** [Fase 2.5 — Cobrança plataforma → tenant](./10-billing-dual-layer.md) (SaaS mensal; não faz parte desta fase).

---

## Pré-requisitos

- [x] Fase 1 estável (CRUD tenant operacional)
- [x] Módulos Fase 1 não importam `admin`
- [x] Tabela `platform_admin` separada de `account_user`

---

## Passo 1 — Backend admin ✅

### Módulo

```
apps/api/src/modules/admin/
├── admin-auth.routes.ts
├── admin-auth.service.ts
├── tenants.routes.ts
├── tenants.service.ts
├── admin-dashboard.routes.ts
└── index.ts
```

### Rotas (implementadas)

| Método | Rota | Descrição | Status |
|--------|------|-----------|--------|
| POST | `/api/admin/auth/login` | Login platform admin | ✅ |
| GET/PATCH | `/api/admin/auth/me` | Perfil admin | ✅ |
| GET | `/api/admin/tenants` | Lista paginada + `filter` | ✅ |
| GET | `/api/admin/tenants/:id` | Detalhe conta | ✅ |
| POST | `/api/admin/tenants` | Criar conta + owner | ✅ |
| PATCH | `/api/admin/tenants/:id/status` | Suspender / ativar | ✅ |
| POST | `/api/admin/tenants/reset-password` | Reset senha owner | ✅ |
| GET | `/api/admin/dashboard` | Métricas globais | ✅ |

### Rotas previstas (Fase 2.5 — billing)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/admin/platform-plans` | Planos SaaS |
| GET/POST | `/api/admin/invoices` | Faturas `scope=platform` |
| POST | `/api/admin/invoices/:id/charge-pix` | Gerar PIX (conta plataforma) |

Ver [10-billing-dual-layer.md](./10-billing-dual-layer.md).

### Guards

- JWT admin (`adminToken`) — claim distinto do tenant
- Rotas tenant **nunca** aceitam token admin sem impersonation explícita (backlog)

---

## Passo 2 — Frontend admin ✅

Implementado em **`apps/web`** com prefixo `/admin/*` (Opção B do guia original).

**PWA + responsivo:** [06-pwa-responsive.md](./06-pwa-responsive.md) · `AdminShell` com header mobile portal.

### Telas (implementadas)

| Rota | Descrição | Status |
|------|-----------|--------|
| `/admin/login` | Login admin | ✅ |
| `/admin/dashboard` | KPIs plataforma (`PageLayout`, `StatCard`) | ✅ |
| `/admin/accounts` | Lista contas (busca + paginação) | ✅ |
| `/admin/accounts/new` | Nova conta | ✅ |
| `/admin/accounts/:id/edit` | Editar status | ✅ |
| `/admin/profile` | Perfil admin | ✅ |

### Telas previstas (Fase 2.5)

| Rota | Descrição |
|------|-----------|
| `/admin/platform-plans` | CRUD planos SaaS |
| `/admin/invoices` | Faturas para tenants |
| `/admin/payments` | Pagamentos recebidos (plataforma) |
| `/admin/accounts/:id` | Aba “Faturas SaaS” no detalhe da conta |

---

## Passo 3 — Operações de suporte (backlog)

- [ ] Impersonation com audit
- [ ] `/admin/logs` cross-tenant
- [ ] Limite de clientes por plano SaaS (quando Fase 2.5 existir)

---

## Critério de pronto Fase 2 ✅

Super admin lista tenants (com busca/paginação), cria conta, suspende, reseta senha, vê dashboard — **sem** cobrança SaaS automática (isso é Fase 2.5).

---

## Depois da Fase 2

| Ordem | Fase | Doc |
|-------|------|-----|
| 1 | **2.5** Cobrança plataforma → tenant | [10-billing-dual-layer.md](./10-billing-dual-layer.md) |
| 2 | **3** Cobrança tenant → cliente | [01-phase-1-tenant-app.md](./01-phase-1-tenant-app.md) Passo 4+ |
| 3 | **4–5** Automação, renovações | [01-phase-1-tenant-app.md](./01-phase-1-tenant-app.md) Passos 5–6 |
