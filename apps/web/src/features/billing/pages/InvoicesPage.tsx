import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, CheckCircle, Loader2 } from 'lucide-react';
import { platformBillingApi, tenantBillingApi } from '../api/billing.api';
import { CreateInvoiceModal } from '../components/CreateInvoiceModal';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { PageHeaderActions } from '../../../shared/ui/layout/PageHeaderActions';
import { ListPagination } from '../../../shared/ui/lists/ListPagination';
import { ResponsiveDataGrid } from '../../../shared/ui/layout/ResponsiveDataGrid';
import { usePaginatedList } from '../../../shared/hooks/usePaginatedList';
import { useListFilterModal } from '../../../shared/hooks/useListFilterModal';
import { useOpenCreateModalFromRoute } from '../../../shared/hooks/useEntityFormModal';
import { ListFiltersModal } from '../../../shared/ui/lists/ListFiltersModal';
import { INVOICE_FILTER_FIELDS } from '../../../shared/ui/lists/list-filter-fields';
import {
  getBillingInvoiceStatusBadgeClass,
  BILLING_INVOICE_STATUS_LABELS,
  type BillingInvoiceStatusValue,
  type InvoiceListItem,
} from '@client-manager/shared';
import { showToast } from '../../../shared/utils/toast';

interface InvoicesPageProps {
  variant: 'admin' | 'tenant';
}

function formatBrl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ variant }) => {
  const navigate = useNavigate();
  const api = variant === 'admin' ? platformBillingApi : tenantBillingApi;
  const queryClient = useQueryClient();
  const title = variant === 'admin' ? 'Faturas SaaS' : 'Faturas';
  const basePath = variant === 'admin' ? '/admin' : '';

  const {
    items,
    total,
    totalPages,
    page,
    pageSize,
    filter,
    setFilter,
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    goToPreviousPage,
    goToNextPage,
    isLoading,
  } = usePaginatedList<InvoiceListItem>({
    queryKey: variant === 'admin' ? ['admin-invoices'] : ['invoices'],
    queryFn: api.listInvoices,
  });

  const [invoiceModalOpen, setInvoiceModalOpen] = React.useState(false);
  const filterModal = useListFilterModal(filters, setFilters, clearFilters);
  useOpenCreateModalFromRoute(setInvoiceModalOpen);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: variant === 'admin' ? ['admin-invoices'] : ['invoices'],
    });
    if (variant === 'tenant') {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['activations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  };

  const isActionable = (status: string) =>
    status !== 'paid' && status !== 'canceled';

  const pixMutation = useMutation({
    mutationFn: (id: string) => api.generatePix(id),
    onSuccess: () => {
      invalidate();
      showToast.success('PIX gerado com sucesso');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast.error(err.response?.data?.message ?? 'Erro ao gerar PIX');
    },
  });

  const paidMutation = useMutation({
    mutationFn: (id: string) => api.markPaid(id),
    onSuccess: () => {
      invalidate();
      showToast.success('Fatura marcada como paga');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      showToast.error(err.response?.data?.message ?? 'Erro ao baixar fatura');
    },
  });

  const copyPix = (pix: string | null) => {
    if (!pix) {
      showToast.error('Gere o PIX primeiro');
      return;
    }
    navigator.clipboard.writeText(pix);
    showToast.success('PIX copiado!');
  };

  const columns = [
    ...(variant === 'admin'
      ? [{ header: 'Conta', accessor: (i: InvoiceListItem) => i.account?.name ?? '-', width: '22%' }]
      : [
          {
            header: 'Cliente',
            accessor: (i: InvoiceListItem) => i.customer?.name ?? '-',
            width: '22%',
          },
        ]),
    { header: 'Ciclo', accessor: (i: InvoiceListItem) => i.billingCycleKey, width: '12%' },
    {
      header: 'Valor',
      accessor: (i: InvoiceListItem) => formatBrl(i.amountCents),
      width: '12%',
    },
    {
      header: 'Vencimento',
      accessor: (i: InvoiceListItem) => new Date(i.dueDate).toLocaleDateString('pt-BR'),
      width: '14%',
    },
    {
      header: 'Status',
      width: '12%',
      align: 'center' as const,
      accessor: (i: InvoiceListItem) => (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getBillingInvoiceStatusBadgeClass(i.status as BillingInvoiceStatusValue)}`}
        >
          {BILLING_INVOICE_STATUS_LABELS[i.status as BillingInvoiceStatusValue] ?? i.status}
        </span>
      ),
    },
    {
      header: 'Ações',
      width: '180px',
      align: 'right' as const,
      accessor: (i: InvoiceListItem) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Copiar PIX"
            onClick={() => copyPix(i.pixCopyPaste)}
            className="p-2 text-slate-400 hover:text-indigo-600"
          >
            <Copy className="h-4 w-4" />
          </button>
          {isActionable(i.status) && (
            <>
              <button
                type="button"
                onClick={() => pixMutation.mutate(i.id)}
                disabled={pixMutation.isPending}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline px-1 disabled:opacity-60"
              >
                {pixMutation.isPending && pixMutation.variables === i.id ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'PIX'
                )}
              </button>
              <button
                type="button"
                onClick={() => paidMutation.mutate(i.id)}
                className="p-2 text-slate-400 hover:text-green-600"
                title="Marcar paga"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const renderMobileCard = (i: InvoiceListItem) => (
    <div className="flex items-center justify-between py-1">
      <div className="min-w-0 flex-1 overflow-hidden pl-2">
        <div className="truncate text-sm font-bold text-slate-900">
          {variant === 'admin' ? i.account?.name : i.customer?.name}
        </div>
        <div className="truncate text-xs text-slate-500">
          {i.billingCycleKey} · {formatBrl(i.amountCents)}
        </div>
      </div>
      <div className="flex w-[55%] shrink-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 justify-center">
          <span
            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${getBillingInvoiceStatusBadgeClass(i.status as BillingInvoiceStatusValue)}`}
          >
            {BILLING_INVOICE_STATUS_LABELS[i.status as BillingInvoiceStatusValue] ?? i.status}
          </span>
        </div>
        <div
          className="flex w-16 shrink-0 items-center justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => copyPix(i.pixCopyPaste)}
            className="p-2 text-slate-400"
            aria-label="Copiar PIX"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      title={title}
      noPadding
      actions={
        <PageHeaderActions
          onSearch={setFilter}
          currentFilter={filter}
          onOpenFilters={filterModal.open}
          activeFilterCount={activeFilterCount}
          primaryAction={
            variant === 'tenant'
              ? {
                  label: 'Novo',
                  onClick: () => setInvoiceModalOpen(true),
                }
              : undefined
          }
        />
      }
      footer={
        <ListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPrevious={goToPreviousPage}
          onNext={goToNextPage}
        />
      }
    >
      <ResponsiveDataGrid
        data={items}
        columns={columns}
        renderMobileCard={renderMobileCard}
        mobileHeaderTitles={variant === 'admin' ? ['Conta', 'Status'] : ['Cliente', 'Status']}
        isLoading={isLoading}
        onRowClick={(i) => navigate(`${basePath}/invoices/${i.id}`)}
      />

      {variant === 'tenant' ? (
        <CreateInvoiceModal isOpen={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} />
      ) : null}

      <ListFiltersModal
        isOpen={filterModal.isOpen}
        onClose={() => filterModal.setIsOpen(false)}
        fields={INVOICE_FILTER_FIELDS}
        draft={filterModal.draft}
        onDraftChange={filterModal.setDraft}
        onApply={filterModal.apply}
        onClear={filterModal.clear}
      />
    </PageLayout>
  );
};
