import React from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantsApi } from '../api/admin.api';
import { PageLayout } from '../../../shared/ui/layout/PageLayout';
import { useCrud } from '../../../shared/hooks/useCrud';
import { AccountForm, type AccountCreateInput } from './AccountForm';

export const CreateAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const formRef = React.useRef<HTMLFormElement>(null);

  const { create, isCreating } = useCrud<unknown, AccountCreateInput>({
    queryKey: ['accounts'],
    createFn: tenantsApi.create,
    listPath: '/admin/accounts',
    entityName: 'Conta',
  });

  return (
    <PageLayout
      title="Nova Conta"
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
            disabled={isCreating}
            onClick={() => formRef.current?.requestSubmit()}
            className="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isCreating ? 'Criando...' : 'Criar'}
          </button>
        </div>
      }
    >
      <AccountForm
        ref={formRef}
        mode="create"
        onSubmit={async (data) => {
          await create(data);
        }}
      />
    </PageLayout>
  );
};
