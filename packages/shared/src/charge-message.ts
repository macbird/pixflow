import { z } from 'zod';
import type { PaymentMessageInvoice } from './payment-message';
import { buildPaymentWhatsAppBlock } from './payment-message';

export const CHARGE_MESSAGE_PLACEHOLDERS = [
  { key: '{{nome}}', label: 'Nome do cliente' },
  { key: '{{valor}}', label: 'Valor formatado (R$)' },
  { key: '{{vencimento}}', label: 'Data de vencimento' },
  { key: '{{ciclo}}', label: 'Ciclo da fatura' },
  { key: '{{pix}}', label: 'PIX copia e cola (somente código)' },
  { key: '{{payment_block}}', label: 'Bloco PIX ou link completo' },
  { key: '{{link}}', label: 'URL de checkout' },
  { key: '{{empresa}}', label: 'Nome do tenant' },
  { key: '{{descricao}}', label: 'Descrição da cobrança avulsa' },
  { key: '{{dias_atraso}}', label: 'Dias em atraso (pós-vencimento)' },
] as const;

export const DEFAULT_CHARGE_MESSAGE_TEMPLATES = [
  `Olá, {{nome}}!

Sua cobrança referente ao ciclo {{ciclo}} está disponível.
Valor: {{valor}}
Vencimento: {{vencimento}}`,
  '{{pix}}',
] as const;

export const DEFAULT_ONE_OFF_CHARGE_MESSAGE_TEMPLATES = [
  `Olá, {{nome}}!

{{descricao}}
Valor: {{valor}}
Vencimento: {{vencimento}}`,
  '{{pix}}',
] as const;

export const DEFAULT_OVERDUE_REMINDER_MESSAGE_TEMPLATES = [
  `Olá, {{nome}}!

Sua fatura de {{valor}} com vencimento em {{vencimento}} está em atraso há {{dias_atraso}} dia(s).
Por favor, regularize o pagamento.`,
  '{{pix}}',
] as const;

export const DEFAULT_OVERDUE_REMINDER_TEMPLATES_BY_WINDOW: Record<number, readonly string[]> = {
  1: [
    `Olá, {{nome}}!

Notamos que sua fatura de {{valor}} (venc. {{vencimento}}) ainda não foi paga.
Estamos há {{dias_atraso}} dia em atraso — regularize quando puder.`,
    '{{pix}}',
  ],
  7: [
    `Olá, {{nome}}!

Sua cobrança de {{valor}} (venc. {{vencimento}}) segue em aberto há {{dias_atraso}} dias.
Evite interrupção do serviço — pague via PIX abaixo.`,
    '{{pix}}',
  ],
  15: [
    `Olá, {{nome}}!

Último aviso: fatura de {{valor}} (venc. {{vencimento}}) com {{dias_atraso}} dias de atraso.
Regularize hoje ou entre em contato conosco.`,
    '{{pix}}',
  ],
};

export const DEFAULT_CHARGE_MESSAGE_DELAY_MS = 1500;

export const chargeMessageSettingsSchema = z.object({
  templates: z
    .array(z.string().max(4000))
    .min(1, 'Informe ao menos uma mensagem')
    .max(20, 'Máximo de 20 mensagens por sequência'),
  delayMs: z
    .number()
    .int()
    .min(0, 'Delay mínimo é 0 ms')
    .max(30000, 'Delay máximo é 30 segundos'),
});

export type ChargeMessageSettingsInput = z.infer<typeof chargeMessageSettingsSchema>;

export interface ChargeMessageTemplateContext {
  payerName: string;
  tenantName: string;
  description?: string;
  daysOverdue?: number;
  invoice: PaymentMessageInvoice;
}

export interface ChargeMessageSettingsDto {
  templates: string[];
  delayMs: number;
}

/**
 * Builds placeholder map for charge message templates.
 */
export function buildChargeMessagePlaceholderMap(
  context: ChargeMessageTemplateContext,
): Record<string, string> {
  const amount = (context.invoice.amountCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const due =
    context.invoice.dueDate instanceof Date
      ? context.invoice.dueDate.toLocaleDateString('pt-BR')
      : new Date(context.invoice.dueDate).toLocaleDateString('pt-BR');

  const paymentBlock = buildPaymentWhatsAppBlock(context.invoice);
  const pix = context.invoice.pixCopyPaste?.trim() ?? '';
  const link = context.invoice.checkoutUrl?.trim() ?? '';

  return {
    '{{nome}}': context.payerName,
    '{{valor}}': amount,
    '{{vencimento}}': due,
    '{{ciclo}}': context.invoice.billingCycleKey,
    '{{pix}}': pix,
    '{{payment_block}}': paymentBlock,
    '{{link}}': link,
    '{{empresa}}': context.tenantName,
    '{{descricao}}': context.description?.trim() ?? '',
    '{{dias_atraso}}':
      context.daysOverdue !== undefined ? String(context.daysOverdue) : '',
  };
}

/**
 * Renders a single charge message template with placeholders.
 */
export function renderChargeMessageTemplate(
  template: string,
  context: ChargeMessageTemplateContext,
): string {
  const placeholders = buildChargeMessagePlaceholderMap(context);
  let rendered = template;

  for (const [key, value] of Object.entries(placeholders)) {
    rendered = rendered.split(key).join(value);
  }

  return rendered.trim();
}

/**
 * Renders an ordered list of charge message templates, skipping empty results.
 */
export function buildChargeMessagesFromTemplates(
  templates: string[],
  context: ChargeMessageTemplateContext,
): string[] {
  const messages: string[] = [];

  for (const template of templates) {
    const rendered = renderChargeMessageTemplate(template, context);
    if (rendered) {
      messages.push(rendered);
    }
  }

  return messages;
}

/**
 * Parses charge message templates from persisted JSON with safe defaults.
 */
export function parseChargeMessageTemplates(
  value: unknown,
  fallback: readonly string[] = DEFAULT_CHARGE_MESSAGE_TEMPLATES,
): string[] {
  if (Array.isArray(value)) {
    const templates = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
    if (templates.length > 0) {
      return templates;
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as { templates?: unknown };
    if (Array.isArray(record.templates)) {
      return parseChargeMessageTemplates(record.templates, fallback);
    }
  }

  return [...fallback];
}

/**
 * Resolves templates and delay from persisted invoice or tenant JSON.
 */
export function resolveChargeMessageConfig(params: {
  invoiceTemplates?: unknown;
  invoiceDelayMs?: number | null;
  tenantSubscriptionTemplates?: unknown;
  tenantOneOffTemplates?: unknown;
  tenantDelayMs?: number;
  kind: 'subscription' | 'one_off';
}): ChargeMessageSettingsDto {
  const subscriptionFallback = [...DEFAULT_CHARGE_MESSAGE_TEMPLATES];
  const oneOffFallback = [...DEFAULT_ONE_OFF_CHARGE_MESSAGE_TEMPLATES];
  const tenantFallback =
    params.kind === 'one_off' ? oneOffFallback : subscriptionFallback;

  if (params.invoiceTemplates !== undefined && params.invoiceTemplates !== null) {
    return {
      templates: parseChargeMessageTemplates(params.invoiceTemplates, tenantFallback),
      delayMs: params.invoiceDelayMs ?? params.tenantDelayMs ?? DEFAULT_CHARGE_MESSAGE_DELAY_MS,
    };
  }

  const tenantTemplates =
    params.kind === 'one_off'
      ? params.tenantOneOffTemplates ?? params.tenantSubscriptionTemplates
      : params.tenantSubscriptionTemplates;

  return {
    templates: parseChargeMessageTemplates(tenantTemplates, tenantFallback),
    delayMs: params.tenantDelayMs ?? DEFAULT_CHARGE_MESSAGE_DELAY_MS,
  };
}

/**
 * Resolves overdue reminder templates for a specific window day (D+N).
 */
export function resolveOverdueReminderTemplates(params: {
  windowDaysAfterDue: number;
  tenantOverdueTemplates?: unknown;
}): string[] {
  const windowFallback =
    DEFAULT_OVERDUE_REMINDER_TEMPLATES_BY_WINDOW[params.windowDaysAfterDue] ??
    DEFAULT_OVERDUE_REMINDER_MESSAGE_TEMPLATES;

  if (params.tenantOverdueTemplates && typeof params.tenantOverdueTemplates === 'object') {
    const record = params.tenantOverdueTemplates as Record<string, unknown>;
    const windowKey = `subscriptionOverdueDay${params.windowDaysAfterDue}`;
    const genericKey = 'subscriptionOverdue';

    if (record[windowKey] !== undefined) {
      return parseChargeMessageTemplates(record[windowKey], windowFallback);
    }
    if (record[genericKey] !== undefined) {
      return parseChargeMessageTemplates(record[genericKey], windowFallback);
    }
  }

  return [...windowFallback];
}

/**
 * Formats charge messages as a single string (legacy preview / wa.me).
 */
export function buildBillingChargeMessage(params: {
  payerName: string;
  invoice: PaymentMessageInvoice;
  tenantName?: string;
}): string {
  const messages = buildChargeMessagesFromTemplates([...DEFAULT_CHARGE_MESSAGE_TEMPLATES], {
    payerName: params.payerName,
    tenantName: params.tenantName ?? '',
    invoice: params.invoice,
  });

  return messages.join('\n\n');
}

/**
 * Builds preview context for charge message settings UI.
 */
export function buildChargeMessagePreviewContext(): ChargeMessageTemplateContext {
  return {
    payerName: 'Maria Silva',
    tenantName: 'Toro TV',
    invoice: {
      pixCopyPaste: '00020126580014BR.GOV.BCB.PIX01361234567890',
      amountCents: 4990,
      billingCycleKey: '2026-06',
      dueDate: '2026-06-15',
      paymentDeliveryType: 'emv',
    },
  };
}
