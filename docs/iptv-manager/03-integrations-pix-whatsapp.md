# Integrações — PIX e WhatsApp

## Posso criar meu “próprio” PIX?

### O que a lei/marketplace exige

**PIX como meio de pagamento** para terceiros exige ser **Participante PIX** (instituição autorizada BACEN) ou usar um **PSP/agregador** (Asaas, Efi, Mercado Pago, banco).

Você **não** vai implementar:

- Chave DICT, SPI, liquidação no Banco Central  
- QR Code EMV sem PSP  

Isso não é um projeto de app — é instituição financeira.

### O que você **cria no seu sistema** (correto e suficiente)

Seu **módulo de pagamento interno**:

```
integrations/payment/
├── payment-provider.interface.ts
├── asaas.provider.ts              # taxa fixa — valores altos
├── efi.provider.ts                # futuro — percentual
├── mercadopago.provider.ts        # percentual — valores baixos
├── payment-router.service.ts      # escolhe PSP por amountCents
├── payment-fee.util.ts            # opcional: preview de taxa
└── payment-provider.factory.ts    # credencial por accountId + provider
```

Ver roteamento completo em [10-billing-dual-layer.md](./10-billing-dual-layer.md#roteamento-de-psp-por-valor--detalhe).

Responsabilidades **suas**:

| Responsabilidade | Onde |
|------------------|------|
| Quando gerar cobrança | `automation` + `billing` |
| Valor, vencimento, ciclo | `invoice` |
| Idempotência webhook | `billing` |
| Baixa e fila renovação | `billing` → evento → `renewals` |
| Relatório pós-pagamento | `reports` |

**Conclusão:** “mecanismo PIX próprio” = **seu domínio + adapter plugável**, não substituir o Banco Central.

### Por onde começar (custo baixo)

1. Conta **sandbox Asaas** + segundo PSP (Mercado Pago ou Efi)  
2. Implementar `AsaasPaymentProvider` + adapter percentual  
3. `PaymentRouter`: limiar configurável por tenant (`tenant_payment_routing_rules`)  
4. Webhook: `POST /api/webhooks/pix/:tenantSlug/:provider`  

---

## Posso criar meu “próprio” WhatsApp?

### Opções reais

| Abordagem | O que é | Prós | Contras |
|-----------|---------|------|---------|
| **Evolution API / Baileys** | Automatiza WhatsApp Web | Barato, flexível | Risco de **ban**; viola ToS se uso massivo |
| **WhatsApp Business API (Meta)** | Oficial | Estável, templates | Custo, aprovação, templates para proativo |
| “Criar do zero” | Reimplementar protocolo | — | **Inviável** e ilegal/instável |

Você **não** cria o protocolo WhatsApp. Cria:

```
integrations/whatsapp/
├── whatsapp-provider.interface.ts
├── evolution.provider.ts
└── official-meta.provider.ts   # futuro
```

### O que é seu no WhatsApp

- Templates com `{{nome}}`, `{{pix}}`, `{{vencimento}}`
- Fila BullMQ `message-sender`
- `message_log`, regras D-N ligadas à automação
- **Um número por tenant** (`tenant_whatsapp_config`)

### Recomendação Fase 1 (custo baixo)

- **Evolution API** em container no mesmo VPS  
- Migrar para API oficial quando volume/revenda justificar  

---

## Contratos (interfaces) — copiar para o código

### PaymentProvider

```typescript
export interface CreatePixInput {
  tenantId: string;
  invoiceId: string;
  amountCents: number;
  dueDate: Date;
  payerName: string;
  payerDocument?: string;
}

export interface PixChargeResult {
  providerChargeId: string;
  copyPasteCode: string;
  qrCodeBase64?: string;
  expiresAt: Date;
}

export interface PaymentProvider {
  createPixCharge(input: CreatePixInput): Promise<PixChargeResult>;
  parseWebhook(body: unknown, headers: Record<string, string>): Promise<WebhookPaymentEvent>;
}
```

### WhatsAppProvider

```typescript
export interface SendMessageInput {
  tenantId: string;
  phoneE164: string;
  text: string;
}

export interface WhatsAppProvider {
  sendText(input: SendMessageInput): Promise<{ providerMessageId: string }>;
  healthCheck(tenantId: string): Promise<boolean>;
}
```

---

## Configuração por tenant

| Tabela | Uso |
|--------|-----|
| `tenant_payment_credentials` | N credenciais por tenant: `(accountId, provider)` → api_key, webhook_secret |
| `tenant_payment_routing_rules` | Limiares `minAmountCents` → `provider` (roteamento por valor da fatura) |
| `tenant_payment_config` | **Legado** — migrar para `tenant_payment_credentials` |
| `tenant_whatsapp_config` | Evolution instance URL, token |

| Campo em `Invoice` | Uso |
|--------------------|-----|
| `paymentProvider` | PSP usado na cobrança — setado ao gerar PIX; webhook usa para escolher adapter |
| `providerChargeId` | ID da cobrança no PSP |

Nunca commitar secrets; usar `.env` só para infra (DB, Redis), credenciais PSP **no banco por tenant**.
