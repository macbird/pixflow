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

interface PaymentCredentialsSectionProps {
  credentials: PaymentCredentialFormState[];
  onChange: (credentials: PaymentCredentialFormState[]) => void;
}

export function buildCredentialFormState(
  fromApi: TenantPaymentCredentialDto[] | undefined,
): PaymentCredentialFormState[] {
  return mergeCredentials(fromApi);
}

export const PaymentCredentialsSection: React.FC<PaymentCredentialsSectionProps> = ({
  credentials,
  onChange,
}) => {
  const update = (provider: PaymentProviderValue, patch: Partial<PaymentCredentialFormState>) => {
    onChange(
      credentials.map((item) => (item.provider === provider ? { ...item, ...patch } : item)),
    );
  };

  return (
    <div className="space-y-4">
      {credentials.map((item) => {
        const hint = PAYMENT_PROVIDER_FEE_HINTS[item.provider as PaymentProviderValue];
        return (
          <div
            key={item.provider}
            className={`rounded-lg border p-4 ${
              item.active ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-slate-900">
                  {PAYMENT_PROVIDER_LABELS[item.provider as PaymentProviderValue]}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {hint.label} — {hint.description}
                </p>
                {!item.active ? (
                  <p className="mt-1 text-xs text-amber-700">Desativado — não entra nas regras de valor.</p>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={item.active}
                  onChange={(e) => update(item.provider as PaymentProviderValue, { active: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                Ativo
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-600">API Key</label>
                <input
                  type="password"
                  value={item.apiKey}
                  onChange={(e) =>
                    update(item.provider as PaymentProviderValue, { apiKey: e.target.value })
                  }
                  placeholder={
                    item.apiKeyConfigured ? '•••••••• (deixe vazio para manter)' : 'Cole a API key'
                  }
                  className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-mono text-sm shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Token do webhook</label>
                <input
                  type="password"
                  value={item.webhookToken}
                  onChange={(e) =>
                    update(item.provider as PaymentProviderValue, { webhookToken: e.target.value })
                  }
                  placeholder={
                    item.webhookTokenConfigured
                      ? '•••••••• (deixe vazio para manter)'
                      : 'Opcional'
                  }
                  className="mt-1 block w-full rounded-md border border-slate-300 p-2 font-mono text-sm shadow-sm"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
