import React from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { PatternFormat } from 'react-number-format';
import { useQuery } from '@tanstack/react-query';
import { plansApi } from '../../plans/api/plans.api';
import { serversApi } from '../../servers/api/servers.api';
import { Trash2, Plus } from 'lucide-react';
import { TagInputChips } from '../../../shared/ui/forms/TagInputChips';
import { CUSTOMER_STATUS_LABELS, CUSTOMER_STATUS_VALUES } from '@client-manager/shared';

interface CustomerFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<any>;
}

export const CustomerForm = React.forwardRef<HTMLFormElement, CustomerFormProps>(
  ({ onSubmit, onCancel, initialData }, ref) => {
    const {
      register,
      handleSubmit,
      reset,
      control,
      formState: { errors },
    } = useForm<any>({
      defaultValues: {
        status: 'active',
        connections: [],
        name: '',
        email: '',
        phone: '',
        planId: '',
        notes: '',
        expiresAt: undefined,
        tags: [],
      },
    });

    const { fields, append, remove } = useFieldArray({
      control,
      name: 'connections',
    });

    const { data: plans } = useQuery({
      queryKey: ['plans'],
      queryFn: () => plansApi.list({ page: 1, pageSize: 100, filter: '' }),
    });

    const { data: servers } = useQuery({
      queryKey: ['servers'],
      queryFn: () => serversApi.list({ page: 1, pageSize: 100, filter: '' }),
    });

    React.useEffect(() => {
      if (initialData) {
        reset({
          ...initialData,
          planId: initialData.plan?.id || '',
          connections:
            initialData.connections?.map((c: any) => ({
              ...c,
              serverId: c.server?.id || c.serverId,
            })) || [],
          email: initialData.email || '',
          notes: initialData.notes || '',
          expiresAt: initialData.expiresAt
            ? new Date(initialData.expiresAt).toISOString().split('T')[0]
            : undefined,
          tags: initialData.tags || [],
        });
      }
    }, [initialData, reset]);

    const onSubmitHandler = handleSubmit(async (data) => {
      await onSubmit({
        ...data,
        email: data.email || '',
        notes: data.notes || '',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        tagIds: (data.tags ?? []).map((t: { id: string }) => t.id),
      });
    });

    return (
      <form ref={ref} onSubmit={onSubmitHandler} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nome</label>
            <input
              {...register('name', { required: true })}
              className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">E-mail</label>
            <input
              type="email"
              {...register('email')}
              className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Telefone</label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PatternFormat
                  {...field}
                  format="(##) #####-####"
                  mask="_"
                  className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Plano</label>
            <select
              {...register('planId')}
              className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
            >
              <option value="">Selecione um plano</option>
              {plans?.data?.map((plan: { id: string; name: string }) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Status</label>
            <select
              {...register('status')}
              className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
            >
              {CUSTOMER_STATUS_VALUES.map((value) => (
                <option key={value} value={value}>
                  {CUSTOMER_STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-slate-900">Conexões</h3>
            <button
              type="button"
              onClick={() => append({ serverId: '', macAddress: '', applicationName: '' })}
              className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </button>
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center bg-slate-50 p-2 rounded"
              >
                <select
                  {...register(`connections.${index}.serverId`, { required: 'Servidor obrigatório' })}
                  className="w-full border border-slate-300 rounded-md shadow-sm p-2 text-sm"
                >
                  <option value="">Servidor</option>
                  {servers?.data?.map((server: { id: string; name: string }) => (
                    <option key={server.id} value={server.id}>
                      {server.name}
                    </option>
                  ))}
                </select>
                <input
                  {...register(`connections.${index}.label`)}
                  placeholder="Rótulo (ex: Backup)"
                  className="w-full border border-slate-300 rounded-md shadow-sm p-2 text-sm"
                />
                <input
                  {...register(`connections.${index}.macAddress`, { required: 'MAC obrigatório' })}
                  placeholder="MAC (00:00:00:00:00:00)"
                  className="w-full border border-slate-300 rounded-md shadow-sm p-2 text-sm"
                />
                <div className="w-full">
                  <input
                    {...register(`connections.${index}.applicationName`, {
                      required: 'App obrigatório',
                    })}
                    placeholder="Aplicativo"
                    className="w-full border border-slate-300 rounded-md shadow-sm p-2 text-sm"
                  />
                  {errors.connections?.[index]?.applicationName && (
                    <span className="text-red-500 text-[10px]">App obrigatório</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Data de Vencimento</label>
          <input
            type="date"
            {...register('expiresAt', { setValueAs: (v) => (v ? new Date(v) : undefined) })}
            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Observações</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm p-2"
          />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <TagInputChips
                scope="customer"
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </form>
    );
  },
);

CustomerForm.displayName = 'CustomerForm';
