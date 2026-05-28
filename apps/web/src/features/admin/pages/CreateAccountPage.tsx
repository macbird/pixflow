import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { tenantsApi } from '../api/admin.api';
import { FormLayout } from '../../../shared/ui/forms/FormLayout';
import { useCrud } from '../../../shared/hooks/useCrud';

export const CreateAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  
  const { create } = useCrud<any, any>({
    queryKey: ['accounts'],
    createFn: tenantsApi.create,
    listPath: '/admin/accounts',
    entityName: 'Conta',
  });

  const onSubmit = async (data: any) => {
    await create(data);
  };

  return (
    <FormLayout title="Nova Conta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Nome</label>
          <input
            {...register('name')}
            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Slug</label>
          <input
            {...register('slug')}
            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
          />
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
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </FormLayout>
  );
};
