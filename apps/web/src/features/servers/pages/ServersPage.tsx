import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serversApi } from '../api/servers.api';
import { Edit2, Trash2, Server, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/ui/modals/Modal';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { ResponsiveDataGrid } from '../../../shared/ui/layout/ResponsiveDataGrid';
import { PageHeaderActions } from '../../../shared/ui/layout/PageHeaderActions';
import { ListPagination } from '../../../shared/ui/lists/ListPagination';
import { usePaginatedList } from '../../../shared/hooks/usePaginatedList';

export const ServersPage: React.FC = () => {
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
    queryKey: ['servers'],
    queryFn: serversApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: serversApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setDeleteId(null);
    },
  });

  const columns = [
    { header: 'Nome', accessor: (s: { name: string }) => s.name, width: '25%' },
    {
      header: 'Painel',
      width: '55%',
      accessor: (s: { panelUrl: string }) => (
        <a
          href={s.panelUrl}
          target="_blank"
          rel="noreferrer"
          className="text-indigo-600 hover:text-indigo-800 flex items-center"
        >
          {s.panelUrl} <ExternalLink className="ml-1 w-3 h-3" />
        </a>
      ),
    },
    {
      header: 'Ações',
      width: '120px',
      align: 'right' as const,
      accessor: (s: { id: string }) => (
        <div className="flex justify-end">
          <button
            onClick={() => navigate(`/servers/${s.id}/edit`)}
            className="text-slate-500 hover:text-indigo-600 p-2"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(s.id)}
            className="text-slate-500 hover:text-red-600 p-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (s: {
    id: string;
    name: string;
    panelUrl: string;
    maxConnections?: number | null;
  }) => (
    <div className="flex items-center justify-between group h-12">
      <div className="flex items-center space-x-3 overflow-hidden flex-1">
        <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
          <Server className="w-5 h-5 text-slate-400" />
        </div>
        <div className="overflow-hidden">
          <div className="text-sm font-bold text-slate-900 truncate leading-tight">{s.name}</div>
          <div className="text-[10px] text-slate-400 truncate leading-tight">{s.panelUrl}</div>
        </div>
      </div>

      <div className="flex items-center shrink-0 gap-2 w-[55%]">
        <div className="flex-1 text-center min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">
            {s.maxConnections ?? 0}
          </div>
        </div>

        <div className="w-10 shrink-0 flex items-center justify-end">
          <button
            onClick={() => navigate(`/servers/${s.id}/edit`)}
            className="p-2 text-slate-400 hover:text-indigo-600"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteId(s.id)}
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
      title="Servidores"
      noPadding={true}
      actions={
        <PageHeaderActions
          onSearch={setFilter}
          currentFilter={filter}
          primaryAction={{
            label: 'Novo',
            onClick: () => navigate('/servers/new'),
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
        mobileHeaderTitles={['Nome', 'Conex.']}
        isLoading={isLoading}
      />

      <Modal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Excluir Servidor"
        description="Tem certeza que deseja excluir este servidor? Esta ação não poderá ser desfeita."
      />
    </PageLayout>
  );
};
