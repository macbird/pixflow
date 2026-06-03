import React from 'react';
import { useForm, Controller, useFieldArray, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PatternFormat } from 'react-number-format';
import { useQuery } from '@tanstack/react-query';
import {
  customerSchema,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUS_VALUES,
  type CustomerInput,
} from '@client-manager/shared';
import { plansApi } from '../../plans/api/plans.api';
import { serversApi } from '../../servers/api/servers.api';
import {
  Activity,
  AppWindow,
  Calendar,
  CreditCard,
  Link2,
  Mail,
  Network,
  Phone,
  Plus,
  Server,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import { TagInputChips } from '../../../shared/ui/forms/TagInputChips';
import { MacAddressInput } from '../../../shared/ui/forms/MacAddressInput';
import { FormField } from '../../../shared/ui/forms/FormField';
import { FormInput } from '../../../shared/ui/forms/FormInput';
import { FormSelect } from '../../../shared/ui/forms/FormSelect';
import { InlineFormSelect } from '../../../shared/ui/forms/InlineFormSelect';
import type { TagDto } from '../../tags/api/tags.api';
import { showToast } from '../../../shared/utils/toast';
import {
  formInputClass,
  formInputPaddingWithPrefix,
  formErrorClass,
  formGridClass,
  formRootClass,
  formSectionClass,
  formTextareaClass,
} from '../../../shared/ui/forms/form-styles';

const normalizeMacAddress = (value?: string) =>
  value ? value.replace(/-/g, ':').toUpperCase() : '';

/** HTML date input expects yyyy-MM-dd (local calendar date). */
function formatDateForInput(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateFromInput(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

const customerFormSchema = customerSchema
  .omit({ expiresAt: true })
  .extend({
    tags: z.array(z.custom<TagDto>()).default([]),
    expiresAt: z.string().optional(),
  });

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export type CustomerFormPayload = CustomerInput & { tagIds?: string[] };

type CustomerDetail = Partial<CustomerFormValues & { tags?: TagDto[]; id?: string; plan?: { id: string } }>;

interface CustomerFormProps {
  formId: string;
  onSubmit: (data: CustomerFormPayload) => Promise<void>;
  onCancel: () => void;
  initialData?: CustomerDetail;
}

const emptyConnection = {
  serverId: '',
  macAddress: '',
  applicationName: '',
  label: '',
  m3u8Link: '',
};

const emptyFormValues: CustomerFormValues = {
  status: 'active',
  connections: [],
  name: '',
  email: '',
  phone: '',
  planId: undefined,
  notes: '',
  expiresAt: undefined,
  tags: [],
};

function sanitizeCustomerForForm(customer: CustomerDetail): CustomerFormValues {
  return {
    ...emptyFormValues,
    name: customer.name ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    status: customer.status ?? 'active',
    planId: customer.plan?.id ?? customer.planId ?? undefined,
    notes: customer.notes ?? '',
    expiresAt: formatDateForInput(customer.expiresAt as string | Date | null | undefined),
    tags: customer.tags ?? [],
    connections:
      customer.connections?.map((connection) => ({
        serverId: (connection as { server?: { id: string }; serverId?: string }).server?.id
          ?? (connection as { serverId?: string }).serverId
          ?? '',
        macAddress: normalizeMacAddress((connection as { macAddress?: string }).macAddress),
        applicationName: (connection as { applicationName?: string }).applicationName ?? '',
        label: (connection as { label?: string }).label ?? '',
        m3u8Link: (connection as { m3u8Link?: string }).m3u8Link ?? '',
      })) ?? [],
  };
}

function toPayload(data: CustomerFormValues): CustomerFormPayload {
  const { tags, connections, expiresAt, planId, ...customerData } = data;

  return {
    ...customerData,
    name: customerData.name.trim(),
    email: customerData.email?.trim() || '',
    notes: customerData.notes?.trim() || undefined,
    planId: planId || undefined,
    expiresAt: parseDateFromInput(expiresAt),
    tagIds: tags.map((tag) => tag.id),
    connections: connections.map((connection) => ({
      serverId: connection.serverId,
      macAddress: normalizeMacAddress(connection.macAddress),
      applicationName: connection.applicationName.trim(),
      label: connection.label?.trim() || undefined,
      m3u8Link: connection.m3u8Link?.trim() || undefined,
    })),
  };
}

export const CustomerForm = React.forwardRef<HTMLFormElement, CustomerFormProps>(
  ({ formId, onSubmit, onCancel, initialData }, ref) => {
    const formValues = React.useMemo(
      () => (initialData ? sanitizeCustomerForForm(initialData) : undefined),
      [initialData],
    );

    const {
      register,
      handleSubmit,
      control,
      formState: { errors },
    } = useForm<CustomerFormValues>({
      resolver: zodResolver(customerFormSchema),
      defaultValues: emptyFormValues,
      values: formValues,
    });

    const { fields, append, remove } = useFieldArray({
      control,
      name: 'connections',
    });

    const { data: plans } = useQuery({
      queryKey: ['plans'],
      queryFn: () =>
        plansApi.list({ page: 1, pageSize: 100, filter: '', selectableOnly: true }),
    });

    const { data: servers } = useQuery({
      queryKey: ['servers'],
      queryFn: () =>
        serversApi.list({ page: 1, pageSize: 100, filter: '', selectableOnly: true }),
    });

    const onSubmitWrapper = async (data: CustomerFormValues) => {
      await onSubmit(toPayload(data));
    };

    const onInvalid = (fieldErrors: FieldErrors<CustomerFormValues>) => {
      if (fieldErrors.connections?.message) {
        showToast.error(fieldErrors.connections.message.toString());
        return;
      }
      if (fieldErrors.connections && Array.isArray(fieldErrors.connections)) {
        const connectionError = fieldErrors.connections.find(Boolean);
        const nested = connectionError as Record<string, { message?: string }> | undefined;
        const firstNested = nested
          ? Object.values(nested).find((entry) => entry?.message)?.message
          : undefined;
        if (firstNested) {
          showToast.error(firstNested);
          return;
        }
      }
      const firstError = Object.values(fieldErrors)[0];
      showToast.error(
        firstError?.message?.toString() ?? 'Verifique os campos do formulário.',
      );
    };

    return (
      <form
        ref={ref}
        id={formId}
        noValidate
        onSubmit={handleSubmit(onSubmitWrapper, onInvalid)}
        className={`${formSectionClass} ${formRootClass}`}
      >
        <div className={formGridClass}>
          <FormInput
            label="Nome"
            prefixIcon={User}
            error={errors.name?.message}
            placeholder="Nome do cliente"
            {...register('name')}
          />
          <FormInput
            label="E-mail"
            type="email"
            prefixIcon={Mail}
            error={errors.email?.message}
            placeholder="email@exemplo.com"
            {...register('email')}
          />
        </div>

        <div className={formGridClass}>
          <FormField label="Telefone" prefixIcon={Phone} error={errors.phone?.message}>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PatternFormat
                  format="(##) #####-####"
                  mask="_"
                  value={field.value ?? ''}
                  onValueChange={(values) => field.onChange(values.formattedValue)}
                  onBlur={field.onBlur}
                  className={`${formInputClass} ${formInputPaddingWithPrefix}`}
                />
              )}
            />
          </FormField>

          <FormSelect label="Plano" prefixIcon={CreditCard} error={errors.planId?.message} {...register('planId')}>
            <option value="">Selecione um plano</option>
            {plans?.data?.map((plan: { id: string; name: string }) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </FormSelect>

          <FormSelect label="Status" prefixIcon={Activity} {...register('status')}>
            {CUSTOMER_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {CUSTOMER_STATUS_LABELS[value]}
              </option>
            ))}
          </FormSelect>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Conexões</h3>
            <button
              type="button"
              onClick={() => append(emptyConnection)}
              className="flex items-center text-sm font-semibold text-form-primary hover:opacity-80"
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </button>
          </div>
          {errors.connections && !Array.isArray(errors.connections) && (
            <p className="text-red-500 text-xs mb-2">{errors.connections.message}</p>
          )}
          {fields.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
              Nenhuma conexão adicionada. Clique em &quot;Adicionar&quot; para incluir ao menos uma.
            </p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-1 items-start gap-3 rounded-[10px] bg-form-field p-3 md:grid-cols-[1fr_1.25fr_1fr_1fr_auto]"
                >
                  <InlineFormSelect
                    prefixIcon={Server}
                    error={errors.connections?.[index]?.serverId?.message as string | undefined}
                    {...register(`connections.${index}.serverId`)}
                  >
                    <option value="">Servidor</option>
                    {servers?.data?.map((server: { id: string; name: string }) => (
                      <option key={server.id} value={server.id}>
                        {server.name}
                      </option>
                    ))}
                  </InlineFormSelect>
                  <div className="relative w-full">
                    <div className="flex flex-col gap-2">
                      <div className="relative">
                        <Tag className="pointer-events-none absolute left-3 top-1/2 z-10 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                        <input
                          {...register(`connections.${index}.label`)}
                          placeholder="Rótulo (ex: Backup)"
                          className={`${formInputClass} pl-10 text-sm`}
                        />
                      </div>
                      <div className="relative">
                        <Link2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                        <input
                          type="url"
                          {...register(`connections.${index}.m3u8Link`)}
                          placeholder="M3U8 Link"
                          className={`${formInputClass} pl-10 text-sm`}
                        />
                      </div>
                    </div>
                    {errors.connections?.[index]?.m3u8Link && (
                      <span className="text-red-500 text-[10px]">
                        {errors.connections[index]?.m3u8Link?.message as string}
                      </span>
                    )}
                  </div>
                  <Controller
                    name={`connections.${index}.macAddress`}
                    control={control}
                    render={({ field: macField }) => (
                      <div className="relative w-full">
                        <Network className="pointer-events-none absolute left-3 top-1/2 z-10 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                        <MacAddressInput
                          ref={macField.ref}
                          name={macField.name}
                          value={macField.value ?? ''}
                          onBlur={macField.onBlur}
                          onChange={macField.onChange}
                          placeholder="00:00:00:00:00:00"
                          className={`${formInputClass} pl-10 font-mono text-sm uppercase tracking-wide`}
                        />
                        {errors.connections?.[index]?.macAddress && (
                          <span className="text-red-500 text-[10px]">
                            {errors.connections[index]?.macAddress?.message as string}
                          </span>
                        )}
                      </div>
                    )}
                  />
                  <div className="relative w-full">
                    <AppWindow className="pointer-events-none absolute left-3 top-1/2 z-10 h-[16px] w-[16px] -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                    <input
                      {...register(`connections.${index}.applicationName`)}
                      placeholder="Aplicativo"
                      className={`${formInputClass} pl-10 text-sm`}
                    />
                    {errors.connections?.[index]?.applicationName && (
                      <span className="text-red-500 text-[10px]">
                        {errors.connections[index]?.applicationName?.message as string}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700 p-2 md:justify-self-center"
                    aria-label="Remover conexão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <FormInput label="Data de vencimento" type="date" prefixIcon={Calendar} {...register('expiresAt')} />

        <FormField label="Observações">
          <textarea {...register('notes')} rows={3} className={formTextareaClass} />
        </FormField>

        <div className="border-t border-slate-100 pt-4">
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <TagInputChips
                scope="customer"
                label="Tags"
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
