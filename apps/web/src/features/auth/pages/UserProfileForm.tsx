import React from 'react';
import { useForm } from 'react-hook-form';
import { PasswordInput } from '../../../shared/ui/forms/PasswordInput';
import { formInputClass, formLabelClass } from '../../../shared/ui/forms/form-styles';

export interface UserProfileFormValues {
  name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

interface UserProfileFormProps {
  onSubmit: (data: { name: string; email: string; password?: string }) => Promise<void>;
  initialData?: {
    name?: string;
    email?: string;
    account?: { name?: string };
  };
}

export const UserProfileForm = React.forwardRef<HTMLFormElement, UserProfileFormProps>(
  ({ onSubmit, initialData }, ref) => {
    const {
      register,
      handleSubmit,
      reset,
      watch,
      formState: { errors },
    } = useForm<UserProfileFormValues>();
    const newPassword = watch('password');

    React.useEffect(() => {
      if (initialData) {
        reset({
          name: initialData.name ?? '',
          email: initialData.email ?? '',
          password: '',
          confirmPassword: '',
        });
      }
    }, [initialData, reset]);

    const onSubmitHandler = handleSubmit(async (data) => {
      const payload: { name: string; email: string; password?: string } = {
        name: data.name,
        email: data.email,
      };
      if (data.password) {
        payload.password = data.password;
      }
      await onSubmit(payload);
      reset({
        name: data.name,
        email: data.email,
        password: '',
        confirmPassword: '',
      });
    });

    return (
      <form ref={ref} onSubmit={onSubmitHandler} className="space-y-6">
        {initialData?.account?.name && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-900">{initialData.name}</span>
            <span className="mx-2 text-slate-300">·</span>
            {initialData.account.name}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block">
              <span className={formLabelClass}>Nome</span>
              <input
                {...register('name', { required: 'Nome obrigatório' })}
                className={formInputClass}
              />
            </label>
            {errors.name && (
              <span className="text-xs text-red-500">{errors.name.message}</span>
            )}
          </div>
          <div>
            <label className="block">
              <span className={formLabelClass}>E-mail</span>
              <input
                type="email"
                {...register('email', { required: 'E-mail obrigatório' })}
                className={formInputClass}
              />
            </label>
            {errors.email && (
              <span className="text-xs text-red-500">{errors.email.message}</span>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="mb-4 text-sm font-medium text-slate-900">Alterar senha</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PasswordInput
              id="password"
              label="Nova senha (opcional)"
              autoComplete="new-password"
              placeholder="Deixe em branco para manter a atual"
              registration={register('password', { minLength: { value: 6, message: 'Mínimo 6 caracteres' } })}
              error={errors.password?.message}
            />
            <PasswordInput
              id="confirmPassword"
              label="Confirmar nova senha"
              autoComplete="new-password"
              registration={register('confirmPassword', {
                validate: (val) =>
                  !newPassword || val === newPassword || 'As senhas não coincidem',
              })}
              error={errors.confirmPassword?.message}
            />
          </div>
        </div>
      </form>
    );
  },
);

UserProfileForm.displayName = 'UserProfileForm';
