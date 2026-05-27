# Melhorias P0 e P1 (Fase 1)

Checklist de melhorias **recomendadas** para incluir na Fase 1. Integrar nos passos de [01-phase-1-tenant-app.md](./01-phase-1-tenant-app.md).

| Prioridade | Significado |
|------------|-------------|
| **P0** | Fazer na Fase 1 — segurança, operação mínima, confiança |
| **P1** | Fazer na Fase 1 se der tempo; senão imediatamente após go-live |

---

## P0 — Obrigatório recomendado (Fase 1)

### P0.1 Seed de tenant demo

| Item | Detalhe |
|------|---------|
| **O quê** | Script `prisma/seed.ts`: 1 tenant, 1 owner, planos, servidores, 3–5 clientes com conexões |
| **Por quê** | Testar fluxo D-N, PIX, renovações sem cadastro manual |
| **Onde** | Passo 1 ou 8 |
| **Comando** | `pnpm db:seed` |

```bash
# package.json script
"db:seed": "prisma db seed"
```

---

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
| **Onde** | Módulo `billing` — Passo 4 |
| **Log** | `audit_log` se tentativa duplicada |

---

### P0.4 Audit log (ações críticas)

| Item | Detalhe |
|------|---------|
| **O quê** | Registrar em `audit_log`: CRUD cliente, pagamento confirmado, envio cobrança WA, marcar renovado |
| **Por quê** | Suporte, rastreio, disputa |
| **Onde** | Módulo `audit` — Passo 6–7 |
| **Campos** | `tenant_id`, `account_user_id`, `entity_type`, `action`, `old/new` jsonb |

---

### P0.5 Copiar PIX + link WhatsApp no mobile

| Item | Detalhe |
|------|---------|
| **O quê** | Botões no card/detalhe: **Copiar PIX** (`navigator.clipboard`) + **WhatsApp** (`https://wa.me/55{digits}`) |
| **Por quê** | Operação no celular com 1–2 toques |
| **Onde** | Features `customers`, `billing`, `renewals` — Passo 3–6 |
| **UX** | Toast sonner: “Copiado!” |

---

### P0.6 Validação telefone BR (E.164)

| Item | Detalhe |
|------|---------|
| **O quê** | Zod: telefone obrigatório; normalizar para E.164 (ex.: `+5511999999999`) |
| **Por quê** | WhatsApp e relatórios consistentes |
| **Onde** | `packages/shared` + `customers` service — Passo 3 |
| **Lib opcional** | `libphonenumber-js` ou regex BR + DDI 55 |

```typescript
// packages/shared — exemplo
phone: z.string().min(10).transform(normalizeBrazilPhoneE164)
```

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
0 3 * * * /opt/iptv-manager/scripts/backup-db.sh
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

### P1.3 Busca global (nome / telefone / MAC)

| Item | Detalhe |
|------|---------|
| **O quê** | Campo busca na lista clientes: `q` busca em `name`, `phone`, `connection.mac_address` |
| **Por quê** | Achar cliente rápido no celular |
| **Onde** | API `GET /customers?q=` — Passo 3 |
| **UX** | Debounce 300ms; sticky no topo |

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

## Mapa: melhoria → passo Fase 1

| Melhoria | Passo |
|----------|-------|
| P0.1 Seed | 1 ou 8 |
| P0.2 Health | 1 |
| P0.3 Webhook idempotência | 4 |
| P0.4 Audit log | 6–7 |
| P0.5 Copiar PIX / wa.me | 3–6 |
| P0.6 Telefone E.164 | 3 |
| P0.7 Backup DB | 8 |
| P1.1 PWA shortcuts | 1 / 8 |
| P1.2 Pull-to-refresh | 3–6 |
| P1.3 Busca global | 3 |
| P1.4 Dashboard renovações | 7 |
| P1.5 Notas no card | 3 |
| P1.6 Pagamentos no detalhe | 4–6 |

---

## Checklist consolidado (copiar para PR / revisão)

### P0

- [ ] P0.1 Seed tenant demo
- [ ] P0.2 `GET /api/health`
- [ ] P0.3 Idempotência webhook PIX
- [ ] P0.4 Audit log ações críticas
- [ ] P0.5 Copiar PIX + wa.me + toast
- [ ] P0.6 Telefone E.164 obrigatório
- [ ] P0.7 Backup Postgres (cron)

### P1

- [ ] P1.1 Manifest shortcuts PWA
- [ ] P1.2 Pull-to-refresh listas
- [ ] P1.3 Busca nome/telefone/MAC
- [ ] P1.4 Dashboard → renovações pendentes
- [ ] P1.5 Notas no card cliente
- [ ] P1.6 Pagamentos no detalhe cliente

---

## Prompt Cursor (lote P0)

> Implemente melhorias P0 de docs/iptv-manager/09-improvements-p0-p1.md no escopo atual: health check, seed, idempotência webhook, audit log, telefone E.164, copiar PIX e wa.me nos cards. Modular, sem monolito.

## Prompt Cursor (lote P1)

> Implemente melhorias P1 de docs/iptv-manager/09-improvements-p0-p1.md: manifest shortcuts, pull-to-refresh no CardList, busca q em customers, KPI renovações no dashboard, notas no card, aba pagamentos no detalhe do cliente.
