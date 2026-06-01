import React from 'react';
import { useForm } from 'react-hook-form';
import { PasswordInput } from '../../../shared/ui/forms/PasswordInput';

export interface AdminProfileFormValues {
  email: string;
  password?: string;
  confirmPassword?: string;
}

interface AdminProfileFormProps {
  onSubmit: (data: { email: string; password?: string }) => Promise<void>;
  initialData?: { email?: string };
}

export const AdminProfileForm = React.forwardRef<HTMLFormElement, AdminProfileFormProps>(
  ({ onSubmit, initialData }, ref) => {
    const {
      register,
      handleSubmit,
      reset,
      watch,
      formState: { errors },
    } = useForm<AdminProfileFormValues>();
    const newPassword = watch('password');

    React.useEffect(() => {
      if (initialData) {
        reset({
          email: initialData.email ?? '',
          password: '',
          confirmPassword: '',
        });
      }
    }, [initialData, reset]);

    const onSubmitHandler = handleSubmit(async (data) => {
      const payload: { email: string; password?: string } = { email: data.email };
      if (data.password) {
        payload.password = data.password;
      }
      await onSubmit(payload);
      reset({
        email: data.email,
        password: '',
        confirmPassword: '',
      });
    });

    return (
      <form ref={ref} onSubmit={onSubmitHandler} className="space-y-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-900">Administrador da plataforma</span>
          {initialData?.email ? (
            <>
              <span className="mx-2 text-slate-300">·</span>
              {initialData.email}
            </>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">E-mail administrativo</label>
          <input
            type="email"
            {...register('email', { required: 'E-mail obrigatório' })}
            className="mt-1 block w-full max-w-md rounded-md border border-slate-300 p-2 shadow-sm"
          />
          {errors.email && (
            <span className="text-xs text-red-500">{errors.email.message}</span>
          )}
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h3 className="mb-4 text-sm font-medium text-slate-900">Alterar senha de acesso</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PasswordInput
              id="password"
              label="Nova senha (opcional)"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
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

AdminProfileForm.displayName = 'AdminProfileForm';
