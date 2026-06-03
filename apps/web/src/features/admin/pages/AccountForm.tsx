import React from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Calendar, Link2, Mail, ToggleLeft, User } from 'lucide-react';
import { FormInput } from '../../../shared/ui/forms/FormInput';
import { FormPasswordInput } from '../../../shared/ui/forms/FormPasswordInput';
import { FormSelect } from '../../../shared/ui/forms/FormSelect';
import { showToast } from '../../../shared/utils/toast';

export interface AccountCreateInput {
  name: string;
  slug?: string;
  ownerName: string;
  ownerEmail: string;
  initialPassword?: string;
  dueDate: string;
}

export interface AccountEditInput {
  status: 'active' | 'inactive';
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
        status?: 'active' | 'inactive';
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
    <FormInput
      label="Próximo vencimento SaaS"
      type="date"
      prefixIcon={Calendar}
      error={errors.dueDate?.message ? String(errors.dueDate.message) : undefined}
      hint={
        errors.dueDate
          ? undefined
          : 'Usada para gerar a fatura SaaS da plataforma nesta data.'
      }
      {...register('dueDate', { required: 'Informe a data de vencimento' })}
    />
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
          <FormInput
            label="Nome da conta"
            prefixIcon={Building2}
            disabled
            className="cursor-not-allowed opacity-80"
            {...register('name')}
          />
          <FormInput
            label="Slug"
            prefixIcon={Link2}
            disabled
            className="cursor-not-allowed font-mono opacity-80"
            {...register('slug')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormSelect
            label="Status da conta"
            prefixIcon={ToggleLeft}
            hint="Contas suspensas não conseguem fazer login no app do revendedor."
            {...register('status', { required: true })}
          >
            <option value="active">Ativa</option>
            <option value="inactive">Desativada</option>
          </FormSelect>
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
        <FormInput
          label="Nome da empresa/revenda"
          prefixIcon={Building2}
          error={errors.name?.message ? String(errors.name.message) : undefined}
          placeholder="Ex: Revenda Master"
          {...register('name', { required: 'Nome da conta é obrigatório' })}
        />
        <FormInput
          label="Slug (URL)"
          prefixIcon={Link2}
          placeholder="ex: revenda-master"
          {...register('slug')}
        />
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-4 text-sm font-medium text-slate-900">Cobrança SaaS</h3>
        <div className="max-w-xs">{dueDateField}</div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <h3 className="mb-4 text-sm font-medium text-slate-900">Dados do proprietário</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormInput
            label="Nome do usuário"
            prefixIcon={User}
            error={errors.ownerName?.message ? String(errors.ownerName.message) : undefined}
            placeholder="Ex: João Silva"
            {...register('ownerName', { required: 'Nome do proprietário é obrigatório' })}
          />
          <FormInput
            label="E-mail de acesso"
            type="email"
            prefixIcon={Mail}
            error={errors.ownerEmail?.message ? String(errors.ownerEmail.message) : undefined}
            placeholder="joao@email.com"
            {...register('ownerEmail', {
              required: 'E-mail de acesso é obrigatório',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Informe um e-mail válido',
              },
            })}
          />
        </div>

        <div className="mt-4 max-w-md">
          <FormPasswordInput
            label="Senha inicial (opcional)"
            autoComplete="new-password"
            placeholder="Mudar123! (padrão se vazio)"
            hint="O usuário será obrigado a trocar esta senha no primeiro login."
            error={errors.initialPassword?.message as string | undefined}
            {...register('initialPassword', {
              validate: (value) =>
                !value ||
                String(value).length >= 6 ||
                'Senha deve ter no mínimo 6 caracteres',
            })}
          />
        </div>
      </div>
    </form>
  );
};
