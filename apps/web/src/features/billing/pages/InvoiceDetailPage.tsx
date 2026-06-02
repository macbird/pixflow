import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, RotateCcw, XCircle } from 'lucide-react';
import { platformBillingApi, tenantBillingApi } from '../api/billing.api';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { LoadingSpinner } from '../../../shared/ui/layout/LoadingSpinner';
import { Modal } from '../../../shared/ui/modals/Modal';
import { DetailGrid, DetailItem, DetailSection } from '../components/BillingDetailFields';
import { formatCents, formatPaymentMethod } from '../../../shared/ui/billing/format-billing';
import {
  BILLING_INVOICE_STATUS_LABELS,
  PAYMENT_PROVIDER_LABELS,
  getBillingInvoiceStatusBadgeClass,
  type BillingInvoiceStatusValue,
  type PaymentProviderValue,
} from '@client-manager/shared';
import { showToast } from '../../../shared/utils/toast';

interface InvoiceDetailPageProps {
  variant: 'admin' | 'tenant';
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

export const InvoiceDetailPage: React.FC<InvoiceDetailPageProps> = ({ variant }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const api = variant === 'admin' ? platformBillingApi : tenantBillingApi;
  const basePath = variant === 'admin' ? '/admin' : '';
  const invoiceQueryKey = variant === 'admin' ? ['admin-invoice', id] : ['invoice', id];
  const listQueryKey = variant === 'admin' ? ['admin-invoices'] : ['invoices'];

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [recreateOpen, setRecreateOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [amountReais, setAmountReais] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: invoiceQueryKey,
    queryFn: () => api.getInvoice(id!),
    enabled: Boolean(id),
  });

  React.useEffect(() => {
    if (!invoice || !recreateOpen) return;
    setAmountReais((invoice.amountCents / 100).toFixed(2));
    setDueDate(toDateInputValue(invoice.dueDate));
  }, [invoice, recreateOpen]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: invoiceQueryKey });
    queryClient.invalidateQueries({ queryKey: listQueryKey });
  };

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelInvoice(id!, cancelReason.trim() || undefined),
    onSuccess: (data) => {
      invalidate();
      queryClient.setQueryData(invoiceQueryKey, data);
      setCancelOpen(false);
      setCancelReason('');
      showToast.success('Fatura cancelada');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast.error(err.response?.data?.message ?? 'Não foi possível cancelar');
    },
  });

  const recreateMutation = useMutation({
    mutationFn: () => {
      const parsed = Number.parseFloat(amountReais.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('INVALID_AMOUNT');
      }
      return api.recreateInvoice(id!, {
        amountCents: Math.round(parsed * 100),
        dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
      });
    },
    onSuccess: (data) => {
      invalidate();
      setRecreateOpen(false);
      showToast.success('Fatura substituta criada');
      navigate(`${basePath}/invoices/${data.id}`);
    },
    onError: (err: unknown) => {
      if (err instanceof Error && err.message === 'INVALID_AMOUNT') {
        showToast.error('Informe um valor válido');
        return;
      }
      const apiErr = err as { response?: { data?: { message?: string } } };
      showToast.error(apiErr.response?.data?.message ?? 'Não foi possível recriar');
    },
  });

  const copyPix = () => {
    if (!invoice?.pixCopyPaste) {
      showToast.error('PIX não disponível para esta fatura');
      return;
    }
    navigator.clipboard.writeText(invoice.pixCopyPaste);
    showToast.success('PIX copiado!');
  };

  if (isLoading) {
    return (
      <PageLayout title="Fatura">
        <div className="relative h-64">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (isError || !invoice) {
    return (
      <PageLayout title="Fatura">
        <p className="text-sm text-slate-600">Fatura não encontrada.</p>
        <button
          type="button"
          onClick={() => navigate(`${basePath}/invoices`)}
          className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          Voltar para faturas
        </button>
      </PageLayout>
    );
  }

  const statusLabel =
    BILLING_INVOICE_STATUS_LABELS[invoice.status as BillingInvoiceStatusValue] ?? invoice.status;
  const isCanceled = invoice.status === 'canceled';

  return (
    <PageLayout
      title={variant === 'admin' ? 'Fatura SaaS' : 'Fatura'}
      footer={
        <div className="flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(`${basePath}/invoices`)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div className="flex flex-wrap gap-2">
            {invoice.canCancel ? (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Cancelar fatura
              </button>
            ) : null}
            {invoice.canRecreate ? (
              <button
                type="button"
                onClick={() => setRecreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <RotateCcw className="h-4 w-4" />
                Emitir substituta
              </button>
            ) : null}
            {!isCanceled && invoice.pixCopyPaste ? (
              <button
                type="button"
                onClick={copyPix}
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Copy className="h-4 w-4" />
                Copiar PIX
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getBillingInvoiceStatusBadgeClass(invoice.status as BillingInvoiceStatusValue)}`}
          >
            {statusLabel}
          </span>
          <span className="text-sm text-slate-500">Ciclo {invoice.billingCycleKey}</span>
        </div>

        {invoice.replacesInvoice ? (
          <p className="text-sm text-slate-600">
            Substitui a fatura{' '}
            <Link
              to={`${basePath}/invoices/${invoice.replacesInvoice.id}`}
              className="font-medium text-indigo-600 hover:text-indigo-800"
            >
              cancelada
            </Link>
            .
          </p>
        ) : null}

        {invoice.replacement ? (
          <p className="rounded-md border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
            Substituída por{' '}
            <Link
              to={`${basePath}/invoices/${invoice.replacement.id}`}
              className="font-semibold underline"
            >
              nova fatura ({formatCents(invoice.replacement.amountCents ?? 0)})
            </Link>
            .
          </p>
        ) : null}

        {invoice.canceledAt ? (
          <p className="text-sm text-slate-500">
            Cancelada em {new Date(invoice.canceledAt).toLocaleString('pt-BR')}
            {invoice.cancelReason ? ` — ${invoice.cancelReason}` : ''}
          </p>
        ) : null}

        <DetailSection title="Resumo">
          <DetailGrid>
            <DetailItem label="Valor" value={formatCents(invoice.amountCents)} />
            <DetailItem
              label="Vencimento"
              value={new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
            />
            {variant === 'admin' && invoice.account ? (
              <DetailItem label="Conta" value={invoice.account.name} />
            ) : null}
            {variant === 'tenant' && invoice.customer ? (
              <DetailItem label="Cliente" value={invoice.customer.name} />
            ) : null}
            {invoice.paidAt ? (
              <DetailItem
                label="Pago em"
                value={new Date(invoice.paidAt).toLocaleString('pt-BR')}
              />
            ) : null}
            {invoice.paymentProvider ? (
              <DetailItem
                label="Provider PIX"
                value={
                  PAYMENT_PROVIDER_LABELS[invoice.paymentProvider as PaymentProviderValue] ??
                  invoice.paymentProvider
                }
              />
            ) : null}
            <DetailItem label="ID da fatura" value={invoice.id} className="sm:col-span-2" />
            {invoice.providerChargeId ? (
              <DetailItem
                label="ID no provider"
                value={invoice.providerChargeId}
                className="sm:col-span-2"
              />
            ) : null}
          </DetailGrid>
        </DetailSection>

        {!isCanceled && invoice.pixCopyPaste ? (
          <DetailSection title="PIX copia e cola">
            <p className="break-all rounded-md bg-slate-50 p-3 font-mono text-xs text-slate-700">
              {invoice.pixCopyPaste}
            </p>
          </DetailSection>
        ) : null}

        <DetailSection title={`Pagamentos (${invoice.payments.length})`}>
          {invoice.payments.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum pagamento registrado para esta fatura.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoice.payments.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`${basePath}/payments/${p.id}`}
                    className="-mx-2 flex items-center justify-between rounded-md px-2 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {formatPaymentMethod(p.method)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(p.paidAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-700">
                      {formatCents(p.amountCents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection title="Auditoria">
          <DetailGrid>
            <DetailItem
              label="Criada em"
              value={new Date(invoice.createdAt).toLocaleString('pt-BR')}
            />
            <DetailItem
              label="Atualizada em"
              value={new Date(invoice.updatedAt).toLocaleString('pt-BR')}
            />
          </DetailGrid>
        </DetailSection>
      </div>

      <Modal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar fatura?"
        description="A fatura não poderá receber pagamentos. Você poderá emitir uma substituta em seguida."
      >
        <label className="block">
          <span className="text-xs font-medium text-slate-500">Motivo (opcional)</span>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Ex.: valor incorreto"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setCancelOpen(false)}
            className="flex-1 rounded-md border border-slate-200 py-2.5 text-sm font-medium text-slate-700"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            className="flex-1 rounded-md bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar fatura'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={recreateOpen} onClose={() => setRecreateOpen(false)} title="Emitir fatura substituta">
        <p className="text-sm text-slate-600">
          Mesmo ciclo <strong>{invoice.billingCycleKey}</strong>. A fatura cancelada permanece no
          histórico.
        </p>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Valor (R$)</span>
            <input
              type="text"
              inputMode="decimal"
              value={amountReais}
              onChange={(e) => setAmountReais(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Vencimento</span>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={recreateMutation.isPending}
            onClick={() => recreateMutation.mutate()}
            className="w-full rounded-md bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {recreateMutation.isPending ? 'Criando...' : 'Criar fatura substituta'}
          </button>
        </div>
      </Modal>
    </PageLayout>
  );
};
