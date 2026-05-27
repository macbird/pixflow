import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { serverSchema, ServerInput } from '@iptv-manager/shared';

interface ServerFormProps {
  onSubmit: (data: ServerInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ServerInput>;
}

export const ServerForm: React.FC<ServerFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ServerInput>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      status: 'active',
      ...initialData,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome</label>
        <input
          {...register('name')}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">URL do Painel</label>
        <input
          type="url"
          {...register('panelUrl')}
          placeholder="https://exemplo.com"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
        {errors.panelUrl && <p className="text-red-500 text-xs mt-1">{errors.panelUrl.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notas/Credenciais</label>
        <textarea
          {...register('panelNotes')}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Conexões Máx.</label>
          <input
            type="number"
            {...register('maxConnections', { valueAsNumber: true })}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            {...register('status')}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="active">Ativo</option>
            <option value="maintenance">Manutenção</option>
            <option value="full">Lotado</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
};
