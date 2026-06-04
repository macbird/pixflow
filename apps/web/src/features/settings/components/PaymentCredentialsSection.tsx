import React from 'react';
import { Copy } from 'lucide-react';
import {
  PAYMENT_PROVIDER_FEE_HINTS,
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_PROVIDER_VALUES,
  type PaymentProviderValue,
  type TenantPaymentCredentialDto,
} from '@client-manager/shared';
import { SecretCredentialField } from './SecretCredentialField';
import { showToast } from '../../../shared/utils/toast';

export type PaymentCredentialFormState = TenantPaymentCredentialDto & {
  apiKey: string;
  webhookToken: string;
};

function emptyCredential(provider: PaymentProviderValue): PaymentCredentialFormState {
  return {
    provider,
    apiKey: '',
    webhookToken: '',
    apiKeyConfigured: false,
    webhookTokenConfigured: false,
    active: false,
  };
}

function mergeCredentials(
  fromApi: TenantPaymentCredentialDto[] | undefined,
): PaymentCredentialFormState[] {
  const byProvider = new Map(fromApi?.map((c) => [c.provider, c]));

  return PAYMENT_PROVIDER_VALUES.map((provider) => {
    const existing = byProvider.get(provider);
    if (!existing) return emptyCredential(provider);
    return {
      ...existing,
      apiKey: '',
      webhookToken: '',
    };
  });
}

export function buildCredentialFormState(
  fromApi: TenantPaymentCredentialDto[] | undefined,
): PaymentCredentialFormState[] {
  return mergeCredentials(fromApi);
}

export function resolveInitialPaymentProvider(
  credentials: TenantPaymentCredentialDto[] | undefined,
  routingProvider?: PaymentProviderValue,
): PaymentProviderValue {
  const active = credentials?.find((item) => item.active);
  if (active) {
    return active.provider as PaymentProviderValue;
  }
  return routingProvider ?? 'mercadopago';
}

interface PaymentCredentialsSectionProps {
  selectedProvider: PaymentProviderValue;
  onProviderChange: (provider: PaymentProviderValue) => void;
  credentials: PaymentCredentialFormState[];
  onChange: (credentials: PaymentCredentialFormState[]) => void;
  mercadoPagoWebhookUrl?: string | null;
  mercadoPagoWebhookRequiresToken?: boolean;
}

export const PaymentCredentialsSection: React.FC<PaymentCredentialsSectionProps> = ({
  selectedProvider,
  onProviderChange,
  credentials,
  onChange,
  mercadoPagoWebhookUrl,
  mercadoPagoWebhookRequiresToken = false,
}) => {
  const selected =
    credentials.find((item) => item.provider === selectedProvider) ??
    emptyCredential(selectedProvider);

  const updateSelected = (patch: Partial<PaymentCredentialFormState>) => {
    const exists = credentials.some((item) => item.provider === selectedProvider);
    if (!exists) {
      onChange([...credentials, { ...emptyCredential(selectedProvider), ...patch }]);
      return;
    }
    onChange(
      credentials.map((item) =>
        item.provider === selectedProvider ? { ...item, ...patch } : item,
      ),
    );
  };

  const hint = PAYMENT_PROVIDER_FEE_HINTS[selectedProvider];

  const copyWebhookUrl = () => {
    if (!mercadoPagoWebhookUrl) return;
    navigator.clipboard.writeText(mercadoPagoWebhookUrl);
    showToast.success('URL do webhook copiada');
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Escolha o meio de pagamento para <strong>gerar PIX</strong> das faturas. Depois cadastre a
        API key e o token do webhook desse meio.
      </p>

      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="payment-provider">
          Meio de pagamento
        </label>
        <select
          id="payment-provider"
          value={selectedProvider}
          onChange={(e) => onProviderChange(e.target.value as PaymentProviderValue)}
          className="mt-2 block w-full max-w-md rounded-md border border-slate-300 p-2.5 text-sm shadow-sm"
        >
          {PAYMENT_PROVIDER_VALUES.map((value) => (
            <option key={value} value={value}>
              {PAYMENT_PROVIDER_LABELS[value]}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-slate-500">
          {hint.label} — {hint.description}
        </p>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4">
        <h3 className="font-medium text-slate-900">{PAYMENT_PROVIDER_LABELS[selectedProvider]}</h3>
        <p className="mt-0.5 text-xs text-slate-500">Credenciais para integração com o PIX</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SecretCredentialField
            id={`payment-api-key-${selectedProvider}`}
            label="API Key / Access Token"
            value={selected.apiKey}
            configured={selected.apiKeyConfigured}
            onChange={(apiKey) => updateSelected({ apiKey })}
            emptyPlaceholder="Cole o Access Token (ex.: TEST-...)"
            configuredHint="Access token salvo — não exibido por segurança"
          />
          <SecretCredentialField
            id={`payment-webhook-${selectedProvider}`}
            label="Token do webhook"
            value={selected.webhookToken}
            configured={selected.webhookTokenConfigured}
            onChange={(webhookToken) => updateSelected({ webhookToken })}
            emptyPlaceholder="Opcional"
            configuredHint="Token do webhook salvo — não exibido por segurança"
          />
        </div>

        {selectedProvider === 'mercadopago' ? (
          <>
            <p className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
              Mercado Pago: copie o <strong>Access Token</strong> (token longo) em Developers →
              Credenciais de teste. Não use a <strong>Public Key</strong> (UUID curto) nem o
              usuário <code className="font-mono">TESTUSER...</code>.
            </p>
            {mercadoPagoWebhookUrl ? (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-3">
                <p className="text-xs font-medium text-emerald-900">URL do webhook (PIX pago)</p>
                <div className="mt-2 flex items-start gap-2">
                  <code className="flex-1 break-all font-mono text-[11px] text-emerald-950">
                    {mercadoPagoWebhookUrl}
                    {mercadoPagoWebhookRequiresToken ? '?token=SEU_TOKEN' : ''}
                  </code>
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="shrink-0 rounded p-1 text-emerald-700 hover:bg-emerald-100"
                    title="Copiar URL"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-emerald-800">
                  Cadastre em Mercado Pago → Webhooks → evento <strong>Payments</strong>. Em
                  desenvolvimento local use ngrok apontando para a API (
                  <code className="font-mono">API_PUBLIC_BASE_URL</code>).
                </p>
              </div>
            ) : null}
          </>
        ) : null}
        {!selected.apiKeyConfigured ? (
          <p className="mt-3 text-xs text-amber-700">
            Informe a API key e clique em <strong>Salvar</strong> no fim da página.
          </p>
        ) : null}
      </div>
    </div>
  );
};
