import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tenantsApi } from '../api/admin.api';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { useCrud } from '../../../shared/hooks/useCrud';
import { LoadingSpinner } from '../../../shared/ui/layout/LoadingSpinner';
import { AccountForm, type AccountEditInput } from './AccountForm';

export const EditAccountPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const formRef = React.useRef<HTMLFormElement>(null);

  const { data: account, isLoading } = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => tenantsApi.getById(id!),
    enabled: Boolean(id),
  });

  const { update, isUpdating } = useCrud<unknown, AccountEditInput>({
    queryKey: ['accounts'],
    updateFn: (accountId, data) => tenantsApi.toggleStatus(accountId, data.status),
    listPath: '/admin/accounts',
    entityName: 'Conta',
  });

  if (isLoading) {
    return (
      <div className="relative h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!account) {
    return (
      <PageLayout title="Editar Conta">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">
          Conta não encontrada.
          <button
            type="button"
            onClick={() => navigate('/admin/accounts')}
            className="mt-4 block w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Voltar para contas
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Editar Conta"
      footer={
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/admin/accounts')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => formRef.current?.requestSubmit()}
            className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isUpdating ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      }
    >
      <AccountForm
        ref={formRef}
        mode="edit"
        initialData={account}
        onSubmit={async (data) => {
          await update(id!, data);
        }}
      />
    </PageLayout>
  );
};
