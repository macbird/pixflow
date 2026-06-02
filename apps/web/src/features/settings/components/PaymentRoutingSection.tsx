import React from 'react';
import {
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_PROVIDER_VALUES,
  resolvePaymentProvider,
  type PaymentProviderValue,
  type TenantPaymentRoutingRuleDto,
} from '@client-manager/shared';

export type PaymentRoutingFormRule = {
  id: string;
  minAmountReais: string;
  provider: PaymentProviderValue;
  active: boolean;
};

function centsToReaisInput(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function reaisInputToCents(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  const parsed = parseFloat(normalized);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function formatReais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function buildRoutingFormState(
  fromApi: TenantPaymentRoutingRuleDto[] | undefined,
): PaymentRoutingFormRule[] {
  if (!fromApi?.length) {
    return [
      { id: 'new-1', minAmountReais: '150,00', provider: 'asaas', active: true },
      { id: 'new-2', minAmountReais: '0,00', provider: 'mercadopago', active: true },
    ];
  }

  return fromApi.map((rule) => ({
    id: rule.id,
    minAmountReais: centsToReaisInput(rule.minAmountCents),
    provider: rule.provider as PaymentProviderValue,
    active: rule.active,
  }));
}

export function routingFormToPayload(rules: PaymentRoutingFormRule[]) {
  return {
    rules: rules.map((rule) => ({
      minAmountCents: reaisInputToCents(rule.minAmountReais),
      provider: rule.provider,
      active: rule.active,
    })),
  };
}

function ruleSummarySentence(rule: PaymentRoutingFormRule, index: number): string {
  const cents = reaisInputToCents(rule.minAmountReais);
  const provider = PAYMENT_PROVIDER_LABELS[rule.provider];
  if (!rule.active) {
    return `Regra ${index + 1} (desativada): ignorada`;
  }
  if (cents === 0) {
    return `Qualquer outro valor → ${provider}`;
  }
  return `Fatura de ${formatReais(cents)} ou mais → ${provider}`;
}

interface PaymentRoutingSectionProps {
  rules: PaymentRoutingFormRule[];
  onChange: (rules: PaymentRoutingFormRule[]) => void;
}

export const PaymentRoutingSection: React.FC<PaymentRoutingSectionProps> = ({
  rules,
  onChange,
}) => {
  const [previewAmount, setPreviewAmount] = React.useState('35,00');

  const routingInput = rules.map((rule) => ({
    minAmountCents: reaisInputToCents(rule.minAmountReais),
    provider: rule.provider,
    active: rule.active,
  }));

  const sortedForDisplay = [...rules]
    .map((rule, index) => ({ rule, index }))
    .sort(
      (a, b) =>
        reaisInputToCents(b.rule.minAmountReais) - reaisInputToCents(a.rule.minAmountReais),
    );

  const previewCents = reaisInputToCents(previewAmount);
  const previewProvider = resolvePaymentProvider(routingInput, previewCents || 1);

  const updateRule = (id: string, patch: Partial<PaymentRoutingFormRule>) => {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const addRule = () => {
    onChange([
      ...rules,
      {
        id: `new-${Date.now()}`,
        minAmountReais: '0,00',
        provider: 'mercadopago',
        active: true,
      },
    ]);
  };

  const removeRule = (id: string) => {
    if (rules.length <= 1) return;
    onChange(rules.filter((rule) => rule.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-950">
        <p className="font-semibold">Como funciona na prática</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-amber-900/90">
          <li>
            Você cadastra as <strong>credenciais</strong> de cada meio de pagamento (Asaas, Mercado
            Pago…) na seção acima.
          </li>
          <li>
            Aqui você define <strong>qual meio usar conforme o valor da fatura</strong> — não por
            cliente nem por plano.
          </li>
          <li>
            Ao <strong>gerar o PIX</strong> de uma fatura, o sistema olha o valor total e escolhe o
            meio automaticamente.
          </li>
        </ol>
        <p className="mt-3 rounded-md bg-white/60 px-3 py-2 text-xs text-amber-900">
          <strong>Exemplo:</strong> mensalidade de R$ 35 → costuma ir para Mercado Pago (%). Plano
          anual de R$ 420 → costuma ir para Asaas (taxa fixa ~R$ 1,99). Você ajusta o corte abaixo.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-800">Resumo das suas regras</p>
        <ul className="mt-2 space-y-1.5">
          {sortedForDisplay.map(({ rule, index }) => (
            <li
              key={rule.id}
              className={`flex items-start gap-2 text-sm ${rule.active ? 'text-slate-700' : 'text-slate-400 line-through'}`}
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                {index + 1}
              </span>
              {ruleSummarySentence(rule, index)}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-800">Editar regras</p>
        <p className="mt-1 text-xs text-slate-500">
          O sistema compara o valor da fatura com cada limiar e usa o <strong>maior limiar que a
          fatura atinge</strong>. Mantenha sempre uma regra em R$ 0,00 como “resto”.
        </p>
      </div>

      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div
            key={rule.id}
            className={`rounded-lg border p-4 ${
              rule.active ? 'border-slate-200 bg-slate-50/50' : 'border-slate-100 bg-slate-50 opacity-60'
            }`}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Regra {index + 1}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[140px] flex-1">
                <label className="block text-xs font-medium text-slate-600">
                  Se a fatura for de pelo menos
                </label>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-sm text-slate-500">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rule.minAmountReais}
                    onChange={(e) => updateRule(rule.id, { minAmountReais: e.target.value })}
                    className="block w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="min-w-[160px] flex-1">
                <label className="block text-xs font-medium text-slate-600">usar este meio</label>
                <select
                  value={rule.provider}
                  onChange={(e) =>
                    updateRule(rule.id, { provider: e.target.value as PaymentProviderValue })
                  }
                  className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm"
                >
                  {PAYMENT_PROVIDER_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {PAYMENT_PROVIDER_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={rule.active}
                  onChange={(e) => updateRule(rule.id, { active: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600"
                />
                Ativa
              </label>
              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                disabled={rules.length <= 1}
                className="pb-2 text-sm text-red-600 hover:text-red-700 disabled:opacity-40"
              >
                Remover
              </button>
            </div>
            <p className="mt-2 text-xs text-indigo-700/80">
              {rule.active ? ruleSummarySentence(rule, index) : 'Esta regra está desativada.'}
            </p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRule}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        + Adicionar outro limiar
      </button>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-700">
          <span className="font-medium">Conferir um valor?</span> Digite abaixo quanto seria uma fatura
          (ex.: 35 ou 420). Mostramos qual meio <strong>seria</strong> usado — isso{' '}
          <strong>não gera PIX</strong> e <strong>não salva</strong> nada; só ajuda a validar as regras
          antes de clicar em <strong>Salvar</strong> no fim da página.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { label: 'Mensal ~R$ 35', cents: 3500 },
            { label: 'Anual ~R$ 420', cents: 42000 },
          ].map((preset) => (
            <button
              key={preset.cents}
              type="button"
              onClick={() => setPreviewAmount(centsToReaisInput(preset.cents))}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">
            Se a fatura fosse de{' '}
            <span className="inline-flex items-center gap-1">
              <span className="text-slate-500">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={previewAmount}
                onChange={(e) => setPreviewAmount(e.target.value)}
                className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              />
            </span>
          </label>
          <span className="text-sm text-slate-700">
            → o PIX iria para{' '}
            <strong className="text-indigo-700">{PAYMENT_PROVIDER_LABELS[previewProvider]}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
