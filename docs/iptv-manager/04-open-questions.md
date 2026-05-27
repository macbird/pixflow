# Decisões de produto (referência)

Todas as decisões abaixo estão **fechadas**. O Cursor **não deve reperguntar** estes itens.

Spec detalhada: [IPTV-MANAGER-SPEC-TEMP.md](../../IPTV-MANAGER-SPEC-TEMP.md) §12.

---

## Já decidido

| Tópico | Decisão |
|--------|---------|
| E-mail login | Global; login tenant `/login` + admin `/admin/login` (Fase 2) |
| Conta nova | `active` imediato, sem trial |
| Confirmação e-mail | Não |
| Bloqueio por vencimento | Não automático |
| Automação | D-N programável (default 3): fatura + PIX + WhatsApp |
| Pós-pagamento | Baixa auto + `server_renewal_task` + relatório |
| Renovação servidor | Manual com status `pending` / `renewed_on_server` |
| WhatsApp | Um número por tenant |
| PIX | Adapter + PSP (Asaas primeiro); moeda **BRL** |
| Arquitetura | Modular (sem monolito) |
| UI listas | **Cards only** — sem tabelas como lista principal (§07) |
| **Relatório pós-pagamento** | **E-mail e/ou WhatsApp** para o revendedor — configurável; **pode ser ambos** |
| **Vencimento** | Apenas **`due_day` 1–28** (dia do mês); ciclo mensal; `billing_cycle_key` = `YYYY-MM` |
| **Telefone cliente** | **Obrigatório** sempre — não permitir criar/salvar cliente sem telefone |
| **Automação por tenant** | **Uma** `billing_automation_config` por tenant (config própria; única ativa) |
| **Plano SaaS** | Sem limite de clientes na Fase 1 |
| **Front admin** | **`apps/admin`** — app separado, **mesmo monorepo**, módulos independentes de `apps/web` |
| **Domínio / webhook** | Placeholder dev: `api.localhost`; produção definir depois |
| **Relatório diário** | Mesmos canais configuráveis (e-mail e/ou WhatsApp revendedor) |

---

## Implementação (resumo para código)

### Cliente (`customer`)

```typescript
// packages/shared — CustomerCreateSchema
phone: z.string().min(10, 'Telefone obrigatório'); // NOT NULL no Prisma
due_day: z.number().int().min(1).max(28);
```

### Relatórios (`tenant_report_config`)

| Campo | Valores |
|-------|---------|
| `daily_report_channels` | `email` \| `whatsapp` \| `both` |
| `post_payment_channels` | `email` \| `whatsapp` \| `both` |
| `report_email` | E-mail destino (default: `tenant_owner`) |
| `report_whatsapp_phone` | Número do revendedor (E.164) se canal WA |

### Automação (`billing_automation_config`)

- **UNIQUE(`tenant_id`)** — uma config por revendedor  
- Campos: `days_before_due`, `send_time`, toggles fatura/PIX/WA, `message_template_id`, `active`

### Monorepo

```
iptv-manager/
├── apps/
│   ├── api/       # backend único
│   ├── web/       # app revendedor (PWA)
│   └── admin/     # app plataforma (Fase 2)
└── packages/shared/
```

---

## Ainda em aberto (backlog — não bloqueia Fase 1)

| # | Tópico | Default dev até decidir |
|---|--------|-------------------------|
| L1 | **Estorno PIX** | Backlog Fase 2: cancelar task + reabrir fatura |
| L2 | **Renovação mensal** | Assumir calendário mensal por `due_day` (alinhado à decisão #2) |
| L3 | **Várias conexões / servidores** | Relatório lista **todas** as conexões do cliente |
| — | Provedor PIX definitivo | Asaas sandbox primeiro |
| — | Modelo monetização SaaS | Fase 2 |

---

## Quando alterar este arquivo

Nova decisão do produto → adicionar em **Já decidido** + atualizar `IPTV-MANAGER-SPEC-TEMP.md` §12.
