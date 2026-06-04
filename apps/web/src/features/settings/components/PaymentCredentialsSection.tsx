import React from 'react';
import {
  PAYMENT_PROVIDER_FEE_HINTS,
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_PROVIDER_VALUES,
  type PaymentProviderValue,
  type TenantPaymentCredentialDto,
} from '@client-manager/shared';

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
}

export const PaymentCredentialsSection: React.FC<PaymentCredentialsSectionProps> = ({
  selectedProvider,
  onProviderChange,
  credentials,
  onChange,
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
          <div>
            <label className="block text-xs font-medium text-slate-600">API Key</label>
            <input
              type="password"
              value={selected.apiKey}
              onChange={(e) => updateSelected({ apiKey: e.target.value })}
              placeholder={
                selected.apiKeyConfigured ? '•••••••• (deixe vazio para manter)' : 'Cole a API key'
              }
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-mono text-sm shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Token do webhook</label>
            <input
              type="password"
              value={selected.webhookToken}
              onChange={(e) => updateSelected({ webhookToken: e.target.value })}
              placeholder={
                selected.webhookTokenConfigured
                  ? '•••••••• (deixe vazio para manter)'
                  : 'Opcional'
              }
              className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-mono text-sm shadow-sm"
            />
          </div>
        </div>

        {selected.apiKeyConfigured || selected.webhookTokenConfigured ? (
          <p className="mt-3 text-xs text-emerald-700">
            Credenciais já configuradas. Preencha os campos apenas se quiser alterar.
          </p>
        ) : (
          <p className="mt-3 text-xs text-amber-700">
            Informe a API key e clique em <strong>Salvar</strong> no fim da página.
          </p>
        )}
      </div>
    </div>
  );
};
