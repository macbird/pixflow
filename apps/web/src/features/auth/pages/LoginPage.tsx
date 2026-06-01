import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@client-manager/shared';
import { authApi } from '../api/auth.api';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { AuthShell } from '../../../shared/ui/auth/AuthShell';
import { AuthField } from '../../../shared/ui/auth/AuthField';
import { RememberMeCheckbox } from '../../../shared/ui/auth/RememberMeCheckbox';
import { showToast } from '../../../shared/utils/toast';
import { loadRememberedLogin, saveRememberedLogin } from '../../../shared/utils/remember-login';

const remembered = loadRememberedLogin('tenant');

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = React.useState(remembered.remember);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      email: remembered.email,
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const response = await authApi.login(data.email, data.password);
      saveRememberedLogin('tenant', data.email, rememberMe);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      if (response.user.passwordResetRequired) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast.error(error.response?.data?.message || 'Credenciais inválidas');
    }
  };

  return (
    <AuthShell
      variant="tenant"
      title="Bem-vindo de volta"
      subtitle="Entre com o e-mail e a senha da sua conta de revenda."
      footer={
        <span>
          Acesso da plataforma?{' '}
          <Link to="/admin/login" className="font-medium text-indigo-600 hover:text-indigo-700">
            Painel admin
          </Link>
        </span>
      }
    >
      <form
        className="space-y-5"
        method="post"
        autoComplete="on"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <AuthField
          id="email"
          label="E-mail"
          type="email"
          icon={Mail}
          autoComplete="username email"
          placeholder="voce@empresa.com"
          error={errors.email?.message}
          registration={register('email')}
        />

        <AuthField
          id="password"
          label="Senha"
          type="password"
          icon={Lock}
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          registration={register('password')}
        />

        <RememberMeCheckbox
          id="remember-tenant"
          checked={rememberMe}
          onChange={setRememberMe}
        />

        <p className="text-xs text-slate-500 -mt-2">
          O navegador pode oferecer salvar a senha após o login (Chrome, Edge, etc.).
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Entrando…
            </>
          ) : (
            'Entrar'
          )}
        </button>
      </form>
    </AuthShell>
  );
};
