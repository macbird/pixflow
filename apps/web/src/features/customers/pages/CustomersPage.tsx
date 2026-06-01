import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../api/customers.api';
import { Edit2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/ui/modals/Modal';
import { ResponsiveDataGrid } from '../../../shared/ui/layout/ResponsiveDataGrid';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { PageHeaderActions } from '../../../shared/ui/layout/PageHeaderActions';
import { ListPagination } from '../../../shared/ui/lists/ListPagination';
import { usePaginatedList } from '../../../shared/hooks/usePaginatedList';
import {
  CustomerStatus,
  getCustomerStatusBadgeClass,
  getCustomerStatusLabel,
  type CustomerListItem,
} from '@client-manager/shared';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    items,
    total,
    totalPages,
    page,
    pageSize,
    filter,
    setFilter,
    goToPreviousPage,
    goToNextPage,
    isLoading,
  } = usePaginatedList<CustomerListItem>({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteId(null);
    },
  });

  const columns = [
    { header: 'Nome', accessor: (c: CustomerListItem) => c.name, width: '22%' },
    { header: 'Plano', accessor: (c: CustomerListItem) => c.plan?.name || '-', width: '16%' },
    {
      header: 'Conexões',
      accessor: (c: CustomerListItem) => c.connectionCount,
      width: '10%',
      align: 'center' as const,
    },
    { header: 'Telefone', accessor: (c: CustomerListItem) => c.phone || '-', width: '16%' },
    {
      header: 'Vencimento',
      accessor: (c: CustomerListItem) =>
        c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '-',
      width: '14%',
    },
    {
      header: 'Ações',
      width: '120px',
      align: 'right' as const,
      accessor: (c: CustomerListItem) => (
        <div className="flex justify-end">
          <button
            onClick={() => navigate(`/customers/${c.id}/edit`)}
            className="text-slate-500 hover:text-indigo-600 p-2"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(c.id)}
            className="text-slate-500 hover:text-red-600 p-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (c: CustomerListItem) => {
    const initials = c.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    return (
      <div className="flex items-center justify-between group py-1">
        <div className="flex items-center space-x-3 overflow-hidden flex-1">
          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500">{initials}</span>
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-slate-900 truncate leading-tight mb-0.5">
              {c.name}
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] text-slate-400 truncate leading-none mb-1">
                {c.phone || 'Sem telefone'}
              </div>
              <div className="text-[9px] font-medium text-indigo-500/70 uppercase tracking-tighter leading-none">
                {c.connectionCount} conexões
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center shrink-0 gap-2 w-[55%]">
          <div className="flex-1 text-center min-w-0">
            <div className="text-[10px] text-slate-400 truncate">{c.plan?.name || '-'}</div>
            <div
              className={`text-[11px] font-bold truncate ${
                c.status === CustomerStatus.OVERDUE ? 'text-red-500' : 'text-slate-900'
              }`}
            >
              {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '-'}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1 min-w-[4.5rem]">
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${getCustomerStatusBadgeClass(c.status)}`}
            >
              {getCustomerStatusLabel(c.status)}
            </span>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => navigate(`/customers/${c.id}/edit`)}
                className="p-2 text-slate-400 hover:text-indigo-600"
                aria-label="Editar cliente"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(c.id)}
                className="p-2 text-slate-400 hover:text-red-600"
                aria-label="Excluir cliente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageLayout
      title="Clientes"
      noPadding={true}
      actions={
        <PageHeaderActions
          onSearch={setFilter}
          currentFilter={filter}
          primaryAction={{
            label: 'Novo',
            onClick: () => navigate('/customers/new'),
          }}
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
        mobileHeaderTitles={['Nome', 'Plano', 'Venc']}
        isLoading={isLoading}
      />

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Cliente"
        description="Tem certeza que deseja excluir este cliente? Esta ação não poderá ser desfeita."
      />
    </PageLayout>
  );
};
