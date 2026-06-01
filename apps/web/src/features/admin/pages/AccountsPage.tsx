import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '../api/admin.api';
import { Users, Key, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { PageHeaderActions } from '../../../shared/ui/layout/PageHeaderActions';
import { ResponsiveDataGrid } from '../../../shared/ui/layout/ResponsiveDataGrid';
import { ListPagination } from '../../../shared/ui/lists/ListPagination';
import { usePaginatedList } from '../../../shared/hooks/usePaginatedList';
import { ResetPasswordModal } from './ResetPasswordModal';
import { showToast } from '../../../shared/utils/toast';
import type { AccountListItem } from '@client-manager/shared';

export const AccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [resetUser, setResetUser] = React.useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

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
  } = usePaginatedList<AccountListItem>({
    queryKey: ['accounts'],
    queryFn: tenantsApi.list,
  });

  const toggleMutation = useMutation({
    mutationFn: (args: { id: string; status: 'active' | 'suspended' }) =>
      tenantsApi.toggleStatus(args.id, args.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      showToast.success('Status atualizado');
    },
  });

  const openResetPassword = (account: AccountListItem) => {
    const owner = account.users[0];
    if (!owner?.email) {
      showToast.error('Conta sem usuário proprietário para resetar senha');
      return;
    }
    setResetUser({ id: owner.id, name: owner.name, email: owner.email });
  };

  const columns = [
    { header: 'Nome', accessor: (a: AccountListItem) => a.name, width: '35%' },
    {
      header: 'Status',
      width: '20%',
      align: 'center' as const,
      accessor: (a: AccountListItem) => (
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {a.status === 'active' ? 'Ativa' : 'Suspensa'}
        </span>
      ),
    },
    {
      header: 'Ações',
      width: '200px',
      align: 'right' as const,
      accessor: (a: AccountListItem) => (
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() =>
              toggleMutation.mutate({
                id: a.id,
                status: a.status === 'active' ? 'suspended' : 'active',
              })
            }
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600"
          >
            {a.status === 'active' ? 'Suspender' : 'Reativar'}
          </button>
          <button
            type="button"
            onClick={() => openResetPassword(a)}
            className="p-2 text-slate-500 hover:text-indigo-600"
            aria-label="Resetar senha"
          >
            <Key className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/accounts/${a.id}/edit`)}
            className="p-2 text-slate-500 hover:text-indigo-600"
            aria-label="Editar conta"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (a: AccountListItem) => (
    <div className="group flex h-14 items-center justify-between">
      <div className="flex flex-1 items-center space-x-3 overflow-hidden">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
          <Users className="h-5 w-5 text-slate-400" />
        </div>
        <div className="overflow-hidden">
          <div className="truncate text-sm font-bold leading-tight text-slate-900">{a.name}</div>
          <div className="truncate text-[10px] leading-tight text-slate-400">
            {a.users?.length || 0} usuários
          </div>
        </div>
      </div>

      <div className="flex w-[55%] shrink-0 items-center gap-2">
        <div className="min-w-0 flex-1 text-center">
          <span
            className={`rounded-full border border-current px-2 py-0.5 text-[9px] font-black uppercase tracking-wider opacity-80 ${
              a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {a.status === 'active' ? 'Ativa' : 'Suspensa'}
          </span>
        </div>

        <div className="flex w-10 shrink-0 items-center justify-end">
          <button
            type="button"
            onClick={() => openResetPassword(a)}
            className="p-2 text-slate-400 hover:text-indigo-600"
            aria-label="Resetar senha"
          >
            <Key className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/accounts/${a.id}/edit`)}
            className="p-2 text-slate-400 hover:text-indigo-600"
            aria-label="Editar conta"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Contas"
      noPadding={true}
      actions={
        <PageHeaderActions
          onSearch={setFilter}
          currentFilter={filter}
          primaryAction={{
            label: 'Nova',
            onClick: () => navigate('/admin/accounts/new'),
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
        mobileHeaderTitles={['Nome', 'Status']}
        isLoading={isLoading}
      />

      <ResetPasswordModal
        userId={resetUser?.id || null}
        userName={resetUser?.name || null}
        userEmail={resetUser?.email || null}
        onClose={() => setResetUser(null)}
        onSuccess={() => {}}
      />
    </PageLayout>
  );
};
