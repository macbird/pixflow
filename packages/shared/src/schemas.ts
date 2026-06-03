import { z } from 'zod';
import { CUSTOMER_STATUS_VALUES } from './customer-status';
import { CustomerStatus } from './enums';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  accountName: z.string().min(3),
  userName: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const planSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do plano'),
  description: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().optional(),
  ),
  price: z.coerce.number().min(0, 'Informe um preço válido'),
  billingCycle: z.enum(['monthly', 'quarterly', 'yearly'], {
    errorMap: () => ({ message: 'Selecione o ciclo de cobrança' }),
  }),
  maxConnections: z.coerce.number().int().min(1, 'Informe ao menos 1 conexão'),
  extraConnectionPrice: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? 0 : v),
    z.coerce.number().min(0).default(0),
  ),
  status: z.enum(['active', 'archived']).default('active'),
});

export type PlanInput = z.infer<typeof planSchema>;

export const serverSchema = z.object({
  name: z.string().min(1),
  panelUrl: z.string().url(),
  panelNotes: z.string().optional(),
  maxConnections: z.number().int().min(1).optional(),
  status: z.enum(['active', 'maintenance', 'full']).default('active'),
});

export type ServerInput = z.infer<typeof serverSchema>;

export const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export type TagInput = z.infer<typeof tagSchema>;

export const connectionSchema = z.object({
  serverId: z.string().uuid().or(z.literal('')),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'MAC inválido'),
  applicationName: z.string().min(1, 'Aplicativo obrigatório'),
  label: z.string().optional().or(z.literal('')),
});

export const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(10, "Telefone inválido"),
  status: z.enum(CUSTOMER_STATUS_VALUES).default(CustomerStatus.ACTIVE),
  tagIds: z.array(z.string().uuid()).optional(),
  planId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  expiresAt: z.preprocess((val) => val ? new Date(val as string) : undefined, z.date().optional()),
  connections: z.array(connectionSchema).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

const paymentProviderEnum = z.enum(['asaas', 'efi', 'mercadopago']);

export const tenantPaymentCredentialSchema = z.object({
  provider: paymentProviderEnum,
  apiKey: z.string().optional(),
  webhookToken: z.string().optional(),
  active: z.boolean().optional(),
});

export const tenantPaymentRoutingRuleSchema = z.object({
  minAmountCents: z.number().int().min(0),
  provider: paymentProviderEnum,
  active: z.boolean().optional(),
});

export const updateTenantPaymentCredentialsSchema = z.object({
  credentials: z.array(tenantPaymentCredentialSchema).min(1),
});

export const updateTenantPaymentRoutingSchema = z.object({
  rules: z.array(tenantPaymentRoutingRuleSchema).min(1),
});

export type UpdateTenantPaymentCredentialsInput = z.infer<
  typeof updateTenantPaymentCredentialsSchema
>;
export type UpdateTenantPaymentRoutingInput = z.infer<typeof updateTenantPaymentRoutingSchema>;
