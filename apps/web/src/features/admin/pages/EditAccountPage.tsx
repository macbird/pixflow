import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tenantsApi } from '../api/admin.api';
import { FormLayout } from '../../../shared/ui/forms/FormLayout';
import { useCrud } from '../../../shared/hooks/useCrud';
import { useForm } from 'react-hook-form';

export const EditAccountPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: tenantsApi.list,
  });

  const account = accounts?.find((a: any) => a.id === id);

  React.useEffect(() => {
    if (account) {
      reset(account);
    }
  }, [account, reset]);

  const { update } = useCrud<any, any>({
    queryKey: ['accounts'],
    updateFn: (id, data) => tenantsApi.toggleStatus(id, data.status),
    listPath: '/admin/accounts',
    entityName: 'Conta',
  });

  const onSubmit = async (data: any) => {
    await update(id!, data);
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <FormLayout title="Editar Conta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Nome</label>
          <input
            {...register('name')}
            disabled
            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2 bg-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select
            {...register('status')}
            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
          >
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/admin/accounts')}
            className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Salvar
          </button>
        </div>
      </form>
    </FormLayout>
  );
};
