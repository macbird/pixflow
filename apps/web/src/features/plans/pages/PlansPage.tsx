import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '../api/plans.api';
import { Edit2, Trash2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/ui/modals/Modal';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { ResponsiveDataGrid } from '../../../shared/ui/layout/ResponsiveDataGrid';
import { PageHeaderActions } from '../../../shared/ui/layout/PageHeaderActions';
import { ListPagination } from '../../../shared/ui/lists/ListPagination';
import { usePaginatedList } from '../../../shared/hooks/usePaginatedList';

export const PlansPage: React.FC = () => {
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
  } = usePaginatedList({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: plansApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setDeleteId(null);
    },
  });

  const columns = [
    { header: 'Nome', accessor: (p: { name: string }) => p.name, width: '40%' },
    {
      header: 'Conexões',
      accessor: (p: { maxConnections: number }) => p.maxConnections,
      width: '15%',
      align: 'center' as const,
    },
    {
      header: 'Preço',
      accessor: (p: { price: string | number }) => `R$ ${Number(p.price).toFixed(2)}`,
      width: '20%',
    },
    {
      header: 'Ações',
      width: '120px',
      align: 'right' as const,
      accessor: (p: { id: string }) => (
        <div className="flex justify-end">
          <button
            onClick={() => navigate(`/plans/${p.id}/edit`)}
            className="text-slate-500 hover:text-indigo-600 p-2"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(p.id)}
            className="text-slate-500 hover:text-red-600 p-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (p: { id: string; name: string; maxConnections: number; price: string | number }) => (
    <div className="flex items-center justify-between group h-12">
      <div className="flex items-center space-x-3 overflow-hidden flex-1">
        <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
          <CreditCard className="w-5 h-5 text-slate-400" />
        </div>
        <div className="overflow-hidden">
          <div className="text-sm font-bold text-slate-900 truncate leading-tight">{p.name}</div>
          <div className="text-[10px] text-slate-400 truncate leading-tight">
            {p.maxConnections} conexões
          </div>
        </div>
      </div>

      <div className="flex items-center shrink-0 gap-2 w-[55%]">
        <div className="flex-1 text-center">
          <div className="text-sm font-medium text-slate-900">R$ {Number(p.price).toFixed(2)}</div>
        </div>

        <div className="w-10 shrink-0 flex items-center justify-end">
          <button
            onClick={() => navigate(`/plans/${p.id}/edit`)}
            className="p-2 text-slate-400 hover:text-indigo-600"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(p.id)}
            className="p-2 text-slate-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Planos"
      noPadding={true}
      actions={
        <PageHeaderActions
          onSearch={setFilter}
          currentFilter={filter}
          primaryAction={{
            label: 'Novo',
            onClick: () => navigate('/plans/new'),
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
        mobileHeaderTitles={['Nome', 'Preço']}
        isLoading={isLoading}
      />

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Plano"
        description="Tem certeza que deseja excluir este plano?"
      />
    </PageLayout>
  );
};
