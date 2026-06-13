# Melhorias P0 e P1 (Fase 1)

Checklist de melhorias **recomendadas** para incluir na Fase 1 e fases de billing. Integrar nos passos de [01-phase-1-tenant-app.md](./01-phase-1-tenant-app.md).

**Roadmap billing:** P0.3 e P0.5 aplicam-se a **ambos** os escopos (`platform` e `tenant`) — ver [10-billing-dual-layer.md](./10-billing-dual-layer.md). Implementação do webhook começa na **Fase 2.5** (plataforma) e repete o padrão na **Fase 3** (tenant).

| Prioridade | Significado |
|------------|-------------|
| **P0** | Fazer na Fase 1 — segurança, operação mínima, confiança |
| **P1** | Fazer na Fase 1 se der tempo; senão imediatamente após go-live |

---

## P0 — Obrigatório recomendado (Fase 1)

### P0.2 Health check

| Item | Detalhe |
|------|---------|
| **O quê** | `GET /api/health` → `{ status: 'ok', db: 'ok', redis: 'ok' }` |
| **Por quê** | Docker, Uptime Kuma, reinício automático no VPS |
| **Onde** | Módulo `core` — Passo 1 |
| **Sem auth** | Rota pública |

---

### P0.3 Idempotência webhook PIX

| Item | Detalhe |
|------|---------|
| **O quê** | UNIQUE em `payment.provider_payment_id`; ignorar replay com mesmo ID |
| **Por quê** | PSP pode reenviar webhook → baixa duplicada |
| **Onde** | Módulo `billing` — **Fase 2.5** (webhook platform) e **Fase 3** (webhook tenant) |
| **Rotas** | `POST /api/webhooks/payment/platform` · `POST /api/webhooks/payment/:tenantSlug/:provider` (alias legado `/webhooks/pix/...`) |
| **Log** | `audit_log` se tentativa duplicada |

---

### P0.4 Audit log (ações críticas)

| Item | Detalhe |
|------|---------|
| **O quê** | Registrar em `audit_log`: CRUD cliente, pagamento confirmado, envio cobrança WA, marcar renovado |
| **Por quê** | Suporte, rastreio, disputa |
| **Onde** | Módulo `audit` — Passo 6–7 |
| **Campos** | `tenant_id`, `account_user_id`, `entity_type`, `action`, `old/new` jsonb |
| **Status** | ✅ API `GET /api/logs` + UI `/logs` |

---

### P0.5 Copiar PIX no mobile

| Item | Detalhe |
|------|---------|
| **O quê** | Botão **Copiar PIX** no detalhe da fatura (`navigator.clipboard`) + toast |
| **Por quê** | Operação no celular com 1–2 toques |
| **Onde** | Detalhe fatura (`InvoiceDetailPage`) |
| **Fora de escopo** | `wa.me` nos cards da listagem; wa.me em clientes/renovações |

---

### P0.6 Validação telefone BR (E.164)

| Item | Detalhe |
|------|---------|
| **O quê** | Schemas Zod reutilizáveis (`requiredPhoneE164Schema`, `optionalPhoneE164Schema`) em `packages/shared/src/phone-e164.ts` |
| **Por quê** | WhatsApp e relatórios consistentes |
| **Onde** | Cliente, conta admin, register, Evolution connect/test |
| **Status** | ✅ Universalizado via `normalizePhoneE164` |

---

### P0.7 Backup PostgreSQL automático

| Item | Detalhe |
|------|---------|
| **O quê** | Cron no VPS: `pg_dump` diário → pasta com retenção 7 dias |
| **Por quê** | VPS único = perda total se disco falhar |
| **Onde** | Passo 8 — `scripts/backup-db.sh` + cron |
| **Doc** | README deploy |

```bash
# exemplo cron 3h da manhã
0 3 * * * /opt/client-manager/scripts/backup-db.sh
```

---

## P1 — Alta prioridade (Fase 1 ou logo após)

### P1.1 Atalhos PWA no manifest

| Item | Detalhe |
|------|---------|
| **O quê** | `manifest.shortcuts`: “Novo cliente”, “Renovações pendentes” |
| **Por quê** | Acesso rápido na tela inicial do app instalado |
| **Onde** | `vite.config.ts` — Passo 1 / 8 |
| **Ref** | [06-pwa-responsive.md](./06-pwa-responsive.md) |

```json
"shortcuts": [
  { "name": "Novo cliente", "url": "/customers/new", "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }] },
  { "name": "Renovações", "url": "/renewals?status=pending", "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }] }
]
```

---

### P1.2 Pull-to-refresh nas listas

| Item | Detalhe |
|------|---------|
| **O quê** | Gesto ou botão atualizar em: clientes, renovações, faturas |
| **Por quê** | Comportamento esperado em app mobile |
| **Onde** | `CardList` ou hook `usePullToRefresh` — Passo 3–6 |
| **Implementação** | `queryClient.invalidateQueries` no TanStack Query |

---

### P1.3 Busca global (nome / telefone)

| Item | Detalhe |
|------|---------|
| **O quê** | Campo busca na lista clientes: filtro em `name` e `phone` |
| **Fora de escopo** | Busca por MAC (`connection.mac_address`) |
| **Onde** | API `GET /customers?filter=` — Passo 3 |
| **Status** | ✅ Nome + telefone |

---

### P1.4 Filtro rápido no dashboard — “Renovações pendentes”

| Item | Detalhe |
|------|---------|
| **O quê** | Card KPI clicável → `/renewals?status=pending_server_renewal` |
| **Por quê** | Foco operacional pós-pagamento |
| **Onde** | Módulo `dashboard` — Passo 7 |
| **Contador** | `COUNT` tasks `pending_server_renewal` |

---

### P1.5 Notas do cliente visíveis no card

| Item | Detalhe |
|------|---------|
| **O quê** | Se `customer.notes` preenchido, linha truncada (1 linha) no `CustomerCard` |
| **Por quê** | Contexto sem abrir detalhe |
| **Onde** | `features/customers` — Passo 3 |

---

### P1.6 Histórico de pagamentos no detalhe do cliente

| Item | Detalhe |
|------|---------|
| **O quê** | Aba ou seção “Pagamentos” em `/customers/:id` — últimos N pagamentos |
| **Por quê** | Menos navegação para `/payments` |
| **Onde** | API `GET /customers/:id/payments` — Passo 4–6 |
| **UI** | Sub-cards ou lista compacta |

---

## Mapa: melhoria → fase

| Melhoria | Fase / passo |
|----------|----------------|
| P0.2 Health | 1 |
| P0.3 Webhook idempotência | **2.5** (platform) + **3** (tenant) |
| P0.4 Audit log | 5–6 (após billing) |
| P0.5 Copiar PIX + wa.me | **3** (detalhe fatura; cards listagem fora de escopo) |
| P0.6 Telefone E.164 | 1 (passo 3) |
| P0.7 Backup DB | 8 |
| P1.1 PWA shortcuts | 1 / 8 |
| P1.2 Pull-to-refresh | 1–5 |
| P1.3 Busca global | 1 (passo 3) |
| P1.4 Dashboard renovações | 5 |
| P1.5 Notas no card | 1 (passo 3) |
| P1.6 Pagamentos no detalhe | **3** (passo 4) |

---

## Checklist consolidado (copiar para PR / revisão)

### P0

- [x] P0.2 `GET /api/health` (inclui checagem DB)
- [x] P0.3 Idempotência webhook PIX
- [x] P0.4 Audit log ações críticas (módulo `audit`, UI `/logs`)
- [x] P0.5 Copiar PIX no detalhe fatura (wa.me / cards listagem fora de escopo)
- [x] P0.6 Telefone E.164 (`phone-e164.ts` + schemas Zod)
- [ ] P0.7 Backup Postgres (cron)

### P1

- [ ] P1.1 Manifest shortcuts PWA
- [ ] P1.2 Pull-to-refresh listas
- [x] P1.3 Busca nome/telefone (MAC fora de escopo)
- [ ] P1.4 Dashboard → renovações pendentes
- [ ] P1.5 Notas no card cliente
- [ ] P1.6 Pagamentos no detalhe cliente

---

## Prompt Cursor (lote P0 — billing)

> Implemente P0.3 e P0.5 conforme docs/iptv-manager/10-billing-dual-layer.md na Fase 2.5: webhook platform idempotente, copiar PIX nas faturas admin. Reutilize o mesmo padrão na Fase 3 para tenant.

## Prompt Cursor (lote P0 — geral)

> Implemente melhorias P0 de docs/client-manager/09-improvements-p0-p1.md no escopo atual: health check (+ DB), telefone E.164, audit log quando billing existir. Modular, sem monolito.

## Prompt Cursor (lote P1)

> Implemente melhorias P1 de docs/client-manager/09-improvements-p0-p1.md: manifest shortcuts, pull-to-refresh no CardList, busca q em customers, KPI renovações no dashboard, notas no card, aba pagamentos no detalhe do cliente.
