# Automação de cobrança e scheduler (node-cron)

Documentação do job in-process que gera faturas de assinatura (D-N), envia cobrança WhatsApp e opcionalmente cancela faturas vencidas.

**Stack:** `node-cron` dentro do processo Fastify (`apps/api`). Adequado ao Square Cloud Standard (1 processo contínuo, sem Redis/worker extra).

---

## O que o job faz

Por tenant com automação **ativa** (`TenantBillingAutomationConfig.active = true`):

1. **Auto-close (opt-in):** se `autoCloseSubscriptionInvoices = true`, cancela faturas **subscription** `open`/`overdue` sem pagamentos após `dueDate + closeSubscriptionInvoiceAfterDays` (default 30). Faturas **avulsas nunca** são canceladas.
2. **D-N:** clientes com `expiresAt` entre hoje e hoje + `daysBeforeDue`.
3. Se não existe fatura **subscription** ativa no ciclo → cria.
4. Se `sendWhatsapp` e ainda não houve envio com sucesso → envia cobrança (opcionalmente gera PIX antes se `sendPaymentCharge`).

Logs de execução: tabela `billing_job_runs`. Envios: `invoice_charge_deliveries`.

Após cada execução por tenant (com **Enviar WhatsApp** ativo), a API envia um **relatório WhatsApp para o telefone do tenant** (`accounts.phone`) listando todas as cobranças automáticas enviadas naquele tick, com resumo de clientes na janela, faturas criadas e ignoradas.

---

## Scheduler — quando roda

| Ambiente | Default | Cron | Filtro de tenants |
|----------|---------|------|-------------------|
| **Produção** | `BILLING_SCHEDULER_INTERVAL_MINUTES` não definido | `0 * * * *` (a cada hora, `:00`) | Só tenants com `automationRunHour` = hora atual (fuso abaixo) |
| **Development** | `10` minutos | `*/10 * * * *` | **Todos** os tenants ativos (ignora horário configurado na UI — facilita testes) |
| **Custom** | ver env | ver env | ver env |

Fuso padrão: **America/Sao_Paulo** (`BILLING_SCHEDULER_TZ`).

Horário configurado na UI (aba **Automação** em Configurações): **hora cheia** (00:00–23:00). Em produção, o tenant só é processado quando a hora atual (SP) coincide com `automationRunHour`.

---

## Variáveis de ambiente (API)

| Variável | Default | Descrição |
|----------|---------|-----------|
| `BILLING_SCHEDULER_ENABLED` | `true` (qualquer valor ≠ `false`) | `false` desliga o scheduler |
| `BILLING_SCHEDULER_TZ` | `America/Sao_Paulo` | Fuso para cron e filtro por hora |
| `BILLING_SCHEDULER_INTERVAL_MINUTES` | `10` (dev) / `60` (prod) | Intervalo em minutos. `< 60` → todos os tenants ativos por tick |
| `BILLING_SCHEDULER_CRON` | — | Expressão cron customizada (sobrescreve `INTERVAL_MINUTES`) |
| `BILLING_SCHEDULER_MATCH_HOUR` | auto | `true`/`false` — força filtro por hora do tenant (útil com `CRON` customizado) |

Exemplos:

```env
# Dev local / macbird — testar a cada 10 min, sem esperar horário configurado
BILLING_SCHEDULER_INTERVAL_MINUTES=10

# Produção — hourly, filtra por hora do tenant
BILLING_SCHEDULER_INTERVAL_MINUTES=60

# Cron explícito (avançado)
BILLING_SCHEDULER_CRON=0 * * * *
BILLING_SCHEDULER_MATCH_HOUR=true
```

Ao subir a API, o log confirma a configuração:

```
[billing-scheduler] started (timezone=America/Sao_Paulo, 10min, all-active-tenants)
[billing-scheduler] started (timezone=America/Sao_Paulo, 60min, hour-match)
```

---

## Configuração por tenant (UI)

Aba **Configurações → Automação** (`?tab=automacao`):

| Campo | Default | Notas |
|-------|---------|-------|
| Automação ativa | `true` | Desliga todo o fluxo D-N para o tenant |
| D-N (dias antes) | `3` | Janela até `expiresAt` |
| Horário diário | `09:00` | Hora cheia; usado em produção (interval ≥ 60 min) |
| Gerar PIX antes do envio | `true` | |
| Enviar WhatsApp | `true` | |
| Auto-close assinatura | `false` | **Opt-in** — nunca cancela por padrão |
| Dias após vencimento (auto-close) | `30` | Só visível se auto-close ligado |

Mensagens de cobrança ficam na aba **Cobrança** (`subscription` vs `oneOff`). Faturas avulsas têm editor próprio no modal/detalhe da fatura.

---

## Faturas: assinatura vs avulsa

| | **Subscription** | **One-off (avulsa)** |
|--|------------------|----------------------|
| `kind` | `subscription` | `one_off` |
| Ciclo | `YYYY-MM` | `one-off-{8 chars}` |
| Renovação IPTV ao pagar | Sim | **Não** |
| Registro `payments` (webhook ou manual) | Sim | **Sim** |
| Webhook Mercado Pago | Sim | **Sim** (mesmo fluxo) |
| Tarefas de ativação IPTV | Sim | **Não** |
| Auto-close | Só se flag tenant | **Nunca** |
| Índice único ciclo | Sim (não canceladas) | Não |

---

## Pagamento de faturas avulsas (webhook e manual)

Avulsas usam o **mesmo motor** de pagamento que assinaturas. O `kind` só afeta pós-pagamento (ativação IPTV).

### Fluxo webhook (Mercado Pago)

1. Fatura avulsa criada → `generatePayment` gera PIX e grava `providerChargeId` + referência externa (`invoice.id`).
2. Cliente paga → MP envia webhook para `/api/webhooks/payment/{tenantId}/mercadopago`.
3. `PaymentWebhookService` localiza a fatura (sem filtrar `kind`) e chama `PaymentConfirmationService.confirm()` com `source: 'webhook'`.
4. Cria linha em **`payments`**, fatura → **`paid`**, notificação WhatsApp de pagamento recebido (se configurada).
5. **Não** cria `connection_renewal_task` / não altera `customer.expiresAt`.

Pagamento parcial é rejeitado (`amountCents` deve bater). Webhook duplicado é idempotente (`providerPaymentId` UNIQUE).

### Pagamento manual

Na UI (detalhe da fatura ou fluxo de pagamentos), confirmar pagamento manual também passa por `confirm()` com `source: 'manual'` — mesmo efeito, sem webhook.

### PSP com webhook hoje

| Provider | Webhook implementado |
|----------|---------------------|
| Mercado Pago | ✅ |
| Asaas / Efi / outros | ❌ (confirmar manual ou implementar adapter webhook) |

### Teste rápido (avulsa + webhook)

1. Criar fatura avulsa para um cliente.
2. Gerar PIX (`generatePayment`).
3. Pagar via MP sandbox ou simular webhook com `payment_id` aprovado.
4. Conferir: `payments` com `source = webhook`, fatura `paid`, **sem** novas ativações pendentes.

---

## API (settings)

- `GET/PATCH /api/billing/settings/charge-messages` — templates assinatura + avulsa
- `GET/PATCH /api/billing/settings/billing-automation` — automação D-N
- `PATCH /api/billing/invoices/:id/charge-messages` — mensagens por fatura avulsa

---

## Deploy macbird (dev)

Do notebook (WSL):

```bash
bash /mnt/c/Users/jpaulosi/projetos/client-manager/wsl_sync_macbird.sh
```

No macbird, o script `deploy/scripts/macbird-apply-charge-messages.sh`:

1. `npm run build -w packages/shared`
2. `prisma migrate deploy`
3. `deploy/scripts/macbird-dev-evolution.sh` (API + Vite, Evolution prod, scheduler 10 min)

URLs típicas:

- Web: `http://192.168.18.88:5173/settings?tab=automacao`
- API: `http://192.168.18.88:3001/health`

Logs: `deploy/artifacts/dev-api.log`, `dev-web.log`

---

## Migrations relacionadas

- `20260610160000_charge_message_templates`
- `20260610200000_invoice_kind_billing_automation`
- `20260610210000_close_subscription_invoice_days`

---

## Teste manual rápido

1. Tenant com automação ativa + WhatsApp conectado.
2. Cliente com `expiresAt` dentro da janela D-N.
3. Em dev: aguardar até 10 min (ou reiniciar API e conferir log do scheduler).
4. Verificar fatura criada, `invoice_charge_deliveries`, resumo em `billing_job_runs`.
5. Auto-close: ligar flag, fatura subscription vencida há > N dias sem pagamento → `cancelReason = auto_close`.

---

## Square Cloud (produção)

Não há cron nativo no `squarecloud.app`. O scheduler in-process com `INTERVAL_MINUTES=60` é a abordagem recomendada no plano Standard.

Variáveis podem ser definidas no painel Square Cloud ou no `.env` do deploy em `deploy/squarecloud/api/`.
