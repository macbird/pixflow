# Status da Implementação — Cliente Manager

Documento vivo: última verificação em **04/06/2026** (Fases 1 e 2 confirmadas no código; ajustes recentes em billing/UX refletidos abaixo).

Relacionado: [10-billing-dual-layer.md](./10-billing-dual-layer.md) · [03-integrations-pix-whatsapp.md](./03-integrations-pix-whatsapp.md) · [09-improvements-p0-p1.md](./09-improvements-p0-p1.md) · [11-payment-and-activations.md](./11-payment-and-activations.md)

---

## Verificação Fases 1 e 2 (04/06/2026)

| Critério | Fase 1 | Fase 2 |
|----------|--------|--------|
| **Escopo documentado** | [01-phase-1-tenant-app.md](./01-phase-1-tenant-app.md) passos 1–3 + dashboard | [02-phase-2-admin-panel.md](./02-phase-2-admin-panel.md) |
| **Backend** | Auth tenant, plans, servers, customers, tags, dashboard, billing tenant, activations | Auth admin, tenants CRUD, dashboard admin, billing `scope=platform` |
| **Frontend** | `/dashboard`, `/customers`, `/plans`, `/servers`, `/settings`, `/invoices`, `/payments`, `/activations` | `/admin/*` (login, dashboard, contas, faturas, pagamentos, settings, perfil) |
| **Isolamento tenant** | `requireTenantId`, JWT com `tenantId` | Token `adminToken` separado |
| **Conclusão** | ✅ **Entregue** para o MVP da fase | ✅ **Entregue** para o MVP da fase |

**Fora do escopo estrito das Fases 1–2 (já no repo, tratadas nas fases 2.5 / 3):** faturas e pagamentos tenant, ativações pós-pagamento, cobrança SaaS admin↔tenant, PIX stub, sync de faturas vencidas.

**Próximo foco do produto:** concluir integrações reais (Fase 2.5 + 3) — adapters PSP, webhooks, jobs — não reabrir Fases 1–2 salvo bugs.

---

## Resumo executivo

| Fase | Escopo | Status |
|------|--------|--------|
| **1** | App do revendedor (CRUD, dashboard, tags, conexões) | ✅ Concluída |
| **2** | Painel admin plataforma | ✅ Concluída |
| **2.5** | **Cobrança plataforma → tenant** (SaaS mensal) | ⚠️ **Parcial (MVP UI + API stub)** |
| **3** | Cobrança tenant → cliente final (pagamento, faturas) | ⚠️ **Parcial (mesmo motor, scope tenant)** |
| **3.1** | **Pagamento híbrido** (EMV + checkout link) | 📋 **Doc pronta; código pendente** |
| **4** | Automação D-N + WhatsApp | 📋 Planejada |
| **5** | Renovações pós-pagamento + relatórios | 📋 Planejada |

**Próximo foco recomendado:** adapters EMV reais (Asaas + Mercado Pago), webhooks idempotentes, depois campos híbridos (`paymentDeliveryType`, `checkoutUrl`) + InfinitePay.

---

## ✅ Fase 1 — App do revendedor

### Passo 1 — Scaffold e core
**Status:** Concluído  
- Monorepo, auth JWT com `tenantId`, Prisma, PWA, AppShell responsivo

### Passo 2 — Catálogo (planos, servidores, tags)
**Status:** Concluído  
- CRUD isolado por tenant; tags embutidas em clientes/planos/servidores (sem módulo tags standalone na UI)

### Passo 3 — Clientes e conexões
**Status:** Concluído  
- CRUD clientes, conexões (MAC, servidor, app), cascade delete, máscara MAC hex

### Passo 7 (parcial) — Dashboard tenant
**Status:** Concluído  
- KPIs de clientes (total, ativos, vencendo, vencidos), infraestrutura, receita estimada  
- KPIs e gráfico de **cobrança** (recebido, em aberto, vencidas, taxa)  
- Listas: próximos vencimentos, pagamentos recentes, **ativações pendentes** (card + lista)  
- Pendente Fase 5: fila `/renewals` completa e KPI “renovações no servidor” pós-automação

### Ajustes de UX/UI (transversal)
**Status:** Concluído  
- Paginação + busca unificadas (`usePaginatedList`, `PageHeaderActions`, `ListPagination`)
- **Filtros modais** em clientes, planos, servidores, faturas e pagamentos (`ListFiltersModal`, badge no header)
- Listas mobile em cards (`ResponsiveDataGrid`), linhas clicáveis em billing
- Modal de confirmação responsivo (action sheet mobile)
- `CustomerStatus` enum, `requireTenantId`, DTO leve de listagem
- Busca de clientes inclui **nome e telefone** na API

---

## ✅ Fase 2 — Painel admin (plataforma)

**Status:** Concluído

| Entrega | Detalhe |
|---------|---------|
| Auth admin | Login separado (`adminToken`), perfil, troca de senha |
| Contas (tenants) | Listagem paginada + busca (nome, slug, e-mail owner) |
| CRUD conta | Criar tenant + owner + **vencimento SaaS** (`nextDueDate`), editar status/vencimento |
| Fatura SaaS por conta | Botão na listagem → `POST /admin/tenants/:id/invoices` |
| Reset senha | Modal por conta |
| Dashboard admin | KPIs + billing SaaS (MRR, inadimplência, gráfico mensal) |
| Shell admin | `AdminShell` com nav: contas, faturas SaaS, pagamentos, configurações |

---

## ⚠️ Fase 2.5 — Cobrança plataforma → tenant

**Objetivo:** o **admin** cobra cada **tenant** mensalmente pelo uso do Cliente Manager (SaaS).

**Documentação:** [10-billing-dual-layer.md](./10-billing-dual-layer.md)

### Entregue (MVP)

| Item | Status |
|------|--------|
| Prisma: `Invoice`, `Payment`, configs plataforma/tenant, assinatura SaaS | ✅ |
| Migrations + seed billing (`npm run seed:billing -w apps/api`) | ✅ |
| Módulo `apps/api/modules/billing` (`scope: platform \| tenant`) | ✅ |
| **`/admin/settings`** — preço SaaS + provider PIX/WA plataforma | ✅ |
| **`/settings` (tenant)** — providers revenda + “Minha assinatura” read-only | ✅ |
| Admin: `/admin/invoices`, `/admin/payments`, detalhes, cancelar/recriar fatura | ✅ |
| Tenant: `/invoices`, `/payments`, detalhes, cancelar/recriar fatura | ✅ |
| Dashboards admin + tenant com KPIs e pagamentos recentes | ✅ |
| `generate-pix` via adapters reais (Asaas / Mercado Pago) + baixa manual | ✅ |
| Filtros de listagem (status, ciclo, datas) | ✅ |

### Pendente (critério de pronto)

| Item | Status |
|------|--------|
| Adapter EMV real (Asaas + Mercado Pago) na conta plataforma | ✅ |
| Webhook Mercado Pago idempotente (`/api/webhooks/payment/:slug/mercadopago`) | ✅ (MP; Asaas webhook pendente) |
| Job mensal automático (`billing_cycle_key`) | ❌ |
| Suspensão automática por inadimplência | ❌ |
| Tenant: copiar PIX da fatura SaaS em Configurações | ⚠️ parcial (via listagem/detalhe) |
| Roteamento multi-PSP por valor (plataforma) | 📋 backlog (tenant usa um PSP; plataforma idem no MVP) |

**Critério de pronto:** admin gera fatura de março; tenant paga via PIX sandbox; webhook marca paga; dashboard admin mostra receita do mês.

---

## ⚠️ Fase 3 — Cobrança tenant → cliente final

Reutiliza o **mesmo motor** com `scope = tenant`.

### Entregue

| Item | Status |
|------|--------|
| Faturas + pagamentos por tenant (API + UI) | ✅ |
| Config PIX tenant em `/settings` | ✅ |
| **Credenciais multi-PSP** (`tenant_payment_credentials`; UI: **um PSP ativo** por vez) | ✅ |
| **`PaymentRouter`** — regra única (`minAmountCents: 0` → provider selecionado) | ✅ |
| Migration + `Invoice.paymentProvider` | ✅ |
| **Settings:** um PSP via combobox + credenciais só do meio escolhido | ✅ |
| **Fatura manual** + baixa manual / ativação pendente | ✅ |
| **Sync** faturas `open` → `overdue` por `dueDate` | ✅ |
| `generate-pix` via PSP real (factory + router) | ✅ |
| Detalhe fatura: badge do provider PIX | ✅ |
| Cancelamento + fatura substituta (histórico preservado) | ✅ |
| Filtros em faturas/pagamentos | ✅ |
| Testes unitários `PaymentRouterService` | ✅ |
| Ativações pendentes (`/activations` + dashboard) | ✅ |

### Pendente

| Item | Status |
|------|--------|
| PIX real por tenant (Asaas + Mercado Pago EMV) | ✅ |
| Webhook Mercado Pago por tenant slug | ✅ |
| Faturas no detalhe do cliente | ❌ |
| P0.3 idempotência webhook (MP), P0.5 copiar PIX + wa.me no detalhe fatura | ✅ (detalhe; cards listagem pendente) |
| Job D-N automático | ❌ (Fase 4) |

---

## 📋 Fase 3.1 — Pagamento híbrido (EMV + link)

**Documentação:** [03-integrations-pix-whatsapp.md](./03-integrations-pix-whatsapp.md) · [10-billing-dual-layer.md](./10-billing-dual-layer.md#fase-31--pagamento-híbrido-emv--link)

| Item | Status |
|------|--------|
| Doc: dois formatos (`emv` \| `checkout_link`) | ✅ |
| Doc: PushinPay (EMV) + InfinitePay (link no Zap) | ✅ |
| Doc: contrato `PaymentProvider.createCharge` | ✅ |
| Doc: WhatsApp `{{payment_block}}` | ✅ |
| Migration `paymentDeliveryType`, `checkoutUrl` | ❌ |
| `generatePayment` (alias `generate-pix`) | ❌ |
| Adapters Asaas + Mercado Pago (EMV) | ✅ |
| Adapter InfinitePay (`checkoutUrl`) | ❌ |
| Adapter PushinPay (opcional) | ❌ |
| UI: copiar PIX vs abrir/copiar link | ❌ |
| Enum Prisma: `pushinpay`, `infinitypay` | ❌ |

---

## Melhorias P0 / P1 (parcial)

| Item | Status |
|------|--------|
| P0.2 Health check | ⚠️ Parcial (`GET /health` sem checagem DB/Redis) |
| P0.6 Telefone E.164 | ❌ Pendente |
| P1.3 Busca global clientes (nome/tel/MAC) | ⚠️ Parcial (nome + tel; MAC pendente) |
| P1.1–P1.2, P1.4–P1.6 | ❌ Pendente |
| P0.3 webhook idempotente (Mercado Pago) | ✅ Parcial (Asaas webhook pendente) |
| Demais P0 (seed unificado, audit, backup) | ❌ Pendente |

Ver checklist completo em [09-improvements-p0-p1.md](./09-improvements-p0-p1.md).

---

## 📋 Fase 4 — Automação + WhatsApp

- Job D-N: fatura + pagamento + template WhatsApp com **`{{payment_block}}`** (PIX ou link)
- Evolution API ou oficial ([03-integrations-pix-whatsapp.md](./03-integrations-pix-whatsapp.md))

---

## 📋 Fase 5 — Renovações + relatórios

- Fila `server_renewal_task` após pagamento confirmado
- `/renewals`, KPI dashboard, audit log (P0.4)

---

## Ordem de implementação sugerida

```mermaid
flowchart TD
  A[Fase 2.5: EMV real + webhook + job mensal] --> B[Fase 3: EMV tenant + webhook]
  B --> C[Fase 3.1: híbrido + InfinitePay link]
  C --> D[Fase 4: Automation + WhatsApp payment_block]
  D --> E[Fase 5: Renewals + Reports]
  F[P0/P1 paralelo: E.164, busca MAC, health DB] -.-> A
```

1. **Integração PSP EMV** (Asaas + Mercado Pago, factory + webhooks platform + tenant)  
2. **Campos híbridos** + adapter InfinitePay (link no Zap)  
3. **Job mensal** de faturas SaaS + tenant  
4. Automação D-N com `payment_block` e renovações  

---

## Débito técnico conhecido

| Item | Notas |
|------|--------|
| Pagamento / webhook | Stub EMV-only; **um PSP por tenant** (regra única `minAmountCents=0`); falta híbrido + adapters reais + idempotência |
| Providers no código | Enum Prisma ainda só `asaas`, `efi`, `mercadopago` — doc prevê `pushinpay`, `infinitypay` |
| Fatura cancelada na listagem | Permanece no banco; pode “sumir” em páginas seguintes (ordenar/filtrar por status) |
| `FormLayout` legado | Admin/tenant usam `PageLayout` |
| Screenshots na raiz | Não versionados |
| Testes API | Poucos; ampliar com billing |
| CORS / secrets produção | Ver [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) |

---

## Commits recentes (referência)

- `8c36b15` — Settings PIX: um provider + combobox; perfil sem exibir `role`  
- `2812876` — Billing overdue sync, modal único, dashboard ativações, UX cliente/fatura  
- `069f110` — Núcleo billing, filtros de listagem, cancel/recriar fatura  
- `7118ddf` — Roadmap Fase 2.5 nos guias  
- `6f2cc16` — Admin UI, busca e paginação em contas  
- `d1d524e` — Máscara MAC hex  

---

## 🚀 Próximo passo imediato

1. **`AsaasPaymentProvider`** + **`MercadoPagoPaymentProvider`** (EMV).  
2. **Webhooks** `POST /api/webhooks/payment/platform` e `/:tenantSlug/:provider` com idempotência.  
3. Migration **`paymentDeliveryType`**, **`checkoutUrl`** + **`InfinityPayProvider`** (link).  
4. **`payment-message.util`** + template **`{{payment_block}}`** (preparar Fase 4).  
5. **Job BullMQ** geração mensal de faturas SaaS.
