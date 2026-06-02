import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantBillingApi } from '../../billing/api/billing.api';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { LoadingSpinner } from '../../../shared/ui/layout/LoadingSpinner';
import { WhatsAppProviderFields } from '../components/PaymentProviderFields';
import {
  PaymentCredentialsSection,
  buildCredentialFormState,
  type PaymentCredentialFormState,
} from '../components/PaymentCredentialsSection';
import {
  PaymentRoutingSection,
  buildRoutingFormState,
  routingFormToPayload,
  type PaymentRoutingFormRule,
} from '../components/PaymentRoutingSection';
import { showToast } from '../../../shared/utils/toast';

function formatBrl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const TenantSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantBillingApi.getSettings,
  });

  const [credentials, setCredentials] = React.useState<PaymentCredentialFormState[]>([]);
  const [routingRules, setRoutingRules] = React.useState<PaymentRoutingFormRule[]>([]);
  const [whatsappProvider, setWhatsappProvider] = React.useState('evolution');
  const [whatsappInstanceUrl, setWhatsappInstanceUrl] = React.useState('');
  const [whatsappApiKey, setWhatsappApiKey] = React.useState('');

  React.useEffect(() => {
    if (!data) return;
    setCredentials(buildCredentialFormState(data.paymentCredentials));
    setRoutingRules(buildRoutingFormState(data.paymentRouting));
    setWhatsappProvider(data.whatsapp.provider);
    setWhatsappInstanceUrl(data.whatsapp.instanceUrl ?? '');
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await tenantBillingApi.updatePaymentCredentials({
        credentials: credentials.map((item) => ({
          provider: item.provider,
          active: item.active,
          ...(item.apiKey ? { apiKey: item.apiKey } : {}),
          ...(item.webhookToken ? { webhookToken: item.webhookToken } : {}),
        })),
      });

      await tenantBillingApi.updatePaymentRouting(routingFormToPayload(routingRules));

      await tenantBillingApi.updateSettings({
        whatsappProvider,
        whatsappInstanceUrl,
        whatsappApiKey: whatsappApiKey || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      setWhatsappApiKey('');
      showToast.success('Configurações salvas');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao salvar');
    },
  });

  if (isLoading) {
    return (
      <div className="relative h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const sub = data?.subscription;

  return (
    <PageLayout
      title="Configurações"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl space-y-8">
        <section className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-5">
          <h2 className="text-base font-semibold text-slate-900">Minha assinatura (Cliente Manager)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Valor definido pela plataforma — não editável aqui.
          </p>
          {sub ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Plano</dt>
                <dd className="font-medium text-slate-900">{sub.planName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Valor mensal</dt>
                <dd className="font-medium text-slate-900">{formatBrl(sub.priceCents)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Vencimento</dt>
                <dd className="font-medium text-slate-900">Dia {sub.dueDay}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="font-medium text-slate-900">{sub.status}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-amber-700">Nenhuma assinatura SaaS vinculada.</p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            O preço que você cobra dos seus clientes IPTV é configurado em <strong>Planos</strong>.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Meios de pagamento (PIX)</h2>
          <p className="mt-1 text-sm text-slate-500">
            Passo 1: cadastre e ative os meios que você tem conta (API key de cada um). Só meios
            ativos podem ser usados nas regras abaixo.
          </p>
          <div className="mt-4">
            <PaymentCredentialsSection credentials={credentials} onChange={setCredentials} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Escolha automática por valor</h2>
          <p className="mt-1 text-sm text-slate-500">
            Passo 2: defina a partir de qual valor cada meio é usado. O sistema aplica isso ao gerar
            o PIX de cada fatura dos seus clientes.
          </p>
          <div className="mt-4">
            <PaymentRoutingSection rules={routingRules} onChange={setRoutingRules} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">WhatsApp</h2>
          <div className="mt-4">
            <WhatsAppProviderFields
              whatsappProvider={whatsappProvider}
              whatsappInstanceUrl={whatsappInstanceUrl}
              whatsappApiKey={whatsappApiKey}
              onProviderChange={setWhatsappProvider}
              onInstanceUrlChange={setWhatsappInstanceUrl}
              onApiKeyChange={setWhatsappApiKey}
              apiKeyConfigured={data?.whatsapp.apiKeyConfigured}
            />
          </div>
        </section>
      </div>
    </PageLayout>
  );
};
