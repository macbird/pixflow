import React from 'react';
import { useForm } from 'react-hook-form';
import { PasswordInput } from '../../../shared/ui/forms/PasswordInput';
import { showToast } from '../../../shared/utils/toast';
import {
  formInputClass,
  formLabelClass,
  formSelectClass,
} from '../../../shared/ui/forms/form-styles';

export interface AccountCreateInput {
  name: string;
  slug?: string;
  ownerName: string;
  ownerEmail: string;
  initialPassword?: string;
  dueDate: string;
}

export interface AccountEditInput {
  status: 'active' | 'suspended';
  dueDate: string;
}

function suggestedDueDateValue(): string {
  const now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();
  if (now.getDate() > 10) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return `${year}-${String(month + 1).padStart(2, '0')}-10`;
}

function toDateInputValue(isoDate?: string | null): string {
  if (!isoDate) return suggestedDueDateValue();
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return suggestedDueDateValue();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

type AccountFormProps = {
  formId: string;
} & (
  | {
      mode: 'create';
      onSubmit: (data: AccountCreateInput) => Promise<void>;
      initialData?: never;
    }
  | {
      mode: 'edit';
      onSubmit: (data: AccountEditInput) => Promise<void>;
      initialData?: {
        id?: string;
        name?: string;
        slug?: string;
        status?: 'active' | 'suspended';
        subscription?: { nextDueDate?: string; platformPlan?: { name: string; priceCents: number } } | null;
        users?: Array<{ name?: string; email?: string; role?: string }>;
      };
    }
);

export const AccountForm: React.FC<AccountFormProps> = ({
  formId,
  mode,
  onSubmit,
  initialData,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      dueDate: suggestedDueDateValue(),
    },
  });

  React.useEffect(() => {
    if (mode === 'edit' && initialData) {
      reset({
        name: initialData.name ?? '',
        slug: initialData.slug ?? '',
        status: initialData.status ?? 'active',
        dueDate: toDateInputValue(initialData.subscription?.nextDueDate),
      });
    }
  }, [mode, initialData, reset]);

  const onInvalid = () => {
    showToast.error('Revise os campos destacados antes de continuar');
  };

  const onSubmitHandler = handleSubmit(async (data) => {
    if (mode === 'create') {
      await onSubmit({
        name: data.name,
        slug: data.slug || undefined,
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        initialPassword: data.initialPassword || undefined,
        dueDate: data.dueDate,
      });
      return;
    }
    await onSubmit({ status: data.status, dueDate: data.dueDate });
  }, onInvalid);

  const dueDateField = (
    <div>
      <label className="block">
        <span className={formLabelClass}>Próximo vencimento SaaS</span>
        <input
          type="date"
          {...register('dueDate', { required: 'Informe a data de vencimento' })}
          className={formInputClass}
        />
      </label>
      {errors.dueDate ? (
        <p className="mt-1 text-xs text-red-500">{String(errors.dueDate.message)}</p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          Usada para gerar a fatura SaaS da plataforma nesta data.
        </p>
      )}
    </div>
  );

  if (mode === 'edit') {
    return (
      <form id={formId} noValidate onSubmit={onSubmitHandler} className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{initialData?.name}</span>
          {initialData?.slug ? (
            <>
              <span className="mx-2 text-slate-300">·</span>
              <span className="font-mono text-xs">{initialData.slug}</span>
            </>
          ) : null}
          {initialData?.subscription?.platformPlan ? (
            <div className="mt-1 text-xs text-slate-500">
              Plano SaaS: {initialData.subscription.platformPlan.name} — R${' '}
              {(initialData.subscription.platformPlan.priceCents / 100).toFixed(2)}/mês
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <span className={formLabelClass}>Nome da conta</span>
            <input
              {...register('name')}
              disabled
              className={`${formInputClass} cursor-not-allowed bg-slate-100 text-slate-600`}
            />
          </label>
          <label className="block">
            <span className={formLabelClass}>Slug</span>
            <input
              {...register('slug')}
              disabled
              className={`${formInputClass} cursor-not-allowed bg-slate-100 font-mono text-slate-600`}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block">
              <span className={formLabelClass}>Status da conta</span>
              <select {...register('status', { required: true })} className={formSelectClass}>
                <option value="active">Ativa</option>
                <option value="suspended">Suspensa</option>
              </select>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Contas suspensas não conseguem fazer login no app do revendedor.
            </p>
          </div>
          {dueDateField}
        </div>

        {initialData?.users && initialData.users.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-sm font-medium text-slate-900">Usuários da conta</h3>
            <ul className="space-y-2">
              {initialData.users.map((user, index) => (
                <li
                  key={`${user.email}-${index}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-900">{user.name}</span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="text-slate-600">{user.email}</span>
                  {user.role ? (
                    <span className="ml-2 text-xs text-slate-400">({user.role})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    );
  }

  return (
    <form id={formId} noValidate onSubmit={onSubmitHandler} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block">
            <span className={formLabelClass}>Nome da empresa/revenda</span>
            <input
              {...register('name', { required: 'Nome da conta é obrigatório' })}
              className={formInputClass}
              placeholder="Ex: Revenda Master"
            />
          </label>
          {errors.name ? (
            <p className="mt-1 text-xs text-red-500">{String(errors.name.message)}</p>
          ) : null}
        </div>
        <div>
          <label className="block">
            <span className={formLabelClass}>Slug (URL)</span>
            <input
              {...register('slug')}
              className={formInputClass}
              placeholder="ex: revenda-master"
            />
          </label>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-4 text-sm font-medium text-slate-900">Cobrança SaaS</h3>
        <div className="max-w-xs">{dueDateField}</div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-4 text-sm font-medium text-slate-900">Dados do proprietário</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block">
              <span className={formLabelClass}>Nome do usuário</span>
              <input
                {...register('ownerName', { required: 'Nome do proprietário é obrigatório' })}
                className={formInputClass}
                placeholder="Ex: João Silva"
              />
            </label>
            {errors.ownerName ? (
              <p className="mt-1 text-xs text-red-500">{String(errors.ownerName.message)}</p>
            ) : null}
          </div>
          <div>
            <label className="block">
              <span className={formLabelClass}>E-mail de acesso</span>
              <input
                type="email"
                {...register('ownerEmail', {
                  required: 'E-mail de acesso é obrigatório',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Informe um e-mail válido',
                  },
                })}
                className={formInputClass}
                placeholder="joao@email.com"
              />
            </label>
            {errors.ownerEmail ? (
              <p className="mt-1 text-xs text-red-500">{String(errors.ownerEmail.message)}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 max-w-md">
          <PasswordInput
            id="initialPassword"
            label="Senha inicial (opcional)"
            autoComplete="new-password"
            placeholder="Mudar123! (padrão se vazio)"
            registration={register('initialPassword', {
              validate: (value) =>
                !value ||
                String(value).length >= 6 ||
                'Senha deve ter no mínimo 6 caracteres',
            })}
            error={errors.initialPassword?.message as string | undefined}
          />
          <p className="mt-1 text-xs text-slate-500">
            O usuário será obrigado a trocar esta senha no primeiro login.
          </p>
        </div>
      </div>
    </form>
  );
};
