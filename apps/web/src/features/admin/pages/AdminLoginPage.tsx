import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@client-manager/shared';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { adminAuthApi } from '../api/admin.api';
import { showToast } from '../../../shared/utils/toast';
import { AuthShell } from '../../../shared/ui/auth/AuthShell';
import { AuthField } from '../../../shared/ui/auth/AuthField';
import { RememberMeCheckbox } from '../../../shared/ui/auth/RememberMeCheckbox';
import { loadRememberedLogin, saveRememberedLogin } from '../../../shared/utils/remember-login';

const remembered = loadRememberedLogin('admin');

export const AdminLoginPage: React.FC = () => {
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
      const { token } = await adminAuthApi.login(data);
      saveRememberedLogin('admin', data.email, rememberMe);

      localStorage.setItem('adminToken', token);
      navigate('/admin/dashboard');
    } catch {
      showToast.error('Credenciais inválidas');
    }
  };

  return (
    <AuthShell
      variant="admin"
      title="Login administrativo"
      subtitle="Somente operadores autorizados da plataforma."
      footer={
        <span>
          É revendedor?{' '}
          <Link to="/login" className="font-medium text-slate-700 hover:text-slate-900">
            Voltar ao login do tenant
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
          id="admin-email"
          label="E-mail"
          type="email"
          icon={Mail}
          autoComplete="username email"
          placeholder="admin@plataforma.com"
          error={errors.email?.message}
          registration={register('email')}
        />

        <AuthField
          id="admin-password"
          label="Senha"
          type="password"
          icon={Lock}
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          registration={register('password')}
        />

        <RememberMeCheckbox
          id="remember-admin"
          checked={rememberMe}
          onChange={setRememberMe}
        />

        <p className="text-xs text-slate-500 -mt-2">
          O navegador pode oferecer salvar a senha após o login (Chrome, Edge, etc.).
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Entrando…
            </>
          ) : (
            'Acessar painel'
          )}
        </button>
      </form>
    </AuthShell>
  );
};
